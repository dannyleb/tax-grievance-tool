import { calcEstimatedTax } from '../api/orpts';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

export default function CompsTable({ subject, comps, analysis, taxRates, stateAbbr }) {
  const isTX = stateAbbr === 'TX';
  const subjectRatio = analysis.subjectRatio; // $/sqft for TX, assessment ratio for NY
  const hasTaxRates = !isTX && taxRates && taxRates.length > 0;

  // Pre-compute estimated tax for each comp using same rate set
  // (county + municipal rates are the same for all parcels in this SWIS;
  //  school rate is matched by school district code when possible)
  function compTax(comp) {
    if (!hasTaxRates) return null;
    const tax = calcEstimatedTax(comp, taxRates);
    return tax?.totalTax || null;
  }

  const subjectTaxAmt = hasTaxRates ? calcEstimatedTax(subject, taxRates)?.totalTax : null;
  const taxYear = hasTaxRates ? taxRates[0]?.fiscalYear : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">4</span>
        <h2 className="text-lg font-semibold text-slate-800">Comparable Properties</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {comps.length} similar homes in {subject.municipality}
        {isTX ? ' (same property class & neighborhood, ±30% sqft)' : ' (same property class, ±25% market value)'}.
        {analysis.underassessedComps.length > 0 && (
          <span className="text-red-600 font-medium ml-1">
            {analysis.underassessedComps.length}{' '}
            {isTX ? 'have a lower appraised $/sqft than your property' : 'are assessed at a lower rate than your property'} — flagged in red.
          </span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Address</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">{isTX ? 'Appraised Value' : 'Assessment'}</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">{isTX ? 'SqFt' : 'Market Value'}</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">{isTX ? '$/SqFt' : 'Assess. Ratio'}</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">vs. Yours</th>
              {hasTaxRates && (
                <th className="text-right py-2 px-3 font-semibold text-amber-700">
                  Est. Tax {taxYear ? `(FY${taxYear})` : ''}
                </th>
              )}
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
              <td className="py-2 px-3 text-right text-blue-800">
                {isTX
                  ? (subject.buildingSqft > 0 ? subject.buildingSqft.toLocaleString() : '—')
                  : fmt(subject.fullMarketValue)}
              </td>
              <td className="py-2 px-3 text-right text-blue-800">
                {isTX
                  ? (subjectRatio != null ? `$${subjectRatio.toFixed(2)}` : '—')
                  : `${(subjectRatio * 100).toFixed(1)}%`}
              </td>
              <td className="py-2 px-3 text-right text-blue-800">—</td>
              {hasTaxRates && (
                <td className="py-2 px-3 text-right font-bold text-amber-700">
                  {subjectTaxAmt ? fmt(subjectTaxAmt) : '—'}
                </td>
              )}
            </tr>

            {comps.map((comp, i) => {
              const diff = subjectRatio - comp.assessmentRatio;
              const diffPct = (diff / subjectRatio) * 100;
              const flagged = comp.assessmentRatio < subjectRatio * 0.95;
              const compTaxAmt = compTax(comp);
              const taxDiff = subjectTaxAmt && compTaxAmt ? subjectTaxAmt - compTaxAmt : null;

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
                  <td className="py-2 px-3 text-right text-slate-700">
                    {isTX
                      ? (comp.buildingSqft > 0 ? comp.buildingSqft.toLocaleString() : '—')
                      : fmt(comp.fullMarketValue)}
                  </td>
                  <td className={`py-2 px-3 text-right font-medium ${flagged ? 'text-red-600' : 'text-slate-700'}`}>
                    {isTX
                      ? (comp.assessmentRatio != null ? `$${comp.assessmentRatio.toFixed(2)}` : '—')
                      : `${(comp.assessmentRatio * 100).toFixed(1)}%`}
                  </td>
                  <td className={`py-2 px-3 text-right ${flagged ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {flagged
                      ? `-${diffPct.toFixed(1)}%`
                      : diff < 0
                      ? `+${Math.abs(diffPct).toFixed(1)}%`
                      : 'similar'
                    }
                  </td>
                  {hasTaxRates && (
                    <td className={`py-2 px-3 text-right ${flagged ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {compTaxAmt ? fmt(compTaxAmt) : '—'}
                      {flagged && taxDiff > 0 && (
                        <div className="text-xs text-red-500">you pay {fmt(taxDiff)} more</div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
        {isTX ? (
          <><strong>$/SqFt</strong> = Appraised Value ÷ Building SqFt. Under TX Property Tax Code §41.43, if comparable homes are appraised at a lower $/sqft, you may be entitled to an equal-and-uniform reduction — a key basis for an ARB protest.</>
        ) : (
          <><strong>Assessment Ratio</strong> = Total Assessment ÷ Full Market Value. If comparable homes have a lower ratio, they pay less tax per dollar of market value — a key basis for a grievance complaint.</>
        )}
        {hasTaxRates && (
          <span className="ml-2">
            <strong>Est. Tax</strong> = county + town + school rates × full market value, sourced from NYS Real Property Tax Rates dataset.
          </span>
        )}
      </div>
    </div>
  );
}
