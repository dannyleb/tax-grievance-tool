/**
 * Cloudflare Worker: CORS proxy for state parcel/assessment APIs.
 * Only proxies requests to explicitly allowlisted government data domains.
 * Deploy: wrangler deploy (from /proxy directory)
 */

const ALLOWED_DOMAINS = new Set([
  // New York
  'data.ny.gov',
  // Texas
  'data.texas.gov',
  'maps.bexar.org',
  // Florida (statewide cadastral on ArcGIS Online)
  'services9.arcgis.com',
  'gis.fdot.gov',
  'geodata.floridagio.gov',
  // Pennsylvania (Philadelphia OPA on ArcGIS Online)
  'services.arcgis.com',
  'services1.arcgis.com',
  'services2.arcgis.com',
  'services3.arcgis.com',
  'services5.arcgis.com',
  'services6.arcgis.com',
  'services7.arcgis.com',
  // Allegheny County PA (WPRDC CKAN)
  'data.wprdc.org',
  // Illinois
  'datacatalog.cookcountyil.gov',
  'gis.cookcountyil.gov',
  // Washington
  'gis.kingcounty.gov',
  'geo.wa.gov',
  // Ohio
  'gis.ohiosos.gov',
  'ohioparcels-geohio.hub.arcgis.com',
  // New Jersey
  'data.nj.gov',
  'njgin.nj.gov',
  // Colorado
  'data.colorado.gov',
  'maps.jeffco.us',
  // Georgia
  'gisdata.fultoncountyga.gov',
  // North Carolina
  'maps.wakegov.com',
  // Pennsylvania
  'phlapi.com',
  'services.arcgis.com',
  // Massachusetts
  'gis.data.mass.gov',
  // Michigan
  'gis.michigan.gov',
  // Arizona
  'mcassessor.maricopa.gov',
  // Minnesota
  'opendata.minneapolismn.gov',
  'gis.hennepin.us',
  // Virginia
  'opendata.virginia.gov',
  // Missouri
  'opendata.mo.gov',
  // Nevada
  'gis.clarkcountynv.gov',
  // Oregon
  'rlisdiscovery.oregonmetro.gov',
  'www.oregongeology.org',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_DOMAINS.has(targetUrl.hostname)) {
      return new Response(JSON.stringify({ error: `Domain not in allowlist: ${targetUrl.hostname}` }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const res = await fetch(target, {
        headers: { Accept: 'application/json', 'User-Agent': 'PropertyTaxAppealTool/1.0' },
        cf: { cacheTtl: 300, cacheEverything: true },
      });

      const body = await res.arrayBuffer();

      return new Response(body, {
        status: res.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': res.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Upstream error: ${e.message}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
