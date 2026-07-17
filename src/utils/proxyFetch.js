/**
 * Fetches a URL, routing through the Cloudflare proxy worker when configured.
 * VITE_PROXY_URL is set at build time via GitHub Actions secret PROXY_URL.
 * Falls back to direct fetch (works for already-CORS-enabled endpoints).
 */
const PROXY = import.meta.env.VITE_PROXY_URL;

export async function proxyFetch(url) {
  const fetchUrl = PROXY
    ? `${PROXY}?url=${encodeURIComponent(url)}`
    : url;

  const res = await fetch(fetchUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
