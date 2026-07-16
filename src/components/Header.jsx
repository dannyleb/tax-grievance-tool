export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Property Tax Appeal Tool</h1>
          <p className="text-sm text-slate-500">Find over-assessments and contest your property taxes — all 50 states</p>
        </div>
      </div>

      {/* Step banner */}
      <div className="bg-blue-50 border-t border-blue-100 px-4 py-2">
        <div className="max-w-5xl mx-auto text-sm text-blue-700">
          <strong>How it works:</strong> Select your state &amp; location → Enter your address → See your assessment → Compare to neighbors → File an appeal if over-assessed
        </div>
      </div>
    </header>
  );
}
