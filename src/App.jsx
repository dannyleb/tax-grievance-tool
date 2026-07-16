import { useState } from 'react';
import Header from './components/Header';
import LocationSelector from './components/LocationSelector';
import AddressSearch from './components/AddressSearch';
import ParcelCard from './components/ParcelCard';
import CompsTable from './components/CompsTable';
import GrievancePanel from './components/GrievancePanel';
import ParcelMap from './components/ParcelMap';
import TownStatsPanel from './components/TownStatsPanel';
import { searchByAddress, getComparables, normalizeParcel, analyzeOverassessment, getTaxRates, calcEstimatedTax } from './api/orpts';
import { txSearchByAddress, txGetComparables, normalizeTxParcel, analyzeTxAppraisal } from './api/tx';
import { getMunicipalities } from './data/swis';

export default function App() {
  const [selectedState, setSelectedState] = useState(null);
  const [county, setCounty] = useState('');      // NY county name
  const [txCounty, setTxCounty] = useState(null); // TX county name
  const [municipality, setMunicipality] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [comps, setComps] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [taxRates, setTaxRates] = useState([]);
  const [subjectTax, setSubjectTax] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetParcelState() {
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);
    setTaxRates([]);
    setSubjectTax(null);
    setError('');
  }

  function handleStateChange(s) {
    setSelectedState(s);
    setCounty('');
    setTxCounty(null);
    setMunicipality(null);
    resetParcelState();
    setStep(1);
  }

  function handleCountyChange(c) {
    setCounty(c);
    setMunicipality(null);
    resetParcelState();
    setStep(1);
  }

  function handleTxCountyChange(c) {
    setTxCounty(c);
    resetParcelState();
    setStep(c ? 2 : 1);
  }

  function handleMunicipalityChange(m) {
    setMunicipality(m);
    resetParcelState();
    setStep(2);
  }

  // ── NY search ──────────────────────────────────────────────────────────────
  async function handleSearch(address) {
    setError('');
    setLoading(true);
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);

    try {
      if (selectedState?.abbr === 'TX') {
        await handleTxSearch(address);
      } else {
        await handleNySearch(address);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleNySearch(address) {
    try {
      const raw = await searchByAddress({ swis: municipality.swis, municipalityName: municipality.name, streetAddress: address });
      if (!raw.length) {
        setError('No parcels found. Try a partial street name (e.g. "Cronin" instead of "123 Cronin Rd").');
        return;
      }
      const seen = new Set();
      const normalized = raw.map(normalizeParcel).filter(p => {
        if (seen.has(p.printKey)) return false;
        seen.add(p.printKey);
        return true;
      });
      setSearchResults(normalized);
      setStep(3);
      if (normalized.length === 1) await doSelectNyParcel(normalized[0]);
    } catch {
      setError('Error connecting to the NY assessment database. Please try again.');
    }
  }

  async function handleTxSearch(address) {
    try {
      const raw = await txSearchByAddress({ county: txCounty, streetAddress: address });
      if (!raw.length) {
        setError('No parcels found. Try a partial street name (e.g. "Main" instead of "123 Main St").');
        return;
      }
      const normalized = raw.map(r => normalizeTxParcel(r, txCounty));
      setSearchResults(normalized);
      setStep(3);
      if (normalized.length === 1) await doSelectTxParcel(normalized[0]);
    } catch (e) {
      if (e.message === 'UNSUPPORTED_COUNTY') {
        setError(`Parcel data for ${txCounty} County is not yet available. Check back soon.`);
      } else {
        setError('Error connecting to the Texas appraisal database. Please try again.');
      }
    }
  }

  // ── NY parcel selection ────────────────────────────────────────────────────
  async function doSelectNyParcel(parcel) {
    setSelectedParcel(parcel);
    setComps([]); setAnalysis(null); setTaxRates([]); setSubjectTax(null);
    setLoading(true); setError('');
    try {
      const [rawComps, rates] = await Promise.all([
        getComparables({ swis: parcel.swis, propertyClass: parcel.propertyClass, fullMarketValue: parcel.fullMarketValue, limit: 30 }),
        getTaxRates(parcel.swis).catch(() => []),
      ]);
      const normalized = rawComps.map(normalizeParcel).filter(c => c.printKey !== parcel.printKey);
      setComps(normalized);
      setTaxRates(rates);
      setSubjectTax(calcEstimatedTax(parcel, rates));
      setAnalysis(analyzeOverassessment(parcel, normalized, municipality.equalizationRate));
      setStep(4);
    } catch {
      setError('Error fetching comparable properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── TX parcel selection ────────────────────────────────────────────────────
  async function doSelectTxParcel(parcel) {
    setSelectedParcel(parcel);
    setComps([]); setAnalysis(null); setTaxRates([]); setSubjectTax(null);
    setLoading(true); setError('');
    try {
      const rawComps = await txGetComparables({
        county: txCounty,
        propid: parcel.printKey,
        propcategorycode: parcel.propertyClass,
        nbhdcode: parcel.neighborhoodCode,
        buildingSqft: parcel.buildingSqft,
        limit: 30,
      });
      const normalized = rawComps.map(r => normalizeTxParcel(r, txCounty));
      setComps(normalized);
      setAnalysis(analyzeTxAppraisal(parcel, normalized));
      setStep(4);
    } catch {
      setError('Error fetching comparable properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectParcel(parcel) {
    if (selectedState?.abbr === 'TX') {
      setLoading(true);
      await doSelectTxParcel(parcel);
    } else {
      setLoading(true);
      await doSelectNyParcel(parcel);
    }
  }

  function handleReset() {
    resetParcelState();
    if (selectedState?.abbr === 'TX') {
      setStep(txCounty ? 2 : 1);
    } else {
      setStep(municipality ? 2 : 1);
    }
  }

  const isTX = selectedState?.abbr === 'TX';
  const isNY = selectedState?.abbr === 'NY';
  const showAddressSearch = isTX
    ? (step >= 2 && txCounty)
    : (step >= 2 && municipality);

  // For TX, municipality-equivalent is the txCounty selection
  const effectiveMunicipality = isTX
    ? (txCounty ? { name: txCounty + ' County, TX', swis: null, equalizationRate: 1.0 } : null)
    : municipality;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <LocationSelector
          selectedState={selectedState}
          county={county}
          municipality={municipality}
          txCounty={txCounty}
          onStateChange={handleStateChange}
          onCountyChange={handleCountyChange}
          onMunicipalityChange={handleMunicipalityChange}
          onTxCountyChange={handleTxCountyChange}
          municipalities={isNY && county ? getMunicipalities(county) : []}
        />

        {showAddressSearch && (
          <AddressSearch
            municipality={effectiveMunicipality}
            selectedState={selectedState}
            onSearch={handleSearch}
            loading={loading}
            onReset={handleReset}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-600">
              {isTX ? 'Querying Collin CAD appraisal database...' : 'Querying NY assessment database...'}
            </span>
          </div>
        )}

        {step === 3 && searchResults.length > 1 && !selectedParcel && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              {searchResults.length} parcels found
            </h2>
            <p className="text-sm text-slate-500 mb-4">Select your property below</p>
            <div className="space-y-2">
              {searchResults.map(p => (
                <button
                  key={p.printKey}
                  onClick={() => handleSelectParcel(p)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-slate-800">{p.address}</div>
                  <div className="text-sm text-slate-500">
                    Owner: {p.ownerName || 'N/A'} &middot; Class: {p.propertyClass} ({p.propertyClassDesc})
                    &middot; {isTX ? 'Appraised' : 'Assessed'}: ${p.assessmentTotal.toLocaleString()}
                    {isTX && p.buildingSqft > 0 && ` · ${p.buildingSqft.toLocaleString()} sqft`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedParcel && !loading && (
          <ParcelCard
            parcel={selectedParcel}
            equalizationRate={isTX ? 1.0 : municipality?.equalizationRate}
            analysis={analysis}
            subjectTax={subjectTax}
            stateAbbr={selectedState?.abbr}
          />
        )}

        {step === 4 && comps.length > 0 && analysis && !loading && (
          <CompsTable
            subject={selectedParcel}
            comps={analysis.compRatios}
            analysis={analysis}
            taxRates={taxRates}
            stateAbbr={selectedState?.abbr}
          />
        )}

        {step === 4 && !loading && (
          <ParcelMap parcel={selectedParcel} comps={analysis?.compRatios || []} />
        )}

        {step === 4 && !loading && !isTX && (
          <TownStatsPanel parcel={selectedParcel} municipality={municipality} />
        )}

        {step === 4 && analysis && !loading && (
          <GrievancePanel
            parcel={selectedParcel}
            municipality={effectiveMunicipality}
            analysis={analysis}
            comps={comps}
            subjectTax={subjectTax}
            stateInfo={selectedState}
          />
        )}
      </main>

      <footer className="text-center text-sm text-slate-400 py-8 border-t border-slate-200 mt-12">
        {isNY ? (
          <>
            Data sourced from NYS ORPTS Assessment Roll via{' '}
            <a href="https://data.ny.gov" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">data.ny.gov</a>
            {' '}&middot;{' '}
            <a href="https://www.tax.ny.gov/pit/property/contest/contestasmt.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Official NY Grievance Info</a>
          </>
        ) : isTX ? (
          <>
            Collin County data sourced from{' '}
            <a href="https://data.texas.gov" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">data.texas.gov</a>
            {' '}(Collin Central Appraisal District) &middot;{' '}
            <a href="https://comptroller.texas.gov/taxes/property-tax/protest/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">TX ARB Protest Info</a>
          </>
        ) : (
          'Property tax appeal data compiled from official state sources.'
        )}
        {' '}&middot; Not legal advice
      </footer>
    </div>
  );
}
