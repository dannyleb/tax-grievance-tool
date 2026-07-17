/**
 * Texas CAD API integration.
 * Supported: Collin County (data.texas.gov Socrata) | Bexar County (BCAD ArcGIS REST).
 */
import { normalizeBexarParcel, bexarSearchByAddress, bexarGetComparables } from './bexar';

const SOCRATA_BASE = 'https://data.texas.gov/resource';

// Collin CAD dataset IDs on data.texas.gov
const COLLIN_DATASETS = {
  '2026': 'nne4-8riu', // 2026 preliminary (updated daily)
  '2025': 'vffy-snc6', // 2025 certified
};

const PROP_CATEGORY_LABELS = {
  A: 'Single Family Residential',
  B: 'Multi-Family Residential',
  C: 'Vacant Land',
  D: 'Farm & Ranch',
  E: 'Rural Real Estate',
  F: 'Commercial Real Estate',
  G: 'Oil, Gas & Minerals',
  J: 'Utilities',
  L: 'Commercial Personal Property',
  O: 'Residential Inventory',
  X: 'Exempt Property',
};

function socrataFetch(url) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  }).then(r => {
    if (!r.ok) throw new Error(`Socrata API error ${r.status}`);
    return r.json();
  });
}

function getDataset(county) {
  if (county === 'Collin') return COLLIN_DATASETS['2026'];
  throw new Error('UNSUPPORTED_COUNTY');
}

export function normalizeTxParcel(raw, county) {
  if (county === 'Bexar') return normalizeBexarParcel(raw);
  const sqft = parseFloat(raw.imprvmainarea) || 0;
  const marketValue = parseFloat(raw.currvalmarket) || 0;
  const appraisedValue = parseFloat(raw.currvalappraised) || marketValue;
  const landValue = parseFloat(raw.currvalland) || 0;
  const imprvValue = parseFloat(raw.currvalimprv) || 0;

  const streetAddr = [
    raw.situsbldgnum,
    raw.situsstreetname,
    raw.situsstreetsuffix,
  ].filter(Boolean).join(' ');

  return {
    printKey: raw.propid,
    address: (raw.situsconcat || streetAddr).trim(),
    ownerName: raw.ownername || '',
    municipality: raw.situscity || county + ' County',
    county: county,
    state: 'TX',
    propertyClass: raw.propcategorycode || '',
    propertyClassDesc: PROP_CATEGORY_LABELS[raw.propcategorycode] || raw.propsubtype || '',
    fullMarketValue: marketValue,
    appraisedValue,
    assessmentTotal: appraisedValue,
    assessmentLand: landValue,
    assessmentImprovements: imprvValue,
    buildingSqft: sqft,
    yearBuilt: raw.imprvyearbuilt || '',
    neighborhoodCode: raw.nbhdcode || '',
    schoolDistrict: raw.entityschoolcode || '',
    schoolDistrictName: raw.entityschoolcode || '',
    rollYear: raw.currvalyear || '2026',
    swis: null,
    equalizationRate: 1.0, // TX appraises at 100% market value
    pricePerSqft: sqft > 0 ? marketValue / sqft : null,
    hasHomestead: raw.exempthmstdflag === 'true' || (raw.exemptcodes || '').includes('HS'),
    exemptions: raw.exemptcodes || '',
    // For display compatibility
    countyTaxable: appraisedValue,
    schoolTaxable: appraisedValue,
  };
}

export async function txSearchByAddress({ county, streetAddress }) {
  if (county === 'Bexar') return bexarSearchByAddress({ streetAddress });
  const dataset = getDataset(county);
  // Escape single quotes for SoQL
  const q = streetAddress.toUpperCase().replace(/'/g, "''");
  const params = new URLSearchParams({
    '$where': `situsconcatshort like '%${q}%'`,
    '$limit': '25',
    '$order': 'situsconcat ASC',
  });
  const data = await socrataFetch(`${SOCRATA_BASE}/${dataset}.json?${params}`);
  return data;
}

export async function txGetComparables({ county, propid, propcategorycode, nbhdcode, buildingSqft, limit = 30 }) {
  if (county === 'Bexar') {
    return bexarGetComparables({
      propId: propid,
      propUse: propcategorycode,
      nbhd: nbhdcode,
      buildingSqft,
      limit,
    });
  }
  const dataset = getDataset(county);
  const sqft = parseFloat(buildingSqft) || 0;

  let where = `nbhdcode='${nbhdcode}' AND propcategorycode='${propcategorycode}'`;
  if (sqft > 0) {
    const lo = Math.round(sqft * 0.7);
    const hi = Math.round(sqft * 1.3);
    where += ` AND imprvmainarea >= ${lo} AND imprvmainarea <= ${hi}`;
  }
  where += ` AND propid != '${propid}'`;

  const params = new URLSearchParams({
    '$where': where,
    '$limit': limit.toString(),
    '$order': 'situsconcat ASC',
  });
  const data = await socrataFetch(`${SOCRATA_BASE}/${dataset}.json?${params}`);
  return data;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Texas equal-and-uniform analysis: compare appraised $/sqft.
 * Legal basis: TX Property Tax Code §41.43 — unequal appraisal if subject's
 * appraised value per sqft exceeds the median of comparable properties.
 */
export function analyzeTxAppraisal(subject, comps) {
  const subjectPpsf = subject.pricePerSqft;
  const validComps = comps.filter(c => c.pricePerSqft != null && c.pricePerSqft > 0);

  if (!subjectPpsf || validComps.length < 3) {
    return {
      subjectRatio: subjectPpsf,
      medianCompRatio: null,
      overassessmentPct: 0,
      hasCase: false,
      borderline: false,
      compRatios: comps.map(c => ({ ...c, assessmentRatio: c.pricePerSqft || 0 })),
      underassessedComps: [],
      potentialSavings: 0,
      metric: '$/sqft',
      insufficientData: true,
    };
  }

  const medianPpsf = median(validComps.map(c => c.pricePerSqft));
  const overPct = ((subjectPpsf - medianPpsf) / medianPpsf) * 100;

  // TX effective tax rate ~2.3% statewide average; savings = excess value × rate
  const TX_EFFECTIVE_RATE = 0.023;
  const potentialSavings = overPct > 5
    ? (subjectPpsf - medianPpsf) * subject.buildingSqft * TX_EFFECTIVE_RATE
    : 0;

  const compRatios = comps.map(c => ({
    ...c,
    assessmentRatio: c.pricePerSqft || 0,
  }));

  return {
    subjectRatio: subjectPpsf,
    medianCompRatio: medianPpsf,
    overassessmentPct: overPct,
    hasCase: overPct > 5,
    borderline: overPct > 0 && overPct <= 5,
    compRatios,
    underassessedComps: validComps.filter(c => c.pricePerSqft < subjectPpsf * 0.95),
    potentialSavings,
    metric: '$/sqft',
  };
}
