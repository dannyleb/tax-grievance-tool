/**
 * Philadelphia, PA — OPA Properties Public (ArcGIS Online, CORS: *)
 * Service: services.arcgis.com/fLeGjb7u4uXqeF9q/ArcGIS/rest/services/OPA_Properties_Public/FeatureServer/0
 *
 * Source: Philadelphia Office of Property Assessment (OPA), updated nightly
 * Coverage: ~609,000 Philadelphia City/County properties
 * Fields: parcel_number, location, owner_1, market_value, taxable_land, taxable_building,
 *         total_livable_area, building_code_description, category_code_description, year_built, zip_code
 *
 * Analysis metric: market_value / total_livable_area ($/livable sqft).
 * PA (Philadelphia) assesses at 100% of market value; comparing $/sqft across comps reveals
 * unequal assessment under PA Consolidated Statutes Title 53 §8854.
 */

const PHILLY_URL = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/ArcGIS/rest/services/OPA_Properties_Public/FeatureServer/0/query';
const OUT_FIELDS = 'parcel_number,location,owner_1,market_value,taxable_land,taxable_building,total_livable_area,building_code_description,category_code_description,year_built,zip_code';

async function phillyFetch(params) {
  const url = `${PHILLY_URL}?${new URLSearchParams({
    f: 'json',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    ...params,
  })}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Philadelphia OPA API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Philadelphia OPA API error');
  return (data.features || []).map(f => f.attributes);
}

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function normalizePhillyParcel(raw) {
  const marketVal  = parseNum(raw.market_value);
  const landVal    = parseNum(raw.taxable_land);
  const bldgVal    = parseNum(raw.taxable_building);
  const sqft       = parseNum(raw.total_livable_area);
  const cls        = (raw.building_code_description || '').trim();
  const category   = (raw.category_code_description || '').trim();

  return {
    printKey:               String(raw.parcel_number || ''),
    address:                (raw.location || '').trim(),
    ownerName:              raw.owner_1 || '',
    municipality:           'Philadelphia',
    county:                 'Philadelphia',
    state:                  'PA',
    propertyClass:          cls || category,
    propertyClassDesc:      cls || category,
    fullMarketValue:        marketVal,
    appraisedValue:         marketVal,
    assessmentTotal:        marketVal,
    assessmentLand:         landVal,
    assessmentImprovements: bldgVal,
    buildingSqft:           sqft,
    yearBuilt:              raw.year_built ? String(Math.round(parseNum(raw.year_built))) : '',
    neighborhoodCode:       raw.zip_code || '',  // zip as neighborhood proxy
    schoolDistrict:         '',
    rollYear:               '2025',
    swis:                   null,
    equalizationRate:       1.0,
    pricePerSqft:           sqft > 0 ? marketVal / sqft : null,
    hasHomestead:           false,
    exemptions:             '',
    countyTaxable:          marketVal,
    schoolTaxable:          marketVal,
  };
}

export async function phillySearchByAddress({ streetAddress }) {
  const q = streetAddress.toUpperCase().replace(/'/g, "''");
  const raw = await phillyFetch({
    where: `UPPER(location) LIKE '%${q}%'`,
    resultRecordCount: '25',
    orderByFields: 'location ASC',
  });
  return raw.map(normalizePhillyParcel);
}

export async function phillyGetComparables({ parcelNumber, buildingCode, zip, buildingSqft, limit = 30 }) {
  const sqft = parseFloat(buildingSqft) || 0;
  const safeCode = (buildingCode || '').replace(/'/g, "''");
  const safeZip  = (zip || '').replace(/'/g, "''");

  let where = `building_code_description = '${safeCode}' AND zip_code = '${safeZip}' AND parcel_number <> '${parcelNumber}'`;

  if (sqft > 0) {
    const lo = Math.round(sqft * 0.65);
    const hi = Math.round(sqft * 1.35);
    where += ` AND total_livable_area >= ${lo} AND total_livable_area <= ${hi}`;
  }

  where += ' AND market_value > 0 AND total_livable_area > 0';

  const raw = await phillyFetch({
    where,
    resultRecordCount: String(limit),
    orderByFields: 'location ASC',
  });
  return raw.map(normalizePhillyParcel);
}
