/**
 * Cook County, IL — Assessor open data via Socrata (CORS: *)
 * Three datasets joined by PIN:
 *   3723-97qp  Parcel Addresses  (address search + owner)
 *   uzyt-m557  Assessed Values   (land, building, total, neighborhood, class)
 *   x54s-btds  Improvement Chars (building sqft, year built)
 *
 * Analysis metric: assessed value per building sqft ($/sqft).
 * IL Cook County residential properties are assessed at ~10% of market value;
 * comparing $/sqft across comps reveals unequal assessment under IL Property Tax Code.
 */

const BASE = 'https://datacatalog.cookcountyil.gov/resource';
const ADDR_DS   = '3723-97qp'; // Parcel Addresses
const ASSESS_DS = 'uzyt-m557'; // Assessed Values
const IMPR_DS   = 'x54s-btds'; // Improvement Characteristics

// Use the most recent certified assessment year available
const YEAR = '2024';

const CLASS_LABELS = {
  '200': 'Single Family (Residential)',
  '202': 'Single Family (Residential)',
  '203': 'Two-Story Single Family',
  '204': 'Old Style Single Family',
  '205': 'Bungalow',
  '206': 'Modern Single Family',
  '207': 'Single Family (Residential)',
  '208': 'Single Family (Residential)',
  '209': 'Single Family (Residential)',
  '210': 'Old Style Row House',
  '211': 'Single Family (Residential)',
  '212': 'Single Family (Residential)',
  '218': 'Single Family (Residential)',
  '234': 'Split Level',
  '278': 'Single Family (Residential)',
  '295': 'Condominium',
};

async function socFetch(dataset, params) {
  const url = `${BASE}/${dataset}.json?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Cook County API error ${res.status}`);
  return res.json();
}

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function normalizeCookParcel(addr, assess, impr) {
  const pin = addr.pin;
  const totalAssessed = parseNum(assess?.certified_tot ?? assess?.mailed_tot ?? 0);
  const landAssessed  = parseNum(assess?.certified_land ?? assess?.mailed_land ?? 0);
  const bldgAssessed  = parseNum(assess?.certified_bldg ?? assess?.mailed_bldg ?? 0);
  const sqft          = parseNum(impr?.char_bldg_sf ?? 0);
  const cls           = assess?.class || impr?.class || '';

  return {
    printKey:               pin,
    address:                (addr.prop_address_full || '').trim(),
    ownerName:              addr.owner_address_name || addr.mail_address_name || '',
    municipality:           addr.prop_address_city_name || 'Cook County',
    county:                 'Cook',
    state:                  'IL',
    propertyClass:          cls,
    propertyClassDesc:      CLASS_LABELS[cls] || `Class ${cls}`,
    fullMarketValue:        totalAssessed * 10, // rough: IL residential assessed at ~10% of FMV
    appraisedValue:         totalAssessed,
    assessmentTotal:        totalAssessed,
    assessmentLand:         landAssessed,
    assessmentImprovements: bldgAssessed,
    buildingSqft:           sqft,
    yearBuilt:              impr?.char_yrblt ? String(Math.round(parseNum(impr.char_yrblt))) : '',
    neighborhoodCode:       assess?.nbhd || '',
    schoolDistrict:         '',
    rollYear:               assess?.year || YEAR,
    swis:                   null,
    equalizationRate:       1.0,
    pricePerSqft:           sqft > 0 ? totalAssessed / sqft : null,
    hasHomestead:           false,
    exemptions:             '',
    countyTaxable:          totalAssessed,
    schoolTaxable:          totalAssessed,
  };
}

