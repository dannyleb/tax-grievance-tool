import { calcAssessorMarketValue } from '../api/orpts';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

function VerdictBadge({ analysis }) {
  if (!analysis) return null;
  if (analysis.hasCase) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
        Likely Over-Assessed — Consider Grievance
      </span>
    );
  }
  if (analysis.borderline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
        Borderline — Gather More Comps
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
      Assessment Appears Fair
    </span>
  );
}

export default function ParcelCard({ parcel, equalizationRate, analysis }) {
  const assessorMarketValue = calcAssessorMarketValue(parcel, equalizationRate);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">3</span>
        <h2 className="text-lg font-semibold text-slate-800">Your Property</h2>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-xl font-bold text-slate-900">{parcel.address}</div>
          <div className="text-sm text-slate-500">
            {parcel.municipality}, {parcel.county} County &middot; School: {parcel.schoolDistrict}
          </div>
          <div className="text-sm text-slate-500">
            Owner: {parcel.ownerName || 'N/A'} &middot; Class: {parcel.propertyClass} — {parcel.propertyClassDesc}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Parcel ID: {parcel.printKey} &middot; Roll Year: {parcel.rollYear}</div>
        </div>
        <div className="mt-1">
          <VerdictBadge analysis={analysis} />
        </div>
      </div>

      {/* Value grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <ValueBox
          label="Total Assessment"
          value={fmt(parcel.assessmentTotal)}
          sub="Official assessed value"
          highlight
        />
        <ValueBox
          label="Assessor's Market Value"
          value={fmt(assessorMarketValue)}
          sub={`Assessment ÷ ${(equalizationRate * 100).toFixed(1)}% eq. rate`}
        />
        <ValueBox
          label="Full Market Value"
          value={fmt(parcel.fullMarketValue)}
          sub="Assessor's FMV estimate"
        />
        <ValueBox
          label="County Taxable"
          value={fmt(parcel.countyTaxable)}
          sub="County portion"
        />
        <ValueBox
          label="School Taxable"
          value={fmt(parcel.schoolTaxable)}
          sub="School district portion"
        />
      </div>

      {/* Analysis summary */}
      {analysis && (
        <div className={`rounded-lg p-4 text-sm ${
          analysis.hasCase
            ? 'bg-red-50 border border-red-200'
            : analysis.borderline
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-slate-700">Your Assessment Ratio</div>
              <div className="text-lg font-bold text-slate-900">
                {(analysis.subjectRatio * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">Assessed ÷ Market Value</div>
            </div>
            <div>
              <div className="font-medium text-slate-700">Median Comp Ratio</div>
              <div className="text-lg font-bold text-slate-900">
                {analysis.medianCompRatio ? (analysis.medianCompRatio * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <div className="text-xs text-slate-500">Average among similar homes</div>
            </div>
            <div>
              <div className="font-medium text-slate-700">
                {analysis.hasCase ? 'Estimated Annual Savings' : 'Over-Assessment'}
              </div>
              <div className={`text-lg font-bold ${analysis.hasCase ? 'text-red-700' : 'text-slate-900'}`}>
                {analysis.overassessmentPct > 0
                  ? `+${analysis.overassessmentPct.toFixed(1)}%`
                  : `${analysis.overassessmentPct.toFixed(1)}%`}
                {analysis.hasCase && analysis.potentialSavings > 0 && (
                  <span className="block text-sm font-normal">
                    ~{fmt(analysis.potentialSavings)}/yr potential savings
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">vs. median comp</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ValueBox({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className={`text-lg font-bold ${highlight ? 'text-blue-800' : 'text-slate-800'}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${highlight ? 'text-blue-700' : 'text-slate-600'}`}>{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
