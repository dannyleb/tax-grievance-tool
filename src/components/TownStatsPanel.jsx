import { useState, useEffect } from 'react';
import { getParcelsByClass } from '../api/orpts';
import { normalizeParcel } from '../api/orpts';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

function pct(n) {
  return n != null ? `${(n * 100).toFixed(1)}%` : 'N/A';
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * s.length);
  return s[Math.min(idx, s.length - 1)];
}

export default function TownStatsPanel({ parcel, municipality }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const raw = await getParcelsByClass({
          swis: parcel.swis,
          propertyClass: parcel.propertyClass,
          limit: 500,
        });
        if (cancelled) return;

        const parcels = raw.map(normalizeParcel).filter(
          p => p.fullMarketValue > 0 && p.assessmentTotal > 0
        );

        if (parcels.length < 5) {
          setError('Not enough data for town-wide stats.');
          return;
        }

        const ratios = parcels.map(p => p.assessmentTotal / p.fullMarketValue);
        const subjectRatio = parcel.assessmentTotal / parcel.fullMarketValue;

        const medianRatio = median(ratios);
        const p25 = percentile(ratios, 25);
        const p75 = percentile(ratios, 75);

        // How many parcels have a lower ratio than the subject?
        const lowerThanSubject = ratios.filter(r => r < subjectRatio).length;
        const subjectPercentile = Math.round((lowerThanSubject / ratios.length) * 100);

        // Distribution buckets
        const buckets = [
          { label: '< 80%', min: 0, max: 0.80 },
          { label: '80–90%', min: 0.80, max: 0.90 },
          { label: '90–95%', min: 0.90, max: 0.95 },
          { label: '95–100%', min: 0.95, max: 1.00 },
          { label: '100–110%', min: 1.00, max: 1.10 },
          { label: '> 110%', min: 1.10, max: Infinity },
        ];
        const distribution = buckets.map(b => ({
          ...b,
          count: ratios.filter(r => r >= b.min && r < b.max).length,
        }));
        const maxCount = Math.max(...distribution.map(b => b.count));

        const fmvValues = parcels.map(p => p.fullMarketValue);
        const medianFMV = median(fmvValues);

        setStats({
          count: parcels.length,
          medianRatio,
          p25,
          p75,
          subjectRatio,
          subjectPercentile,
          lowerThanSubject,
          distribution,
          maxCount,
          medianFMV,
        });
      } catch (e) {
        if (!cancelled) setError('Could not load town-wide stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [parcel.printKey]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h2 className="text-lg font-semibold text-slate-800">
          {municipality.name} — Town-Wide Assessment Stats
        </h2>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        How your assessment ratio compares to all <strong>{parcel.propertyClassDesc}</strong> properties in town
      </p>

      {loading && (
        <div className="flex items-center gap-3 py-6 text-slate-500 text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          Loading town-wide assessment data...
        </div>
      )}

      {error && <div className="text-sm text-slate-500">{error}</div>}

      {stats && !loading && (
        <>
          {/* Key stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox
              label="Your Ratio"
              value={pct(stats.subjectRatio)}
              sub="Your assessment / market value"
              highlight={stats.subjectRatio > stats.medianRatio * 1.05}
            />
            <StatBox
              label="Town Median"
              value={pct(stats.medianRatio)}
              sub={`Among ${stats.count} similar properties`}
            />
            <StatBox
              label="Your Percentile"
              value={`${stats.subjectPercentile}th`}
              sub={`${stats.lowerThanSubject} of ${stats.count} properties have a lower rate`}
              highlight={stats.subjectPercentile > 70}
            />
            <StatBox
              label="Town Median Value"
              value={fmt(stats.medianFMV)}
              sub="Median market value (same class)"
            />
          </div>

          {/* Distribution bar chart */}
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Assessment Ratio Distribution — {municipality.name} ({parcel.propertyClassDesc})
            </div>
            <div className="space-y-2">
              {stats.distribution.map((b) => {
                const isSubjectBucket = stats.subjectRatio >= b.min && stats.subjectRatio < b.max;
                const barPct = stats.maxCount ? (b.count / stats.maxCount) * 100 : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3 text-sm">
                    <div className="w-20 text-right text-xs text-slate-500 shrink-0">{b.label}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isSubjectBucket ? 'bg-blue-500' : 'bg-slate-300'}`}
                        style={{ width: `${Math.max(barPct, b.count > 0 ? 2 : 0)}%` }}
                      />
                      {isSubjectBucket && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          ← YOU ARE HERE
                        </span>
                      )}
                    </div>
                    <div className="w-10 text-xs text-slate-500 shrink-0">{b.count}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Bar width = relative count. Blue bar = your ratio bucket. Numbers on right = property count.
            </div>
          </div>

          {/* IQR range */}
          <div className="mt-4 text-xs text-slate-500 flex gap-4 flex-wrap">
            <span>25th percentile: <strong>{pct(stats.p25)}</strong></span>
            <span>Median: <strong>{pct(stats.medianRatio)}</strong></span>
            <span>75th percentile: <strong>{pct(stats.p75)}</strong></span>
            <span>Sample size: <strong>{stats.count} parcels</strong></span>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-red-700' : 'text-slate-800'}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${highlight ? 'text-red-600' : 'text-slate-600'}`}>{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