export async function cookSearchByAddress({ streetAddress }) {
  const q = streetAddress.toUpperCase().replace(/'/g, "''");

  // Step 1: address search (no year filter — addresses dataset is cumulative)
  const addrs = await socFetch(ADDR_DS, {
    '$where': `UPPER(prop_address_full) LIKE '%${q}%'`,
    '$select': 'pin,prop_address_full,prop_address_city_name,owner_address_name,year',
    '$order':  'year DESC, prop_address_full ASC',
    '$limit':  '40',
  });

  if (!addrs.length) return [];

  // Dedupe by pin — keep most recent year
  const pinMap = new Map();
  for (const a of addrs) {
    if (!pinMap.has(a.pin) || a.year > pinMap.get(a.pin).year) pinMap.set(a.pin, a);
  }
  const uniqueAddrs = [...pinMap.values()].slice(0, 15);
  const pins = uniqueAddrs.map(a => `'${a.pin}'`).join(',');

  // Step 2: fetch assessments + improvements in parallel
  const [assessments, improvements] = await Promise.all([
    socFetch(ASSESS_DS, {
      '$where': `pin IN (${pins}) AND year='${YEAR}'`,
      '$limit': '15',
    }).catch(() => []),
    socFetch(IMPR_DS, {
      '$where': `pin IN (${pins}) AND year='${YEAR}'`,
      '$limit': '15',
    }).catch(() => []),
  ]);

  const assessMap = Object.fromEntries(assessments.map(a => [a.pin, a]));
  const imprMap   = Object.fromEntries(improvements.map(i => [i.pin, i]));

  return uniqueAddrs
    .filter(a => assessMap[a.pin]) // only return parcels with assessment data
    .map(a => normalizeCookParcel(a, assessMap[a.pin], imprMap[a.pin]));
}

export async function cookGetComparables({ pin, nbhd, cls, buildingSqft, limit = 30 }) {
  const sqft = parseFloat(buildingSqft) || 0;

  // Get improvement characteristics for same neighborhood class + sqft range
  // Improvements dataset has class but not nbhd; use assessments for nbhd + class pins,
  // then batch-fetch improvements for those pins.
  const lo = sqft > 0 ? Math.round(sqft * 0.7) : 0;
  const hi = sqft > 0 ? Math.round(sqft * 1.3) : 99999;

  const imprWhere = sqft > 0
    ? `class='${cls}' AND char_bldg_sf >= '${lo}' AND char_bldg_sf <= '${hi}' AND year='${YEAR}' AND pin != '${pin}'`
    : `class='${cls}' AND year='${YEAR}' AND pin != '${pin}'`;

  // Query improvements for same class + sqft range
  const imprRows = await socFetch(IMPR_DS, {
    '$where': imprWhere,
    '$limit': String(limit * 4),
  });

  if (!imprRows.length) return [];

  // Filter to same neighborhood by joining assessments
  const compPins = imprRows.map(i => `'${i.pin}'`).join(',');
  const [assessRows, addrRows] = await Promise.all([
    socFetch(ASSESS_DS, {
      '$where': `pin IN (${compPins}) AND nbhd='${nbhd}' AND year='${YEAR}'`,
      '$limit': String(limit * 2),
    }),
    socFetch(ADDR_DS, {
      '$where': `pin IN (${compPins})`,
      '$select': 'pin,prop_address_full,prop_address_city_name,owner_address_name,year',
      '$order': 'year DESC',
      '$limit': String(limit * 4),
    }),
  ]);

  if (!assessRows.length) return [];

  const assessMap = Object.fromEntries(assessRows.map(a => [a.pin, a]));
  const imprMap   = Object.fromEntries(imprRows.map(i => [i.pin, i]));

  // Dedupe addresses by pin (most recent year)
  const addrMap = new Map();
  for (const a of addrRows) {
    if (!addrMap.has(a.pin) || a.year > addrMap.get(a.pin).year) addrMap.set(a.pin, a);
  }

  return assessRows
    .slice(0, limit)
    .map(assess => {
      const addr = addrMap.get(assess.pin) || { pin: assess.pin, prop_address_full: `PIN ${assess.pin}` };
      return normalizeCookParcel(addr, assess, imprMap[assess.pin]);
    })
    .filter(p => p.printKey !== pin);
}
