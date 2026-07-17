/**
 * Bexar County Appraisal District (BCAD) — ArcGIS REST API integration.
 * Endpoint: maps.bexar.org/arcgis/rest/services/Parcels/MapServer/0
 * CORS: allowed for dannyleb.github.io (Vary: Origin, Access-Control-Allow-Origin confirmed).
 */

const BCAD_URL = 'https://maps.bexar.org/arcgis/rest/services/Parcels/MapServer/0/query';

const OUT_FIELDS = 'PropID,Situs,Owner,LandVal,ImprVal,TotVal,GBA,YrBlt,PropUse,Nbhd,Exempts';

// BCAD PropUse codes (internal BCAD numbering)
// BCAD uses internal numeric PropUse codes (not standard SPTB letter codes).
// Labels derived from observed data patterns; comparables are matched by PropUse
// within the same neighborhood so exact label accuracy is secondary.
const PROP_USE_LABELS = {
  '1':   'Single Family Residential',
  '2':   'Single Family Residential',
  '11':  'Single Family Residential',
  '12':  'Single Family Residential',
  '98':  'Other Real Property',
  '99':  'Personal Property',
  '200': 'Multi-Family Residential',
  '224': 'Multi-Family Residential',
  '400': 'Commercial Real Property',
  '401': 'Commercial Office',
  '402': 'Commercial Retail',
  '403': 'Industrial',
  '404': 'Commercial Warehouse',
  '480': 'Commercial Mixed Use',
};

async function arcgisFetch(params) {
  const url = `${BCAD_URL}?${new URLSearchParams({
    f: 'json',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    ...params,
  })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BCAD API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'BCAD API error');
  return (data.features || []).map(f => f.attributes);
}

function parseBcadNum(v) {
  if (v === null || v === undefined || v === 'NULL') return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function normalizeBexarParcel(raw) {
  const sqft = parseBcadNum(raw.GBA);
  const totalVal = parseBcadNum(raw.TotVal);
  const landVal = parseBcadNum(raw.LandVal);
  const imprvVal = parseBcadNum(raw.ImprVal);
  const propUse = String(raw.PropUse ?? '');
  const exempts = raw.Exempts || '';

  return {
    printKey:               String(raw.PropID),
    address:                (raw.Situs || '').trim(),
    ownerName:              raw.Owner || '',
    municipality:           'San Antonio',
    county:                 'Bexar',
    state:                  'TX',
    propertyClass:          propUse,
    propertyClassDesc:      PROP_USE_LABELS[propUse] || `Property Use ${propUse}`,
    fullMarketValue:        totalVal,
    appraisedValue:         totalVal,
    assessmentTotal:        totalVal,
    assessmentLand:         landVal,
    assessmentImprovements: imprvVal,
    buildingSqft:           sqft,
    yearBuilt:              raw.YrBlt && raw.YrBlt !== 'NULL' ? raw.YrBlt : '',
    neighborhoodCode:       raw.Nbhd || '',
    schoolDistrict:         '',
    rollYear:               '2026',
    swis:                   null,
    equalizationRate:       1.0,
    pricePerSqft:           sqft > 0 ? totalVal / sqft : null,
    hasHomestead:           exempts.includes('HS'),
    exemptions:             exempts,
    countyTaxable:          totalVal,
    schoolTaxable:          totalVal,
  };
}

export async function bexarSearchByAddress({ streetAddress }) {
  const q = streetAddress.toUpperCase().replace(/'/g, "''");
  return arcgisFetch({
    where: `UPPER(Situs) LIKE '%${q}%'`,
    resultRecordCount: '25',
    orderByFields: 'Situs ASC',
  });
}

export async function bexarGetComparables({ propId, propUse, nbhd, buildingSqft, limit = 30 }) {
  const sqft = parseFloat(buildingSqft) || 0;
  // Fetch same neighborhood + property type; filter sqft client-side
  // (GBA is stored as a string field so range comparisons in SQL are unreliable)
  const rows = await arcgisFetch({
    where: `Nbhd = '${nbhd}' AND PropUse = ${propUse} AND PropID <> ${propId}`,
    resultRecordCount: String(Math.min(limit * 4, 200)),
  });

  if (sqft > 0) {
    const lo = sqft * 0.7;
    const hi = sqft * 1.3;
    return rows
      .filter(r => {
        const s = parseBcadNum(r.GBA);
        return s > 0 && s >= lo && s <= hi;
      })
      .slice(0, limit);
  }

  return rows.slice(0, limit);
}
