"use client";

import { useState } from "react";

interface VersionResult {
  ok: boolean;
  version?: string;
  error?: string;
}
interface CaseLookupResult {
  ok: boolean;
  case?: unknown;
  error?: string;
}

export default function SifTestPage() {
  const [versionResult, setVersionResult] = useState<VersionResult | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);

  const [caseNumber, setCaseNumber] = useState("");
  const [caseLookupResult, setCaseLookupResult] = useState<CaseLookupResult | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);

  async function testConnection() {
    setVersionLoading(true);
    setVersionResult(null);
    const res = await fetch("/api/sif/health");
    const data = await res.json();
    setVersionResult(data);
    setVersionLoading(false);
  }

  async function lookupCase(e: React.FormEvent) {
    e.preventDefault();
    if (!caseNumber.trim()) return;
    setCaseLoading(true);
    setCaseLookupResult(null);
    const res = await fetch("/api/sif/case-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseNumber }),
    });
    const data = await res.json();
    setCaseLookupResult(data);
    setCaseLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">SIF Admin – Testverktøy</h1>

      {/* Connection test */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <h2 className="text-base font-semibold mb-4">Tilkoblingstest</h2>
        <p className="text-sm text-gray-500 mb-4">
          Kaller SupportService/GetSIFVersion for å verifisere at SIF-endepunktet er nåbart og at
          autentiseringen fungerer.
        </p>
        <button
          onClick={testConnection}
          disabled={versionLoading}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {versionLoading ? "Tester…" : "Test tilkobling"}
        </button>

        {versionResult && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm ${
              versionResult.ok
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {versionResult.ok ? (
              <>
                <span className="font-semibold">Tilkobling OK</span>
                {versionResult.version && (
                  <span className="ml-2 text-green-600">– SIF versjon: {versionResult.version}</span>
                )}
              </>
            ) : (
              <>
                <span className="font-semibold">Feil:</span>{" "}
                {versionResult.error}
              </>
            )}
          </div>
        )}
      </div>

      {/* Case lookup */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold mb-4">Saksoppslag</h2>
        <p className="text-sm text-gray-500 mb-4">
          Slå opp en sak i Plan & Build ved hjelp av saksnummer.
          Bruk dette for å verifisere at saksnummer er riktig formatert.
        </p>
        <form onSubmit={lookupCase} className="flex gap-3">
          <input
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="F.eks. 2024/1234"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={caseLoading || !caseNumber.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {caseLoading ? "Søker…" : "Slå opp"}
          </button>
        </form>

        {caseLookupResult && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm ${
              caseLookupResult.ok
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {caseLookupResult.ok ? (
              <>
                <p className="font-semibold mb-2">Sak funnet:</p>
                <pre className="text-xs whitespace-pre-wrap overflow-auto bg-white rounded p-2 text-gray-700">
                  {JSON.stringify(caseLookupResult.case, null, 2)}
                </pre>
              </>
            ) : (
              <>
                <span className="font-semibold">Feil:</span> {caseLookupResult.error}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
