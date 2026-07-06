function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

export default function CompsTable({ subject, comps, analysis }) {
  const subjectRatio = analysis.subjectRatio;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">4</span>
        <h2 className="text-lg font-semibold text-slate-800">Comparable Properties</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {comps.length} similar homes in {subject.municipality} (same property class, ±25% market value).
        {analysis.underassessedComps.length > 0 && (
          <span className="text-red-600 font-medium ml-1">
            {analysis.underassessedComps.length} are assessed at a lower rate than your property — flagged in red.
          </span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Address</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Assessment</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Market Value</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Assess. Ratio</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">vs. Yours</th>
            </tr>
          </thead>
          <tbody>
            {/* Subject property row */}
            <tr className="bg-blue-50 border-b border-blue-200 font-medium">
              <td className="py-2 px-3 text-blue-800">
                {subject.address}
                <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">YOUR HOME</span>
              </td>
              <td className="py-2 px-3 text-right text-blue-800">{fmt(subject.assessmentTotal)}</td>
              <td className="py-2 px-3 text-right text-blue-800">{fmt(subject.fullMarketValue)}</td>
              <td className="py-2 px-3 text-right text-blue-800">
                {(subjectRatio * 100).toFixed(1)}%
              </td>
              <td className="py-2 px-3 text-right text-blue-800">—</td>
            </tr>

            {comps.map((comp, i) => {
              const diff = subjectRatio - comp.assessmentRatio;
              const diffPct = (diff / subjectRatio) * 100;
              const flagged = comp.assessmentRatio < subjectRatio * 0.95;

              return (
                <tr
                  key={comp.printKey || i}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${flagged ? 'bg-red-50' : ''}`}
                >
                  <td className="py-2 px-3 text-slate-700">
                    {comp.address}
                    {flagged && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">lower rate</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">{fmt(comp.assessmentTotal)}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{fmt(comp.fullMarketValue)}</td>
                  <td className={`py-2 px-3 text-right font-medium ${flagged ? 'text-red-600' : 'text-slate-700'}`}>
                    {(comp.assessmentRatio * 100).toFixed(1)}%
                  </td>
                  <td className={`py-2 px-3 text-right ${flagged ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {flagged
                      ? `-${diffPct.toFixed(1)}%`
                      : diff < 0
                      ? `+${Math.abs(diffPct).toFixed(1)}%`
                      : 'similar'
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
        <strong>Assessment Ratio</strong> = Total Assessment ÷ Full Market Value. If comparable homes have a lower ratio, they pay less tax per dollar of market value — a key basis for a grievance complaint.
      </div>
    </div>
  );
}
