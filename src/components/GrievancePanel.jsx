import { getGrievanceDay } from '../data/swis';
import DownloadButton from './DownloadButton';
import DisputeGenerator from './DisputeGenerator';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

export default function GrievancePanel({ parcel, municipality, analysis, comps, subjectTax, stateInfo }) {
  const isTX = stateInfo?.abbr === 'TX';
  const isIL = stateInfo?.abbr === 'IL';
  const isWA = stateInfo?.abbr === 'WA';
  const isFL = stateInfo?.abbr === 'FL';
  const isPA = stateInfo?.abbr === 'PA';

  const grievanceDay = getGrievanceDay();
  const nextYear = getGrievanceDay(new Date().getFullYear() + 1);
  const today = new Date();
  const isPastDeadline = today > grievanceDay;
  const deadlineDate = isPastDeadline ? nextYear : grievanceDay;

  const rp524Url = 'https://www.tax.ny.gov/pdf/current_forms/orpts/rp524_fill_in.pdf';
  const scarUrl = 'https://www.nycourts.gov/small-claims-assessment-review-scar';
  const halfmoonGrievanceUrl = 'https://www.townofhalfmoon-ny.gov/grievance';
  const txProtestUrl = 'https://comptroller.texas.gov/taxes/property-tax/protest/';
  const txForm50132Url = 'https://comptroller.texas.gov/forms/50-132.pdf';

  function formatDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ── Texas protest panel ──────────────────────────────────────────────────
  if (isTX) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
          <h2 className="text-lg font-semibold text-slate-800">Protest Guide (Texas ARB)</h2>
        </div>

        {/* Deadline banner */}
        <div className="rounded-lg p-4 mb-5 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-semibold text-slate-800">Filing Deadline</div>
              <div className="text-sm text-slate-600 mt-0.5"><strong>May 15</strong>, or 30 days after your Notice of Appraised Value is mailed — whichever is later.</div>
              <div className="text-xs text-slate-500 mt-1">Check the date on your notice. If you didn't receive one, contact your county CAD.</div>
            </div>
          </div>
        </div>

        {/* Verdict */}
        {analysis.hasCase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <div className="font-semibold text-red-800 mb-1">You likely have grounds for an equal-and-uniform protest</div>
            <p className="text-sm text-red-700">
              Your property is appraised at <strong>${analysis.subjectRatio?.toFixed(2)}/sqft</strong>, which is{' '}
              <strong>{analysis.overassessmentPct.toFixed(1)}% higher</strong> than the median comparable property
              in your neighborhood (${analysis.medianCompRatio?.toFixed(2)}/sqft).
              Under Texas Property Tax Code §41.43, you can protest claiming <em>unequal appraisal</em>.
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
              Your $/sqft is slightly above the median but within a typical 5% tolerance.
              Consider getting a private appraisal or comparing more recent sales in your neighborhood to strengthen your case.
            </p>
          </div>
        )}

        {/* AI Dispute Generator */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-purple-900 mb-1">Generate AI Protest Statement</div>
              <p className="text-sm text-purple-700">
                Draft a formal written argument for your ARB hearing based on your appraisal data and comparable properties.
              </p>
            </div>
            <div className="shrink-0">
              <DisputeGenerator
                parcel={parcel}
                municipality={municipality}
                analysis={analysis}
                subjectTax={subjectTax}
                comps={comps}
                canGenerate={analysis.hasCase || analysis.borderline}
                stateInfo={stateInfo}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Protest Steps</h3>
        <div className="space-y-3 mb-6">
          <Step n={1} title="File Form 50-132 (Notice of Protest)">
            Submit to your County Appraisal District by the deadline. You can file online, by mail, or in person.
            <div className="mt-1.5">
              <a href={txForm50132Url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Download Form 50-132 (PDF) →
              </a>
            </div>
          </Step>
          <Step n={2} title="Gather your evidence">
            Print the comparable properties table above. Highlight homes with lower $/sqft appraisals.
            Recent sale prices or a private appraisal can also support your case.
          </Step>
          <Step n={3} title="Informal hearing (optional but recommended)">
            Most CADs offer an informal meeting with an appraiser before your formal ARB hearing.
            Often the fastest path to a reduction — bring your comps.
          </Step>
          <Step n={4} title="Formal ARB hearing">
            Present your evidence to the Appraisal Review Board (3 citizen members).
            You may appear in person, by affidavit, or by telephone. No attorney required.
          </Step>
          <Step n={5} title="If denied — binding arbitration or district court">
            For properties ≤ $5M: file for binding arbitration (~$450 fee, refunded if you win).
            For larger properties or as alternative: file suit in district court.
            <div className="mt-1.5">
              <a href={txProtestUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                TX Comptroller ARB Protest Guide →
              </a>
            </div>
          </Step>
        </div>

        {/* Pre-fill reference */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">Form 50-132 Reference Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="Property Address" value={parcel.address} />
            <Field label="County" value={parcel.county + ' County'} />
            <Field label="Property ID / Account" value={parcel.printKey} />
            <Field label="Property Class" value={`${parcel.propertyClass} — ${parcel.propertyClassDesc}`} />
            <Field label="Appraised Value" value={fmt(parcel.assessmentTotal)} />
            <Field label="Your Proposed Value" value="Enter your estimate based on comps" placeholder />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Select protest reason: <em>"Value is over market value"</em> and/or <em>"Value is unequal compared with other properties."</em>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400 text-center">
          This tool provides information only and does not constitute legal advice.
          Consult a property tax consultant or attorney for complex cases.
        </div>
      </div>
    );
  }

  // ── Illinois (Cook County) appeal panel ─────────────────────────────────
  if (isIL) {
    const borUrl = 'https://www.cookcountyboardofreview.com/';
    const ptabUrl = 'https://www.illinois.gov/agencies/ptab/';
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
          <h2 className="text-lg font-semibold text-slate-800">Appeal Guide (Cook County Board of Review)</h2>
        </div>

        <div className="rounded-lg p-4 mb-5 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-semibold text-slate-800">Filing Window</div>
              <div className="text-sm text-slate-600 mt-0.5">
                The Board of Review opens a <strong>30–90 day appeal window</strong> after the Assessor mails reassessment notices (typically Aug–Nov, rotating by township each year).
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Check <a href={borUrl} target="_blank" rel="noopener noreferrer" className="underline">cookcountyboardofreview.com</a> for your township's current filing dates.
              </div>
            </div>
          </div>
        </div>

        {analysis.hasCase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <div className="font-semibold text-red-800 mb-1">You likely have grounds for an unequal assessment appeal</div>
            <p className="text-sm text-red-700">
              Your property is assessed at <strong>${analysis.subjectRatio?.toFixed(2)}/sqft</strong>, which is{' '}
              <strong>{analysis.overassessmentPct.toFixed(1)}% higher</strong> than the median comparable
              ({analysis.medianCompRatio?.toFixed(2)}/sqft) in your neighborhood.
              Under Illinois Property Tax Code (35 ILCS 200/16-185), you can appeal on the basis of <em>overvaluation or lack of uniformity</em>.
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
              Your assessment is slightly above the median comp. Consider a recent sale price or
              independent appraisal to strengthen your case.
            </p>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-purple-900 mb-1">Generate AI Appeal Statement</div>
              <p className="text-sm text-purple-700">
                Draft a formal written argument for your Board of Review hearing based on your assessment data and comparable properties.
              </p>
            </div>
            <div className="shrink-0">
              <DisputeGenerator
                parcel={parcel}
                municipality={municipality}
                analysis={analysis}
                subjectTax={subjectTax}
                comps={comps}
                canGenerate={analysis.hasCase || analysis.borderline}
                stateInfo={stateInfo}
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Appeal Steps</h3>
        <div className="space-y-3 mb-6">
          <Step n={1} title="File with the Cook County Board of Review">
            File online at the Board of Review portal during your township's open window.
            No fee required. You may also mail or appear in person.
            <div className="mt-1.5">
              <a href={borUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Cook County Board of Review →
              </a>
            </div>
          </Step>
          <Step n={2} title="Submit your comparable evidence">
            Upload the comps table from this tool. The Board weighs $/sqft uniformity heavily —
            highlight properties with lower assessed values per sqft in the same neighborhood.
          </Step>
          <Step n={3} title="Attend your hearing (optional)">
            Hearings are typically by phone or video. Present your evidence. Decisions are mailed within a few months.
          </Step>
          <Step n={4} title="If denied — file with the IL Property Tax Appeal Board (PTAB)">
            PTAB is the state-level next step. File within 30 days of the Board of Review decision. Low cost, no attorney required for residential.
            <div className="mt-1.5">
              <a href={ptabUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                IL Property Tax Appeal Board →
              </a>
            </div>
          </Step>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">Appeal Form Reference Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="Property Address" value={parcel.address} />
            <Field label="PIN" value={parcel.printKey} />
            <Field label="Property Class" value={`${parcel.propertyClass} — ${parcel.propertyClassDesc}`} />
            <Field label="Neighborhood Code" value={parcel.neighborhoodCode || 'N/A'} />
            <Field label="Assessed Value" value={fmt(parcel.assessmentTotal)} />
            <Field label="Your Proposed Value" value="Enter your estimate based on comps" placeholder />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            IL properties are assessed at ~10% of market value. Select appeal basis: <em>"Overvaluation"</em> and/or <em>"Lack of uniformity."</em>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400 text-center">
          This tool provides information only and does not constitute legal advice.
          Consult a property tax attorney or certified assessor for complex cases.
        </div>
      </div>
    );
  }

  // ── Florida VAB panel ────────────────────────────────────────────────────
  if (isFL) {
    const vabUrl   = 'https://floridarevenue.com/property/Pages/Taxpayers_VAB.aspx';
    const dr486Url = 'https://floridarevenue.com/property/Documents/dr486.pdf';
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
          <h2 className="text-lg font-semibold text-slate-800">Appeal Guide (Florida Value Adjustment Board)</h2>
        </div>

        <div className="rounded-lg p-4 mb-5 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-semibold text-slate-800">Filing Deadline</div>
              <div className="text-sm text-slate-600 mt-0.5">
                <strong>September 18</strong> or within <strong>25 days of your TRIM notice</strong> — whichever is later.
              </div>
              <div className="text-xs text-slate-500 mt-1">
                TRIM (Truth in Millage) notices are typically mailed in August. File with your <strong>county Value Adjustment Board</strong>.
              </div>
            </div>
          </div>
        </div>

        {analysis.hasCase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <div className="font-semibold text-red-800 mb-1">You likely have grounds for a just value appeal</div>
            <p className="text-sm text-red-700">
              Your property has a just value of <strong>${analysis.subjectRatio?.toFixed(2)}/sqft</strong>, which is{' '}
              <strong>{analysis.overassessmentPct.toFixed(1)}% higher</strong> than comparable properties in {parcel.municipality}
              ({analysis.medianCompRatio?.toFixed(2)}/sqft median).
              Under FL Statute §194.011, you may petition the VAB to reduce the just value to reflect market value or equal treatment.
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
              Your just value is slightly above the median comp. A recent independent appraisal or
              recent sale price documentation would strengthen your petition.
            </p>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-purple-900 mb-1">Generate AI Petition Statement</div>
              <p className="text-sm text-purple-700">
                Draft a formal written argument for your VAB hearing based on your just value and comparable property data.
              </p>
            </div>
            <div className="shrink-0">
              <DisputeGenerator
                parcel={parcel}
                municipality={municipality}
                analysis={analysis}
                subjectTax={subjectTax}
                comps={comps}
                canGenerate={analysis.hasCase || analysis.borderline}
                stateInfo={stateInfo}
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Petition Steps</h3>
        <div className="space-y-3 mb-6">
          <Step n={1} title="File Form DR-486 (Petition to VAB)">
            File with your county Clerk of the VAB by the deadline. Most counties accept online filing through the county property appraiser's website.
            <div className="mt-1.5">
              <a href={dr486Url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Download Form DR-486 (PDF) →
              </a>
            </div>
          </Step>
          <Step n={2} title="Gather your evidence">
            Print the comparable properties table above. You may also use recent sale prices of similar homes, an independent appraisal, or evidence of physical condition issues.
          </Step>
          <Step n={3} title="Attend your VAB hearing">
            A special magistrate (independent appraiser or attorney) reviews your evidence.
            You may appear in person, by phone, or submit written evidence. No attorney required.
          </Step>
          <Step n={4} title="If denied — file in Circuit Court">
            You have 60 days from the VAB's final decision to file in Circuit Court under FL Statute §194.171.
            <div className="mt-1.5">
              <a href={vabUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                FL DOR VAB Taxpayer Guide →
              </a>
            </div>
          </Step>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">DR-486 Pre-Fill Reference Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="Property Address" value={parcel.address} />
            <Field label="City" value={parcel.municipality} />
            <Field label="Parcel ID" value={parcel.printKey} />
            <Field label="DOR Use Code" value={`${parcel.propertyClass} — ${parcel.propertyClassDesc}`} />
            <Field label="Just Value (Current)" value={fmt(parcel.assessmentTotal)} />
            <Field label="Your Proposed Just Value" value="Enter your estimate based on comps or appraisal" placeholder />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Select petition type: <em>"Just Value"</em> and/or <em>"Denial of Exemption."</em>
            If you have a homestead exemption issue, select the appropriate exemption type on DR-486.
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400 text-center">
          This tool provides information only and does not constitute legal advice.
          Consult a property tax attorney or Florida-licensed appraiser for complex cases.
        </div>
      </div>
    );
  }

  // ── Pennsylvania (Philadelphia) appeal panel ─────────────────────────────
  if (isPA) {
    const boaUrl = 'https://www.phila.gov/departments/board-of-revision-of-taxes/';
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
          <h2 className="text-lg font-semibold text-slate-800">Appeal Guide (Philadelphia Board of Revision of Taxes)</h2>
        </div>

        <div className="rounded-lg p-4 mb-5 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-semibold text-slate-800">Filing Deadline</div>
              <div className="text-sm text-slate-600 mt-0.5">
                <strong>October 1</strong> of the year before the tax year — e.g., file by October 1, 2025 to appeal 2026 taxes.
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Philadelphia's BRT handles first-level appeals. Assessed value = market value (100% ratio since 2014).
              </div>
            </div>
          </div>
        </div>

        {analysis.hasCase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <div className="font-semibold text-red-800 mb-1">You likely have grounds for an assessment appeal</div>
            <p className="text-sm text-red-700">
              Your property is assessed at <strong>${analysis.subjectRatio?.toFixed(2)}/sqft</strong>, which is{' '}
              <strong>{analysis.overassessmentPct.toFixed(1)}% higher</strong> than comparable properties in ZIP {parcel.neighborhoodCode}
              ({analysis.medianCompRatio?.toFixed(2)}/sqft median).
              Under PA Consolidated Statutes Title 53 §8854, you may appeal claiming the assessment exceeds market value or is non-uniform.
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
              Your $/sqft is slightly above the median. A recent sale price or independent appraisal will strengthen your appeal significantly.
            </p>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-purple-900 mb-1">Generate AI Appeal Statement</div>
              <p className="text-sm text-purple-700">
                Draft a formal written argument for your BRT hearing based on your assessment data and comparable properties.
              </p>
            </div>
            <div className="shrink-0">
              <DisputeGenerator
                parcel={parcel}
                municipality={municipality}
                analysis={analysis}
                subjectTax={subjectTax}
                comps={comps}
                canGenerate={analysis.hasCase || analysis.borderline}
                stateInfo={stateInfo}
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Appeal Steps</h3>
        <div className="space-y-3 mb-6">
          <Step n={1} title="File with the Board of Revision of Taxes (BRT)">
            File online at phila.gov/brt or by mail. No filing fee. Deadline is October 1.
            <div className="mt-1.5">
              <a href={boaUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                Philadelphia BRT Appeal Portal →
              </a>
            </div>
          </Step>
          <Step n={2} title="Submit comparable sales evidence">
            Upload the comps table from this tool. The BRT weighs recent arm's-length sales of similar properties heavily.
            Highlight $/sqft disparities and any sales below assessed value.
          </Step>
          <Step n={3} title="Attend your BRT hearing">
            Hearings are typically conducted by a hearing officer. Present your evidence and proposed value.
            Decisions are mailed within a few months.
          </Step>
          <Step n={4} title="If denied — appeal to Common Pleas Court">
            File within 30 days of the BRT decision in the Philadelphia Court of Common Pleas.
            An attorney is recommended at this stage.
          </Step>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">BRT Appeal Reference Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="Property Address" value={parcel.address} />
            <Field label="OPA Account #" value={parcel.printKey} />
            <Field label="ZIP Code" value={parcel.neighborhoodCode} />
            <Field label="Building Type" value={parcel.propertyClass} />
            <Field label="Market Value (Current)" value={fmt(parcel.assessmentTotal)} />
            <Field label="Your Proposed Value" value="Enter your estimate based on comps or recent sale" placeholder />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Philadelphia assesses at 100% of market value. Your proposed value should be the true market value supported by comparable sales or a licensed appraisal.
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400 text-center">
          This tool provides information only and does not constitute legal advice.
          Consult a property tax attorney or certified appraiser for complex cases.
        </div>
      </div>
    );
  }

  // ── Washington (King County) appeal panel ───────────────────────────────
  if (isWA) {
    const boeUrl = 'https://www.kingcounty.gov/en/dept/assessor/buildings-and-your-property/appeal-your-property-value';
    const stbaUrl = 'https://www.bta.wa.gov/';
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">5</span>
          <h2 className="text-lg font-semibold text-slate-800">Appeal Guide (King County Board of Equalization)</h2>
        </div>

        <div className="rounded-lg p-4 mb-5 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-semibold text-slate-800">Filing Deadline</div>
              <div className="text-sm text-slate-600 mt-0.5">
                <strong>July 1</strong>, or within <strong>60 days</strong> of the mailing of your Change of Value notice — whichever is later.
              </div>
              <div className="text-xs text-slate-500 mt-1">
                WA assesses at 100% of market value annually. If you received a Change of Value notice, the 60-day window from that date may apply.
              </div>
            </div>
          </div>
        </div>

        {analysis.hasCase && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <div className="font-semibold text-red-800 mb-1">You likely have grounds for a value appeal</div>
            <p className="text-sm text-red-700">
              Your property is appraised at <strong>${analysis.subjectRatio?.toFixed(2)}/lot sqft</strong>, which is{' '}
              <strong>{analysis.overassessmentPct.toFixed(1)}% higher</strong> than the median comparable
              ({analysis.medianCompRatio?.toFixed(2)}/lot sqft) in {parcel.municipality}.
              Under RCW 84.48.010, you can appeal claiming the assessed value exceeds true market value or is unequal compared to similar properties.
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
              Your $/lot sqft is slightly above the median. A recent sale price, independent appraisal,
              or evidence of physical condition issues would strengthen your appeal.
            </p>
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-purple-900 mb-1">Generate AI Appeal Statement</div>
              <p className="text-sm text-purple-700">
                Draft a formal written argument for your BOE hearing based on your appraisal data and comparable properties.
              </p>
            </div>
            <div className="shrink-0">
              <DisputeGenerator
                parcel={parcel}
                municipality={municipality}
                analysis={analysis}
                subjectTax={subjectTax}
                comps={comps}
                canGenerate={analysis.hasCase || analysis.borderline}
                stateInfo={stateInfo}
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Appeal Steps</h3>
        <div className="space-y-3 mb-6">
          <Step n={1} title="File a petition with the King County Board of Equalization">
            File online, by mail, or in person at the BOE office. No fee required.
            Include your parcel number, the current assessed value, and your proposed value.
            <div className="mt-1.5">
              <a href={boeUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                King County BOE Appeal Info →
              </a>
            </div>
          </Step>
          <Step n={2} title="Gather your evidence">
            Print the comparable properties table from this tool. Highlight homes with lower $/lot sqft appraisals.
            Recent sale prices (within 12 months of Jan 1 assessment date) are the strongest evidence.
          </Step>
          <Step n={3} title="BOE hearing">
            Hearings are typically in-person or by phone. The BOE will review your evidence and issue a written decision.
            No attorney is required; you may bring a representative.
          </Step>
          <Step n={4} title="If denied — appeal to the WA State Board of Tax Appeals">
            File within 30 days of the BOE decision. The BTA provides an independent review. Filing fee applies.
            <div className="mt-1.5">
              <a href={stbaUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                WA Board of Tax Appeals →
              </a>
            </div>
          </Step>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">BOE Petition Reference Data</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="Property Address" value={parcel.address} />
            <Field label="Parcel (PIN)" value={parcel.printKey} />
            <Field label="City" value={parcel.municipality} />
            <Field label="Property Use" value={`${parcel.propertyClass} — ${parcel.propertyClassDesc}`} />
            <Field label="Assessed Value" value={fmt(parcel.assessmentTotal)} />
            <Field label="Your Proposed Value" value="Enter your estimate based on comps or recent sale" placeholder />
          </div>
          <div className="mt-3 text-xs text-slate-400">
            WA assesses at 100% of market value. Your proposed value should be supported by comparable sales or an independent appraisal.
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400 text-center">
          This tool provides information only and does not constitute legal advice.
          Consult a property tax attorney or certified appraiser for complex cases.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
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

      {/* AI Dispute Generator */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-2.121 1.053 3.75 3.75 0 01-3.254-1.053l-.347-.347z" />
              </svg>
              Generate AI Dispute Statement
            </div>
            <p className="text-sm text-purple-700">
              Uses your assessment data, comparables, and tax figures to draft a formal written
              statement for the Board of Assessment Review — ready to attach to Form RP-524 or
              present at your hearing.
            </p>
          </div>
          <div className="shrink-0">
            <DisputeGenerator
              parcel={parcel}
              municipality={municipality}
              analysis={analysis}
              subjectTax={subjectTax}
              comps={comps}
              canGenerate={analysis.hasCase || analysis.borderline}
            />
          </div>
        </div>
      </div>

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

      {/* Download */}
      <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">Ready to file?</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Download a 3-page PDF evidence package: property data, RP-524 pre-fill reference, and full comps table.
          </div>
        </div>
        <div className="shrink-0">
          <DownloadButton
            parcel={parcel}
            municipality={municipality}
            analysis={analysis}
            comps={comps}
          />
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
