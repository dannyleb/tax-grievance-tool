// ORPTS Socrata API client
// Dataset: Property Assessment Data from Local Assessment Rolls
// Endpoint: https://data.ny.gov/resource/7vem-aaz7.json
// Docs: https://dev.socrata.com/foundry/data.ny.gov/7vem-aaz7

const BASE_URL = 'https://data.ny.gov/resource/7vem-aaz7.json';
const TAX_RATES_URL = 'https://data.ny.gov/resource/iq85-sdzs.json';

// In-memory cache keyed by swis_code so we don't re-fetch on every comp
const taxRatesCache = {};
// Register a free app token at data.ny.gov for higher rate limits (1000 req/hr vs throttled)
const APP_TOKEN = import.meta.env.VITE_SOCRATA_APP_TOKEN || '';

function buildHeaders() {
  const headers = { 'Accept': 'application/json' };
  if (APP_TOKEN) headers['X-App-Token'] = APP_TOKEN;
  return headers;
}

function buildUrl(params) {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Search for a property by address within a municipality.
 * Searches by municipality_name rather than swis_code so results come back
 * regardless of which SWIS sub-jurisdiction (village vs TOV) the parcel is in.
 */
export async function searchByAddress({ swis, municipalityName, streetAddress, limit = 10 }) {
  const normalized = streetAddress.trim().toUpperCase();
  const parts = normalized.split(' ');
  const streetNum = parts[0].match(/^\d+$/) ? parts[0] : null;
  const streetName = streetNum ? parts.slice(1).join(' ') : normalized;

  // Prefer municipality_name search (covers all sub-jurisdictions).
  // Fall back to swis_code if no name provided.
  let whereClause = municipalityName
    ? `upper(municipality_name)='${municipalityName.toUpperCase().replace(/'/g, "''")}'`
    : `swis_code='${swis}'`;

  if (streetNum) {
    whereClause += ` AND parcel_address_number='${streetNum}'`;
  }
  if (streetName) {
    whereClause += ` AND upper(parcel_address_street) like '%${streetName.split(' ')[0].replace(/'/g, "''")}%'`;
  }

  const url = buildUrl({
    '$where': whereClause,
    '$limit': limit,
    '$order': 'parcel_address_street ASC',
  });

  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`ORPTS API error: ${res.status}`);
  return res.json();
}

/**
 * Get a specific parcel by SWIS + print key
 */
export async function getParcel({ swis, printKey }) {
  const url = buildUrl({
    '$where': `swis_code='${swis}' AND print_key_code='${printKey}'`,
    '$limit': 1,
  });
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`ORPTS API error: ${res.status}`);
  const data = await res.json();
  return data[0] || null;
}

/**
 * Find comparable properties — same SWIS, same property class, similar market value
 */
export async function getComparables({ swis, propertyClass, fullMarketValue, limit = 25 }) {
  const fmv = parseFloat(fullMarketValue);
  const low = Math.floor(fmv * 0.75);
  const high = Math.ceil(fmv * 1.25);

  // Use property class prefix (e.g., "210" or "2" for all residential)
  const classPrefix = propertyClass?.slice(0, 3) || '210';

  const url = buildUrl({
    '$where': `swis_code='${swis}' AND property_class='${classPrefix}' AND full_market_value >= '${low}' AND full_market_value <= '${high}'`,
    '$limit': limit,
    '$order': 'full_market_value ASC',
  });

  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`ORPTS API error: ${res.status}`);
  return res.json();
}

/**
 * Get all parcels in a SWIS for a given property class (for broader comp search)
 */
export async function getParcelsByClass({ swis, propertyClass, limit = 100 }) {
  const url = buildUrl({
    '$where': `swis_code='${swis}' AND property_class='${propertyClass}'`,
    '$limit': limit,
    '$order': 'full_market_value ASC',
  });
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`ORPTS API error: ${res.status}`);
  return res.json();
}

/**
 * Normalize a raw ORPTS parcel record into clean numbers
 */
export function normalizeParcel(raw) {
  return {
    // Identity
    swis: raw.swis_code,
    printKey: raw.print_key_code,
    address: [
      raw.parcel_address_number,
      raw.parcel_address_street,
      raw.parcel_address_suff,
    ].filter(Boolean).join(' '),
    municipality: raw.municipality_name,
    county: raw.county_name,
    schoolDistrict: raw.school_district_name,
    rollYear: raw.roll_year,

    // Owner
    ownerName: [
      raw.primary_owner_first_name,
      raw.primary_owner_last_name,
    ].filter(Boolean).join(' ') || raw.primary_owner_last_name || '',

    // Property
    propertyClass: raw.property_class,
    propertyClassDesc: raw.property_class_description,

    // Valuations (all as numbers)
    assessmentTotal: parseFloat(raw.assessment_total) || 0,
    assessmentLand: parseFloat(raw.assessment_land) || 0,
    fullMarketValue: parseFloat(raw.full_market_value) || 0,
    countyTaxable: parseFloat(raw.county_taxable_value) || 0,
    townTaxable: parseFloat(raw.town_taxable_value) || 0,
    schoolTaxable: parseFloat(raw.school_taxable) || 0,

    // School district (needed to match tax rates)
    schoolDistrictCode: raw.school_district_code || '',
    schoolDistrictName: raw.school_district_name || '',

    // Geo
    gridEast: raw.grid_coordinates_east,
    gridNorth: raw.grid_coordinates_north,
    front: raw.front,
    depth: raw.depth,
  };
}

/**
 * Calculate assessment ratio (what % of market value is the property assessed at)
 * For a fully equalized municipality this should be ~1.0 (100%)
 */
