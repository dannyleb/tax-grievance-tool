import { COUNTY_NAMES } from '../data/swis';
import { STATES } from '../data/states';
import { TX_COUNTIES } from '../data/tx-counties';

export default function LocationSelector({
  selectedState, county, municipality, txCounty,
  onStateChange, onCountyChange, onMunicipalityChange, onTxCountyChange,
  municipalities,
}) {
  const stateInfo = selectedState;
  const isNY = selectedState?.abbr === 'NY';
  const isTX = selectedState?.abbr === 'TX';
  const selectedTxCountyInfo = txCounty ? TX_COUNTIES.find(c => c.name === txCounty) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">1</span>
        <h2 className="text-lg font-semibold text-slate-800">Select Your Location</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* State */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            value={selectedState?.abbr || ''}
            onChange={e => {
              const s = STATES.find(st => st.abbr === e.target.value) || null;
              onStateChange(s);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">— Select state —</option>
            {STATES.map(s => (
              <option key={s.abbr} value={s.abbr}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* County */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">County</label>
          {isNY ? (
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
          ) : isTX ? (
            <select
              value={txCounty || ''}
              onChange={e => onTxCountyChange(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">— Select county —</option>
              {TX_COUNTIES.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} County{c.dataStatus === 'full' ? ' ✓' : ''}
                </option>
              ))}
            </select>
          ) : (
            <select
              disabled
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-400 text-sm"
            >
              <option>— Select state first —</option>
            </select>
          )}
          {isTX && selectedTxCountyInfo && (
            <p className="mt-1 text-xs text-slate-400">
              {selectedTxCountyInfo.cad}
              {selectedTxCountyInfo.dataStatus === 'full'
                ? ' — parcel search available'
                : ' — parcel data coming soon'}
            </p>
          )}
        </div>

        {/* Municipality — NY only */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {isNY ? 'Town / City / Village' : 'Municipality'}
          </label>
          <select
            value={municipality?.swis || ''}
            onChange={e => {
              const m = municipalities.find(m => m.swis === e.target.value);
              if (m) onMunicipalityChange(m);
            }}
            disabled={!isNY || !county || !municipalities.length}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">{isNY && county ? '— Select town —' : '— N/A for this state —'}</option>
            {municipalities.map(m => (
              <option key={m.swis} value={m.swis}>{m.name}</option>
            ))}
          </select>
          {municipality && (
            <p className="mt-1 text-xs text-slate-400">
              SWIS: {municipality.swis} &middot; Eq. rate: {(municipality.equalizationRate * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Appeal process info for all states */}
      {stateInfo && (
        <div className={`mt-4 rounded-lg p-4 border ${stateInfo.dataStatus === 'full' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-slate-800">{stateInfo.name} — {stateInfo.appealName}</span>
                {stateInfo.dataStatus === 'full'
                  ? <span className="text-xs font-medium bg-green-600 text-white px-2 py-0.5 rounded-full">Full data support</span>
                  : <span className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded-full">Parcel data coming soon</span>
                }
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700">
                <div><span className="text-slate-500">Governing body: </span>{stateInfo.body}</div>
                <div><span className="text-slate-500">Filing deadline: </span><strong>{stateInfo.deadline}</strong></div>
                {stateInfo.form && (
                  <div>
                    <span className="text-slate-500">Form: </span>
                    {stateInfo.formUrl
                      ? <a href={stateInfo.formUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{stateInfo.form} (PDF)</a>
                      : stateInfo.form
                    }
                  </div>
                )}
              </div>
            </div>
            <a
              href={stateInfo.infoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-blue-600 underline hover:text-blue-800 font-medium"
            >
              Official info →
            </a>
          </div>

          {stateInfo.dataStatus !== 'full' && (
            <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
              Parcel lookup and comparable analysis is currently available for <strong>New York</strong> only.
              Additional states are being integrated. In the meantime, use your state's official resources above to file your appeal.
            </div>
          )}
        </div>
      )}

      {municipality && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>{municipality.name}</strong> selected. Proceed to enter your property address below.
        </div>
      )}
      {isTX && selectedTxCountyInfo?.dataStatus === 'full' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>{txCounty} County</strong> selected. Proceed to enter your property address below.
        </div>
      )}
      {isTX && selectedTxCountyInfo?.dataStatus === 'coming_soon' && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Parcel data for <strong>{txCounty} County</strong> is coming soon. See the protest info above and use your county CAD's website to look up your appraisal.
        </div>
      )}
    </div>
  );
}
