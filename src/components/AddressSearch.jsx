import { useState } from 'react';

export default function AddressSearch({ municipality, onSearch, loading, onReset }) {
  const [address, setAddress] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (address.trim()) onSearch(address.trim());
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">2</span>
        <h2 className="text-lg font-semibold text-slate-800">Find Your Property</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={`Street address in ${municipality.name} (e.g. "123 Main St" or just "Main")`}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-slate-400">
            Tip: partial street names work — try "Cronin" instead of "123 Cronin Road"
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={() => { setAddress(''); onReset(); }}
          className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors shrink-0"
        >
          Reset
        </button>
      </form>
    </div>
  );
}
