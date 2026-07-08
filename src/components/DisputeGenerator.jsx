import { useState, useRef } from 'react';
import { generateDisputeStatement, hasApiKey } from '../utils/generateDispute';

export default function DisputeGenerator({ parcel, municipality, analysis, subjectTax, comps, canGenerate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef('');

  const apiKeyAvailable = hasApiKey();

  async function handleGenerate() {
    setOpen(true);
    setLoading(true);
    setDone(false);
    setError('');
    textRef.current = '';
    setText('');

    try {
      await generateDisputeStatement({
        parcel,
        municipality,
        analysis,
        subjectTax,
        comps,
        onChunk: (chunk) => {
          textRef.current += chunk;
          setText(textRef.current);
        },
        onDone: () => {
          setDone(true);
          setLoading(false);
        },
      });
    } catch (e) {
      setLoading(false);
      if (e.message === 'NO_API_KEY') {
        setError('API key not configured. See setup instructions below.');
      } else if (e.message === 'NO_CASE') {
        setError('Your property does not appear to be over-assessed relative to comparable properties — no grievance argument can be generated.');
      } else {
        setError(`Generation failed: ${e.message}`);
      }
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(textRef.current);
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Grievance Statement — ${parcel.address}</title>
          <style>
            body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; max-width: 7in; margin: 1in auto; color: #000; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${textRef.current}</pre>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  function handleClose() {
    if (!loading) {
      setOpen(false);
      setText('');
      textRef.current = '';
      setDone(false);
      setError('');
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        title={!canGenerate ? 'No over-assessment detected — grievance statement not applicable' : !apiKeyAvailable ? 'AI features require API key configuration' : ''}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-2.121 1.053 3.75 3.75 0 01-3.254-1.053l-.347-.347z" />
        </svg>
        Generate AI Dispute Statement
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Grievance Statement</h2>
                <p className="text-sm text-slate-500">
                  {parcel.address} &middot; {parcel.municipality}, {parcel.county} County
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {!apiKeyAvailable && !error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
                  <div className="font-semibold mb-1">API Key Required</div>
                  <p>To enable AI generation, add your Anthropic API key as a GitHub Actions secret:</p>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Go to your repo → Settings → Secrets and variables → Actions</li>
                    <li>Add secret: <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> = your key</li>
                    <li>The deploy workflow already passes it as <code className="bg-amber-100 px-1 rounded">VITE_ANTHROPIC_API_KEY</code></li>
                    <li>Re-run the deploy workflow — AI generation will be live</li>
                  </ol>
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-2 text-amber-700 underline font-medium">
                    Get an Anthropic API key →
                  </a>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {(loading || text) && (
                <div className="relative">
                  {/* Context banner */}
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Assessment: <strong>${parcel.assessmentTotal.toLocaleString()}</strong></span>
                    <span>Your ratio: <strong>{(analysis.subjectRatio * 100).toFixed(1)}%</strong></span>
                    <span>Median comp ratio: <strong>{(analysis.medianCompRatio * 100).toFixed(1)}%</strong></span>
                    <span>Over-assessed: <strong>+{analysis.overassessmentPct.toFixed(1)}%</strong></span>
                    {analysis.underassessedComps.length > 0 && (
                      <span><strong>{analysis.underassessedComps.length}</strong> comps with lower rates</span>
                    )}
                    {subjectTax && (
                      <span>Est. tax: <strong>${Math.round(subjectTax.totalTax).toLocaleString()}/yr</strong></span>
                    )}
                  </div>

                  {/* Streaming text */}
                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-48">
                    {text}
                    {loading && (
                      <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                </div>
              )}

              {/* Guidance box */}
              {done && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                  <div className="font-semibold mb-2">How to use this statement</div>
                  <ul className="space-y-1 list-disc ml-4 text-blue-700">
                    <li>Print or copy and attach to your completed <strong>Form RP-524</strong> as supporting documentation</li>
                    <li>Bring printed copies of the <strong>Comparables Table</strong> (available via Download Evidence Package)</li>
                    <li>You may appear at the BAR hearing in person or submit written evidence only</li>
                    <li>Grievance Day is the <strong>4th Tuesday of May</strong> — check your town for exact date</li>
                    <li>If the BAR denies your grievance, file for <strong>SCAR</strong> (~$30 fee, no attorney needed)</li>
                  </ul>
                </div>
              )}

            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {done
                  ? 'Review carefully — AI-generated content should be verified before submission.'
                  : loading
                  ? 'Drafting your statement with Claude AI...'
                  : ''}
              </div>
              <div className="flex gap-2">
                {done && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                    <button
                      onClick={() => { setText(''); textRef.current = ''; setDone(false); handleGenerate(); }}
                      className="px-4 py-2 text-sm font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      Regenerate
                    </button>
                  </>
                )}
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-40 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
