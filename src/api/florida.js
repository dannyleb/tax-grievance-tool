/**
 * Florida Statewide Cadastral — ArcGIS FeatureServer (CORS: * via ArcGIS Online)
 * Service: services9.arcgis.com/Gh9awoU677aKree0/…/Florida_Statewide_Cadastral/FeatureServer/0
 *
 * Source: Florida Department of Revenue / FloridaGIO
 * Coverage: All 67 counties
 * Fields: PARCEL_ID, PHY_ADDR1, PHY_CITY, CO_NO, JV (just/market value), AV_SD (assessed),
 *         TV_SD (taxable), DOR_UC (property use code), TOT_LVG_AREA (living area sqft), OWNER1
 *
 * Analysis metric: JV / TOT_LVG_AREA ($/living sqft).
 * FL assesses at 100% of market value (just value); Save Our Homes caps AV for primary residences.
 * VAB petition challenges the just value — comparing $/sqft across comps reveals unequal assessment.
 */

const FL_URL = 'https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query';
const OUT_FIELDS = 'PARCEL_ID,PHY_ADDR1,PHY_CITY,CO_NO,JV,AV_SD,TV_SD,DOR_UC,TOT_LVG_AREA,OWNER1';

const DOR_LABELS = {
  0: 'Vacant Residential',
  1: 'Single Family',
  2: 'Mobile Home',
  3: 'Multi-Family (2–9 units)',
  4: 'Condominium',
  5: 'Cooperative',
  6: 'Retirement Home',
  7: 'Miscellaneous Residential',
  8: 'Multi-Family (10+ units)',
};

async function flFetch(params) {
  const url = `${FL_URL}?${new URLSearchParams({
    f: 'json',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    ...params,
  })}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Florida API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Florida API error');
  return (data.features || []).map(f => f.attributes);
}

export function normalizeFlParcel(raw) {
  const justVal    = parseFloat(raw.JV)            || 0;
  const assessedVal = parseFloat(raw.AV_SD)         || 0;
  const taxableVal  = parseFloat(raw.TV_SD)         || 0;
  const sqft        = parseFloat(raw.TOT_LVG_AREA)  || 0;
  const dorUc       = parseInt(raw.DOR_UC, 10)      || 0;

  return {
    printKey:               String(raw.PARCEL_ID || ''),
    address:                (raw.PHY_ADDR1 || '').trim(),
    ownerName:              raw.OWNER1 || '',
    municipality:           raw.PHY_CITY || 'Florida',
    county:                 String(raw.CO_NO || ''),
    state:                  'FL',
    propertyClass:          String(dorUc),
    propertyClassDesc:      DOR_LABELS[dorUc] || `DOR Use ${dorUc}`,
    fullMarketValue:        justVal,
    appraisedValue:         justVal,
    assessmentTotal:        justVal,       // just value is what VAB petitions contest
    assessmentLand:         0,
    assessmentImprovements: 0,
    buildingSqft:           sqft,
    yearBuilt:              '',
    neighborhoodCode:       raw.PHY_CITY || '',  // city as neighborhood proxy
    schoolDistrict:         '',
    rollYear:               '2025',
    swis:                   null,
    equalizationRate:       1.0,
    pricePerSqft:           sqft > 0 ? justVal / sqft : null,
    hasHomestead:           false,         // SOH status not in this layer
    exemptions:             '',
    countyTaxable:          taxableVal,
    schoolTaxable:          taxableVal,
  };
}

export async function flSearchByAddress({ streetAddress }) {
  const q = streetAddress.toUpperCase().replace(/'/g, "''");
  return flFetch({
    where: `UPPER(PHY_ADDR1) LIKE '%${q}%'`,
    resultRecordCount: '25',
    orderByFields: 'PHY_ADDR1 ASC',
  });
}

export async function flGetComparables({ parcelId, dorUc, city, buildingSqft, limit = 30 }) {
  const sqft = parseFloat(buildingSqft) || 0;
  let where = `DOR_UC = ${dorUc} AND UPPER(PHY_CITY) = UPPER('${city.replace(/'/g, "''")}') AND PARCEL_ID <> '${parcelId}'`;

  if (sqft > 0) {
    const lo = Math.round(sqft * 0.65);
    const hi = Math.round(sqft * 1.35);
    where += ` AND TOT_LVG_AREA >= ${lo} AND TOT_LVG_AREA <= ${hi}`;
  }

  // Exclude records with no living area for $/sqft analysis
  where += ' AND TOT_LVG_AREA > 0';

  return flFetch({
    where,
    resultRecordCount: String(limit),
    orderByFields: 'PHY_ADDR1 ASC',
  });
}
