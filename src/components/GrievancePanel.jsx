import { getGrievanceDay } from '../data/swis';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

export default function GrievancePanel({ parcel, municipality, analysis }) {
  const grievanceDay = getGrievanceDay();
  const nextYear = getGrievanceDay(new Date().getFullYear() + 1);
  const today = new Date();
  const isPastDeadline = today > grievanceDay;
  const deadlineDate = isPastDeadline ? nextYear : grievanceDay;

  const rp524Url = 'https://www.tax.ny.gov/pdf/current_forms/orpts/rp524_fill_in.pdf';
  const scarUrl = 'https://www.nycourts.gov/small-claims-assessment-review-scar';
  const halfmoonGrievanceUrl = 'https://www.townofhalfmoon-ny.gov/grievance';

  function formatDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
        <h2 className="text-lg font-semibold text-slate-800">Grievance Guide</h2>
      </div>

      {/* Deadline banner */}
      <div className={`rounded-lg p-4 mb-5 ${isPastDeadline ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <svg className={`w-5 h-5 mt-0.5 shrink-0 ${isPastDeadline ? 'text-orange-500' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <div className="font-semibold text-slate-800">
              {isPastDeadline ? 'This year\'s Grievance Day has passed' : 'Upcoming Grievance Day'}
            </div>
            <div className="text-sm text-slate-600 mt-0.5">
              <strong>{formatDate(deadlineDate)}</strong>
              {isPastDeadline && ' — next filing opportunity'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Grievance Day is the 4th Tuesday of May in most NY jurisdictions. Verify your local deadline with {municipality.name}.
            </div>
          </div>
        </div>
      </div>

      {/* Verdict callout */}
      {analysis.hasCase && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
          <div className="font-semibold text-red-800 mb-1">You likely have grounds for a grievance</div>
          <p className="text-sm text-red-700">
            Your property is assessed at a <strong>{analysis.overassessmentPct.toFixed(1)}% higher ratio</strong> than
            comparable properties in {municipality.name}. Under NY Real Property Tax Law,
            you can file a grievance claiming <em>unequal assessment</em> — meaning your
            assessment is a higher percentage of market value than the median of comparable properties.
          </p>
          {analysis.potentialSavings > 0 && (
            <div className="mt-2 text-sm font-medium text-red-800">
              Estimated annual tax savings if successful: ~{fmt(analysis.potentialSavings)}
            </div>
          )}
        </div>
      )}

      {analysis.borderline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
          <div className="font-semibold text-yellow-800 mb-1">Borderline — gather more evidence</div>
          <p className="text-sm text-yellow-700">
            Your assessment ratio is slightly above the median comp but under the typical 5% threshold
            assessors use. Consider getting a private appraisal to strengthen your case.
          </p>
        </div>
      )}

      {/* Steps */}
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Filing Steps</h3>
      <div className="space-y-3 mb-6">
        <Step n={1} title="Download and fill out RP-524">
          The Complaint on Real Property Assessment form. Pre-fill with your parcel data from this tool.
          <div className="mt-1.5">
            <a href={rp524Url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
              Download RP-524 Form (PDF) →
            </a>
          </div>
        </Step>

        <Step n={2} title="Gather your evidence">
          Print the comps table above. Highlight properties with lower assessment ratios.
          If you have a recent appraisal or recent sale price, include that too.
        </Step>

        <Step n={3} title="File by Grievance Day">
          Submit RP-524 to your local <strong>Board of Assessment Review (BAR)</strong> by the deadline.
          Most towns accept in-person, mail, or online submission.
          {municipality.swis === '412689' && (
            <div className="mt-1.5">
              <a href={halfmoonGrievanceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Town of Halfmoon Grievance Info →
              </a>
            </div>
          )}
        </Step>

        <Step n={4} title="Attend your hearing (optional)">
          You may appear before the Board or submit written evidence only. The Board will mail their decision within ~2 months.
        </Step>

        <Step n={5} title="If denied — file for SCAR">
          Small Claims Assessment Review (SCAR) is a low-cost court option (~$30 filing fee)
          for 1-4 family homes. No attorney required.
          <div className="mt-1.5">
            <a href={scarUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
              SCAR Filing Info →
            </a>
          </div>
        </Step>
      </div>

      {/* Pre-fill summary for RP-524 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-sm font-semibold text-slate-700 mb-2">RP-524 Pre-Fill Reference</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <Field label="Property Address" value={parcel.address} />
          <Field label="Municipality" value={parcel.municipality} />
          <Field label="County" value={parcel.county} />
          <Field label="School District" value={parcel.schoolDistrict} />
          <Field label="Tax Map / Print Key" value={parcel.printKey} />
          <Field label="Property Class" value={`${parcel.propertyClass} — ${parcel.propertyClassDesc}`} />
          <Field label="Total Assessment" value={fmt(parcel.assessmentTotal)} />
          <Field label="Your Contested Value" value="Enter your estimated market value" placeholder />
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Copy these values into RP-524 Section 1. For contested value (Section 3), use a recent sale price,
          independent appraisal, or the median comparable market value shown above.
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400 text-center">
        This tool provides information only and does not constitute legal advice.
        Consult a real estate attorney or assessor for complex cases.
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex items-start pt-0.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
          {n}
        </span>
      </div>
      <div>
        <div className="font-medium text-slate-800 text-sm">{title}</div>
        <div className="text-sm text-slate-600 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className={placeholder ? 'italic text-slate-400' : 'font-medium text-slate-800'}>{value}</span>
    </div>
  );
}
