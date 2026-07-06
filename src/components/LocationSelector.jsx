import { COUNTY_NAMES } from '../data/swis';

export default function LocationSelector({ county, municipality, onCountyChange, onMunicipalityChange, municipalities }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">1</span>
        <h2 className="text-lg font-semibold text-slate-800">Select Your Location</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* County */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">County</label>
          <select
            value={county}
            onChange={e => onCountyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">— Select county —</option>
            {COUNTY_NAMES.map(c => (
              <option key={c} value={c}>{c} County</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">More counties added regularly</p>
        </div>

        {/* Municipality */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Town / City / Village</label>
          <select
            value={municipality?.swis || ''}
            onChange={e => {
              const m = municipalities.find(m => m.swis === e.target.value);
              if (m) onMunicipalityChange(m);
            }}
            disabled={!county || !municipalities.length}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">— Select town —</option>
            {municipalities.map(m => (
              <option key={m.swis} value={m.swis}>{m.name}</option>
            ))}
          </select>
          {municipality && (
            <p className="mt-1 text-xs text-slate-400">
              SWIS: {municipality.swis} &middot; Equalization rate: {(municipality.equalizationRate * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {municipality && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>{municipality.name}</strong> selected. Proceed to enter your property address below.
        </div>
      )}
    </div>
  );
}
