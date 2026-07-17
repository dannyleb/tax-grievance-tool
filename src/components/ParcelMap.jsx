import { useEffect, useRef } from 'react';

// Dynamically load Leaflet to avoid SSR issues and keep bundle lean
let leafletLoaded = false;
let L = null;

async function loadLeaflet() {
  if (leafletLoaded) return L;
  const mod = await import('leaflet');
  L = mod.default;
  // Fix default icon paths broken by Vite
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  leafletLoaded = true;
  return L;
}

// Convert NY State Plane grid coords to approximate lat/lng
// NY State uses different plane zones; this is a rough conversion for the Capital District
// For full accuracy we'd use proj4js — for now we use the geocoding fallback
function gridToLatLng(east, north) {
  // NY State Plane East (FIPS 3101) approximate conversion
  // Only works well for eastern NY; for other zones would need zone detection
  if (!east || !north) return null;
  const e = parseFloat(east);
  const n = parseFloat(north);
  if (isNaN(e) || isNaN(n)) return null;
  // These values are in feet; rough linear conversion for Saratoga/Albany area
  // Center of NY State Plane East zone: lat 38.83333, lon -74.5
  // Scale factors approximate
  const lat = 40.5 + (n - 1000000) / 363000;
  const lng = -76.5 + (e - 300000) / 280000;
  if (lat < 40 || lat > 45.1 || lng < -80 || lng > -71) return null;
  return [lat, lng];
}

// Geocode via Nominatim (OSM) — free, no key needed
async function geocodeAddress(address, municipality, county) {
  const q = encodeURIComponent(`${address}, ${municipality}, ${county} County, NY`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {}
  return null;
}

export default function ParcelMap({ parcel, comps }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mapRef.current || initialized.current) return;

    let mounted = true;

    async function initMap() {
      await import('leaflet/dist/leaflet.css');
      const Lf = await loadLeaflet();
      if (!mounted || !mapRef.current) return;

      // Determine coordinates
      let center = gridToLatLng(parcel.gridEast, parcel.gridNorth);
      if (!center) {
        center = await geocodeAddress(parcel.address, parcel.municipality, parcel.county);
      }
      if (!center || !mounted) return;

      initialized.current = true;
      const map = Lf.map(mapRef.current).setView(center, 16);
      mapInstance.current = map;

      // Base layer — OpenStreetMap
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Subject property marker (blue)
      const subjectIcon = Lf.divIcon({
        html: `<div style="background:#2563eb;border:2px solid white;border-radius:50% 50% 50% 0;width:20px;height:20px;transform:rotate(-45deg);box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        className: '',
      });

      Lf.marker(center, { icon: subjectIcon })
        .addTo(map)
        .bindPopup(`
          <strong>${parcel.address}</strong><br/>
          Assessment: $${parcel.assessmentTotal.toLocaleString()}<br/>
          Market Value: $${parcel.fullMarketValue.toLocaleString()}<br/>
          <em>Your Property</em>
        `);

      // Comp markers (red for flagged, gray for others)
      const compGeocodes = [];
      for (const comp of (comps || []).slice(0, 15)) {
        if (!mounted) break;
        let pos = gridToLatLng(comp.gridEast, comp.gridNorth);
        if (!pos) {
          pos = await geocodeAddress(comp.address, parcel.municipality, parcel.county);
          await new Promise(r => setTimeout(r, 300)); // rate-limit Nominatim
        }
        if (pos && mounted) {
          const flagged = comp.assessmentRatio < (parcel.assessmentTotal / parcel.fullMarketValue) * 0.95;
          const color = flagged ? '#dc2626' : '#6b7280';
          const compIcon = Lf.divIcon({
            html: `<div style="background:${color};border:2px solid white;border-radius:50%;width:12px;height:12px;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            className: '',
          });
          Lf.marker(pos, { icon: compIcon })
            .addTo(map)
            .bindPopup(`
              <strong>${comp.address}</strong><br/>
              Assessment: $${comp.assessmentTotal.toLocaleString()}<br/>
              Ratio: ${(comp.assessmentRatio * 100).toFixed(1)}%
              ${flagged ? '<br/><span style="color:#dc2626;font-weight:bold">★ Lower assessment rate</span>' : ''}
            `);
          compGeocodes.push(pos);
        }
      }
    }

    initMap();
    return () => { mounted = false; };
  }, [parcel.printKey]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Property Map</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Blue pin = your property &nbsp;|&nbsp; <span className="text-red-600">Red dots</span> = lower-assessed comps &nbsp;|&nbsp; Gray dots = similar comps
          </p>
        </div>
      </div>
      <div ref={mapRef} className="h-64 sm:h-96" />
    </div>
  );
}
