/**
 * King County, WA — ArcGIS MapServer (CORS enabled for dannyleb.github.io)
 * Service: gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2
 *
 * Fields available: PIN, ADDR_FULL, CTYNAME, APPRLNDVAL, APPR_IMPR, LOTSQFT, PREUSE_CODE, PREUSE_DESC
 * Note: Building sqft is not in this layer. We use LOTSQFT as the normalization metric.
 * Analysis metric: total appraised value per lot sqft ($/lot sqft).
 * WA assesses at 100% of market value; comparing $/lot sqft reveals unequal appraisal.
 */

const KING_URL = 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2/query';
const OUT_FIELDS = 'PIN,ADDR_FULL,CTYNAME,APPRLNDVAL,APPR_IMPR,LOTSQFT,PREUSE_CODE,PREUSE_DESC';

const PREUSE_LABELS = {
  1:  'Vacant (Single Family)',
  2:  'Single Family (Res)',
  3:  'Duplex',
  4:  'Triplex',
  5:  'Quadruplex',
  6:  '5–9 Units',
  7:  '10–19 Units',
  8:  '20–49 Units',
  9:  '50+ Units',
  10: 'Condominium',
  11: 'Mobile Home',
};

async function arcgisFetch(params) {
  const url = `${KING_URL}?${new URLSearchParams({ f: 'json', outFields: OUT_FIELDS, returnGeometry: 'false', ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`King County API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'King County API error');
  return (data.features || []).map(f => f.attributes);
}

export function normalizeKingParcel(raw) {
  const landVal  = parseFloat(raw.APPRLNDVAL) || 0;
  const imprVal  = parseFloat(raw.APPR_IMPR)  || 0;
  const totalVal = landVal + imprVal;
  const lotSqft  = parseFloat(raw.LOTSQFT) || 0;
  const preuse   = parseInt(raw.PREUSE_CODE, 10) || 0;

  return {
    printKey:               String(raw.PIN || ''),
    address:                (raw.ADDR_FULL || '').trim(),
    ownerName:              '',
    municipality:           raw.CTYNAME || 'King County',
    county:                 'King',
    state:                  'WA',
    propertyClass:          String(preuse),
    propertyClassDesc:      PREUSE_LABELS[preuse] || `Property Use ${preuse}`,
    fullMarketValue:        totalVal,
    appraisedValue:         totalVal,
    assessmentTotal:        totalVal,
    assessmentLand:         landVal,
    assessmentImprovements: imprVal,
    buildingSqft:           lotSqft,       // lot sqft used as proxy; labeled as "Lot SqFt" in UI
    yearBuilt:              '',
    neighborhoodCode:       raw.CTYNAME || '', // city as neighborhood proxy
    schoolDistrict:         '',
    rollYear:               '2025',
    swis:                   null,
    equalizationRate:       1.0,
    pricePerSqft:           lotSqft > 0 ? totalVal / lotSqft : null,
    hasHomestead:           false,
    exemptions:             '',
    countyTaxable:          totalVal,
    schoolTaxable:          totalVal,
  };
}

export async function kingSearchByAddress({ streetAddress }) {
  const q = streetAddress.toUpperCase().replace(/'/g, "''");
  return arcgisFetch({
    where: `UPPER(ADDR_FULL) LIKE '%${q}%'`,
    resultRecordCount: '25',
    orderByFields: 'ADDR_FULL ASC',
  });
}

export async function kingGetComparables({ pin, preuseCode, city, lotSqft, limit = 30 }) {
  const sqft = parseFloat(lotSqft) || 0;
  let where = `PREUSE_CODE = ${preuseCode} AND CTYNAME = '${city}' AND PIN <> '${pin}'`;

  if (sqft > 0) {
    const lo = Math.round(sqft * 0.6);
    const hi = Math.round(sqft * 1.4);
    where += ` AND LOTSQFT >= ${lo} AND LOTSQFT <= ${hi}`;
  }

  return arcgisFetch({
    where,
    resultRecordCount: String(limit),
    orderByFields: 'ADDR_FULL ASC',
  });
}
