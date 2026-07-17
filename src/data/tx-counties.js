/**
 * Texas counties with their County Appraisal District (CAD) info.
 * dataStatus: 'full' = live parcel API available | 'coming_soon' = planned
 *
 * Collin CAD: data.texas.gov Socrata SODA API (CORS-enabled).
 * Bexar CAD: maps.bexar.org ArcGIS REST API (CORS enabled for dannyleb.github.io).
 * HCAD (Harris), DCAD (Dallas), TCAD (Travis) use bulk downloads only.
 */
export const TX_COUNTIES = [
  { name: 'Collin',      cad: 'Collin Central Appraisal District',          dataStatus: 'full',         socrataDataset2026: 'nne4-8riu', socrataDataset2025: 'vffy-snc6' },
  { name: 'Bexar',       cad: 'Bexar Appraisal District (BCAD)',             dataStatus: 'full',         arcgisUrl: 'https://maps.bexar.org/arcgis/rest/services/Parcels/MapServer/0' },
  { name: 'Harris',      cad: 'Harris County Appraisal District (HCAD)',     dataStatus: 'coming_soon' },
  { name: 'Dallas',      cad: 'Dallas Central Appraisal District (DCAD)',    dataStatus: 'coming_soon' },
  { name: 'Tarrant',     cad: 'Tarrant Appraisal District (TAD)',            dataStatus: 'coming_soon' },
  { name: 'Travis',      cad: 'Travis Central Appraisal District (TCAD)',    dataStatus: 'coming_soon' },
  { name: 'Denton',      cad: 'Denton Central Appraisal District',           dataStatus: 'coming_soon' },
  { name: 'Fort Bend',   cad: 'Fort Bend Central Appraisal District (FBCAD)',dataStatus: 'coming_soon' },
  { name: 'Williamson',  cad: 'Williamson Central Appraisal District (WCAD)',dataStatus: 'coming_soon' },
  { name: 'Montgomery',  cad: 'Montgomery Central Appraisal District (MCAD)',dataStatus: 'coming_soon' },
  { name: 'Hidalgo',     cad: 'Hidalgo Central Appraisal District',          dataStatus: 'coming_soon' },
  { name: 'El Paso',     cad: 'El Paso Central Appraisal District (EPCAD)',  dataStatus: 'coming_soon' },
  { name: 'Brazoria',    cad: 'Brazoria County Appraisal District',          dataStatus: 'coming_soon' },
  { name: 'Bell',        cad: 'Bell County Appraisal District',              dataStatus: 'coming_soon' },
  { name: 'Galveston',   cad: 'Galveston Central Appraisal District',        dataStatus: 'coming_soon' },
  { name: 'Lubbock',     cad: 'Lubbock Central Appraisal District',          dataStatus: 'coming_soon' },
  { name: 'Webb',        cad: 'Webb County Appraisal District',              dataStatus: 'coming_soon' },
  { name: 'Jefferson',   cad: 'Jefferson County Appraisal District',         dataStatus: 'coming_soon' },
  { name: 'Hays',        cad: 'Hays Central Appraisal District',             dataStatus: 'coming_soon' },
  { name: 'Brazos',      cad: 'Brazos Central Appraisal District',           dataStatus: 'coming_soon' },
  { name: 'McLennan',    cad: 'McLennan Central Appraisal District',         dataStatus: 'coming_soon' },
  { name: 'Smith',       cad: 'Smith County Appraisal District',             dataStatus: 'coming_soon' },
  { name: 'Johnson',     cad: 'Johnson County Appraisal District',           dataStatus: 'coming_soon' },
  { name: 'Ellis',       cad: 'Ellis County Appraisal District (ECAD)',      dataStatus: 'coming_soon' },
  { name: 'Ector',       cad: 'Ector County Appraisal District',             dataStatus: 'coming_soon' },
  { name: 'Midland',     cad: 'Midland Central Appraisal District',          dataStatus: 'coming_soon' },
  { name: 'Cameron',     cad: 'Cameron County Appraisal District',           dataStatus: 'coming_soon' },
  { name: 'Nueces',      cad: 'Nueces County Appraisal District',            dataStatus: 'coming_soon' },
  { name: 'Potter',      cad: 'Potter County Appraisal District',            dataStatus: 'coming_soon' },
  { name: 'Tom Green',   cad: 'Tom Green County Appraisal District',         dataStatus: 'coming_soon' },
].sort((a, b) => {
  // Full-support counties first, then alphabetical
  if (a.dataStatus === 'full' && b.dataStatus !== 'full') return -1;
  if (b.dataStatus === 'full' && a.dataStatus !== 'full') return 1;
  return a.name.localeCompare(b.name);
});

export const TX_COUNTY_MAP = Object.fromEntries(TX_COUNTIES.map(c => [c.name, c]));
