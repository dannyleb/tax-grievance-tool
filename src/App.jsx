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
import { getMunicipalities } from './data/swis';

export default function App() {
  const [county, setCounty] = useState('');
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

  function handleCountyChange(c) {
    setCounty(c);
    setMunicipality(null);
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);
    setTaxRates([]);
    setSubjectTax(null);
    setStep(1);
  }

  function handleMunicipalityChange(m) {
    setMunicipality(m);
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);
    setTaxRates([]);
    setSubjectTax(null);
    setStep(2);
  }

  async function handleSearch(address) {
    setError('');
    setLoading(true);
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);
    try {
      const raw = await searchByAddress({ swis: municipality.swis, municipalityName: municipality.name, streetAddress: address });
      if (!raw.length) {
        setError('No parcels found. Try a partial street name (e.g. "Cronin" instead of "123 Cronin Rd").');
      } else {
        // Dedupe by print_key_code — same parcel appears under multiple SWIS
        // sub-jurisdictions (village codes + TOV code) in the ORPTS dataset
        const seen = new Set();
        const normalized = raw.map(normalizeParcel).filter(p => {
          if (seen.has(p.printKey)) return false;
          seen.add(p.printKey);
          return true;
        });
        setSearchResults(normalized);
        setStep(3);
        if (normalized.length === 1) {
          await doSelectParcel(normalized[0]);
        }
      }
    } catch (e) {
      setError('Error connecting to the NY assessment database. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function doSelectParcel(parcel) {
    setSelectedParcel(parcel);
    setComps([]);
    setAnalysis(null);
    setTaxRates([]);
    setSubjectTax(null);
    setLoading(true);
    setError('');
    try {
      const [rawComps, rates] = await Promise.all([
        getComparables({
          swis: parcel.swis,
          propertyClass: parcel.propertyClass,
          fullMarketValue: parcel.fullMarketValue,
          limit: 30,
        }),
        getTaxRates(parcel.swis).catch(() => []),
      ]);

      const normalized = rawComps
        .map(normalizeParcel)
        .filter(c => c.printKey !== parcel.printKey);
      setComps(normalized);
      setTaxRates(rates);
      setSubjectTax(calcEstimatedTax(parcel, rates));

      const result = analyzeOverassessment(parcel, normalized, municipality.equalizationRate);
      setAnalysis(result);
      setStep(4);
    } catch (e) {
      setError('Error fetching comparable properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectParcel(parcel) {
    await doSelectParcel(parcel);
  }

  function handleReset() {
    setSearchResults([]);
    setSelectedParcel(null);
    setComps([]);
    setAnalysis(null);
    setError('');
    setStep(municipality ? 2 : 1);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <LocationSelector
          county={county}
          municipality={municipality}
          onCountyChange={handleCountyChange}
          onMunicipalityChange={handleMunicipalityChange}
          municipalities={county ? getMunicipalities(county) : []}
        />

        {step >= 2 && municipality && (
          <AddressSearch
            municipality={municipality}
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
            <span className="ml-3 text-slate-600">Querying NY State assessment database...</span>
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
                    Owner: {p.ownerName || 'N/A'} &middot; Class: {p.propertyClass} ({p.propertyClassDesc}) &middot; Assessed: ${p.assessmentTotal.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedParcel && !loading && (
          <ParcelCard
            parcel={selectedParcel}
            equalizationRate={municipality.equalizationRate}
            analysis={analysis}
            subjectTax={subjectTax}
          />
        )}

        {step === 4 && comps.length > 0 && analysis && !loading && (
          <CompsTable
            subject={selectedParcel}
            comps={analysis.compRatios}
            analysis={analysis}
            taxRates={taxRates}
          />
        )}

        {step === 4 && !loading && (
          <ParcelMap parcel={selectedParcel} comps={analysis?.compRatios || []} />
        )}

        {step === 4 && !loading && (
          <TownStatsPanel parcel={selectedParcel} municipality={municipality} />
        )}

        {step === 4 && analysis && !loading && (
          <GrievancePanel
            parcel={selectedParcel}
            municipality={municipality}
            analysis={analysis}
            comps={comps}
          />
        )}
      </main>

      <footer className="text-center text-sm text-slate-400 py-8 border-t border-slate-200 mt-12">
        Data sourced from NYS ORPTS Assessment Roll via{' '}
        <a href="https://data.ny.gov" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">data.ny.gov</a>
        {' '}&middot;{' '}
        <a href="https://www.tax.ny.gov/pit/property/contest/contestasmt.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
          Official NY Grievance Info
        </a>
        {' '}&middot; Not legal advice
      </footer>
    </div>
  );
}
