import { useState, useRef, useEffect } from 'react';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function fetchSuggestions(query, stateName, municipalityName) {
  // Scope query to the selected municipality + state for relevance
  const scoped = `${query}, ${municipalityName}, ${stateName}`;
  const params = new URLSearchParams({
    q: scoped,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'us',
    limit: '6',
  });
  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'Accept-Language': 'en-US,en' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  // Filter to results that look like street addresses (have a road component)
  return data
    .filter(r => r.address?.road)
    .map(r => {
      const a = r.address;
      const num = a.house_number ? `${a.house_number} ` : '';
      const road = a.road || '';
      return `${num}${road}`;
    })
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
}

export default function AddressSearch({ municipality, selectedState, onSearch, loading, onReset }) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setAddress(val);
    setActiveSuggestion(-1);

    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(
          val,
          selectedState?.name || 'New York',
          municipality?.name || ''
        );
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        // Silently fail — user can still type manually
      }
    }, 450);
  }

  function pickSuggestion(suggestion) {
    setAddress(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveSuggestion(-1);
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setShowDropdown(false);
    if (address.trim()) onSearch(address.trim());
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">2</span>
        <h2 className="text-lg font-semibold text-slate-800">Find Your Property</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative" ref={containerRef}>
          <input
            type="text"
            value={address}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={`Street address in ${municipality.name} (e.g. "123 Main St")`}
            autoComplete="off"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />

          {/* Autocomplete dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={() => pickSuggestion(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                      i === activeSuggestion
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {s}
                  </button>
                </li>
              ))}
              <li className="px-4 py-1.5 text-xs text-slate-400 border-t border-slate-100">
                Address suggestions via OpenStreetMap
              </li>
            </ul>
          )}

          <p className="mt-1.5 text-xs text-slate-400">
            Type to see address suggestions, or enter a partial street name (e.g. "Cronin")
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={() => { setAddress(''); setSuggestions([]); setShowDropdown(false); onReset(); }}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors shrink-0"
        >
          Reset
        </button>
      </form>
    </div>
  );
}