export function calcAssessmentRatio(parcel) {
  if (!parcel.fullMarketValue) return null;
  return parcel.assessmentTotal / parcel.fullMarketValue;
}

/**
 * Calculate assessor's implied market value
 * assessorMarketValue = assessmentTotal / equalizationRate
 */
export function calcAssessorMarketValue(parcel, equalizationRate) {
  if (!equalizationRate) return parcel.fullMarketValue;
  return parcel.assessmentTotal / equalizationRate;
}

/**
 * Compare subject property assessment ratio against comps
 * Returns overassessment analysis
 */
export function analyzeOverassessment(subject, comps, equalizationRate) {
  const subjectRatio = calcAssessmentRatio(subject);
  const compRatios = comps
    .filter(c => c.fullMarketValue > 0 && c.assessmentTotal > 0)
    .map(c => ({
      ...c,
      assessmentRatio: calcAssessmentRatio(c),
    }));

  const medianCompRatio = median(compRatios.map(c => c.assessmentRatio));
  const assessorMarketValue = calcAssessorMarketValue(subject, equalizationRate);

  // Comps assessed at lower rate than subject
  const underassessedComps = compRatios.filter(
    c => c.assessmentRatio < subjectRatio * 0.95
  );

  // If subject ratio > median comp ratio by more than 5%, likely over-assessed
  const overassessmentPct = subjectRatio > 0 && medianCompRatio > 0
    ? ((subjectRatio - medianCompRatio) / medianCompRatio) * 100
    : 0;

  const potentialSavings = overassessmentPct > 0
    ? subject.assessmentTotal * (overassessmentPct / 100) * 0.02 // rough tax rate ~2%
    : 0;

  return {
    subjectRatio,
    medianCompRatio,
    overassessmentPct,
    assessorMarketValue,
    potentialSavings,
    underassessedComps,
    hasCase: overassessmentPct >= 5,
    borderline: overassessmentPct > 0 && overassessmentPct < 5,
    compRatios,
  };
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fetch all tax rate rows for a given SWIS code (most recent roll year).
 * Dataset: Real Property Tax Rates and Levy Data — data.ny.gov/resource/iq85-sdzs.json
 * Multiple rows per SWIS because different school districts can overlap one town.
 * County and municipal rates are the same across all rows; school rate varies.
 *
 * Returns array of rate objects, one per school district, newest year first.
 */
export async function getTaxRates(swis) {
  if (taxRatesCache[swis]) return taxRatesCache[swis];

  const url = new URL(TAX_RATES_URL);
  url.searchParams.set('$where', `swis_code='${swis}'`);
  url.searchParams.set('$order', 'roll_year DESC');
  url.searchParams.set('$limit', '20');

  const res = await fetch(url.toString(), { headers: buildHeaders() });
  if (!res.ok) throw new Error(`Tax rates API error: ${res.status}`);
  const rows = await res.json();

  // Normalize
  const rates = rows.map(r => ({
    rollYear: r.roll_year,
    fiscalYear: r.fiscal_year_ending,
    swis: r.swis_code,
    municipality: r.municipality,
    schoolCode: r.school_code,
    schoolName: r.school_name,
    valueType: r.type_of_value_on_whichtax_rates_are_applied, // "Full Value" or "Assessed Value"
    countyRate: parseFloat(r.county_tax_rate_outside_village_per_1000_assessed_value) || 0,
    municipalRate: parseFloat(r.municipal_tax_rate_outside_village_per_1000_assessed_value) || 0,
    schoolRate: parseFloat(r.school_district_tax_rate_per_1000_assessed_value) || 0,
  }));

  taxRatesCache[swis] = rates;
  return rates;
}

/**
 * Calculate estimated prior-year tax for a parcel given the rate rows for its SWIS.
 *
 * Matches on school district code when possible; falls back to the median school rate.
 * Rates are per $1,000 of full market value (type = "Full Value" in most NY assessing units).
 * For fractional assessment towns (type = "Assessed Value") we use the assessment total.
 *
 * Returns { countyTax, municipalTax, schoolTax, totalTax, schoolName, rollYear, note }
 */
export function calcEstimatedTax(parcel, taxRates) {
  if (!taxRates || !taxRates.length) return null;

  // Use most recent roll year's rates
  const latestYear = taxRates[0].rollYear;
  const latestRates = taxRates.filter(r => r.rollYear === latestYear);

  // County and municipal rates are the same for all rows in same SWIS/year
  const { countyRate, municipalRate, valueType } = latestRates[0];

  // Match school district by code; fall back to median school rate
  const schoolMatch = latestRates.find(r => r.schoolCode === parcel.schoolDistrictCode)
    || latestRates.find(r => r.schoolName?.toLowerCase() === parcel.schoolDistrictName?.toLowerCase());
  const schoolRate = schoolMatch
    ? schoolMatch.schoolRate
    : median(latestRates.map(r => r.schoolRate));
  const schoolName = schoolMatch?.schoolName || 'median estimate';

  // Base value: full market value for "Full Value" municipalities,
  // assessed total for "Assessed Value" municipalities
  const base = valueType === 'Full Value'
    ? parcel.fullMarketValue
    : parcel.assessmentTotal;

  const countyTax = base * countyRate / 1000;
  const municipalTax = base * municipalRate / 1000;
  const schoolTax = base * schoolRate / 1000;
  const totalTax = countyTax + municipalTax + schoolTax;

  return {
    countyTax,
    municipalTax,
    schoolTax,
    totalTax,
    countyRate,
    municipalRate,
    schoolRate,
    schoolName,
    rollYear: latestYear,
    fiscalYear: latestRates[0].fiscalYear,
    valueType,
    isEstimate: !schoolMatch,
  };
}
