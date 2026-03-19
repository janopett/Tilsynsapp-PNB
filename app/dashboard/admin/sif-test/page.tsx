"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

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
interface RawDebugResult {
  ok: boolean;
  raw?: unknown;
  error?: string;
}

function CopyableJson({ data, ok }: { data: unknown; ok: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          onClick={copy}
          className="text-xs px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition"
        >
          {copied ? "Kopiert!" : "Kopier"}
        </button>
      </div>
      <pre
        className={`text-xs whitespace-pre-wrap overflow-auto rounded-xl p-3 max-h-72 ${
          ok
            ? "bg-gray-50 border border-gray-200 text-gray-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}
      >
        {text}
      </pre>
    </div>
  );
}

interface SyncContactResult {
  ok: boolean;
  recno?: number;
  error?: string;
}

export default function SifTestPage() {
  const [versionResult, setVersionResult] = useState<VersionResult | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);

  const [caseNumber, setCaseNumber] = useState("");
  const [caseLookupResult, setCaseLookupResult] = useState<CaseLookupResult | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);

  const [debugCaseNumber, setDebugCaseNumber] = useState("");
  const [estatesResult, setEstatesResult] = useState<RawDebugResult | null>(null);
  const [contactsResult, setContactsResult] = useState<RawDebugResult | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // SynchronizeContactPerson test
  const [syncFirstName, setSyncFirstName] = useState("");
  const [syncLastName, setSyncLastName] = useState("");
  const [syncRole, setSyncRole] = useState("");
  const [syncEnterprise, setSyncEnterprise] = useState("");
  const [syncExternalId, setSyncExternalId] = useState("");
  const [syncResult, setSyncResult] = useState<SyncContactResult | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // GetContactPersons lookup
  const [lookupExternalId, setLookupExternalId] = useState("");
  const [lookupResult, setLookupResult] = useState<RawDebugResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function syncContact(e: React.FormEvent) {
    e.preventDefault();
    if (!syncFirstName.trim() && !syncLastName.trim()) return;
    setSyncLoading(true);
    setSyncResult(null);
    // Auto-generate ExternalId if empty
    const externalId = syncExternalId.trim() || crypto.randomUUID();
    if (!syncExternalId.trim()) setSyncExternalId(externalId);
    const res = await authFetch("/api/sif/sync-contact-person", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: syncFirstName.trim() || undefined,
        lastName: syncLastName.trim() || undefined,
        title: syncRole.trim() || undefined,
        enterprise: syncEnterprise.trim() || undefined,
        externalId,
      }),
    });
    const data = await res.json();
    setSyncResult(data);
    setSyncLoading(false);
  }

  async function lookupContact(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupExternalId.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    const res = await authFetch(
      `/api/sif/sync-contact-person?externalId=${encodeURIComponent(lookupExternalId.trim())}`
    );
    const data = await res.json();
    setLookupResult(data);
    setLookupLoading(false);
  }

  async function testConnection() {
    setVersionLoading(true);
    setVersionResult(null);
    const res = await authFetch("/api/sif/health");
    const data = await res.json();
    setVersionResult(data);
    setVersionLoading(false);
  }

  async function debugRaw(e: React.FormEvent) {
    e.preventDefault();
    if (!debugCaseNumber.trim()) return;
    setDebugLoading(true);
    setEstatesResult(null);
    setContactsResult(null);
    const cn = encodeURIComponent(debugCaseNumber.trim());
    const [estRes, conRes] = await Promise.all([
      authFetch(`/api/sif/debug-raw?caseNumber=${cn}&service=estates`).then((r) => r.json()),
      authFetch(`/api/sif/debug-raw?caseNumber=${cn}&service=contacts`).then((r) => r.json()),
    ]);
    setEstatesResult(estRes);
    setContactsResult(conRes);
    setDebugLoading(false);
  }

  async function lookupCase(e: React.FormEvent) {
    e.preventDefault();
    if (!caseNumber.trim()) return;
    setCaseLoading(true);
    setCaseLookupResult(null);
    const res = await authFetch("/api/sif/case-lookup", {
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
          Slå opp en sak i Plan &amp; Build ved hjelp av saksnummer.
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
          <div className="mt-4">
            {caseLookupResult.ok ? (
              <>
                <p className="text-sm font-semibold text-green-700 mb-2">Sak funnet:</p>
                <CopyableJson data={caseLookupResult.case} ok={true} />
              </>
            ) : (
              <div className="rounded-xl p-4 text-sm bg-red-50 border border-red-200 text-red-800">
                <span className="font-semibold">Feil:</span> {caseLookupResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SynchronizeContactPerson test */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: SynchronizeContactPerson</h2>
        <p className="text-sm text-gray-500 mb-4">
          Oppretter eller oppdaterer en kontaktperson i Plan &amp; Build via{" "}
          <code className="text-xs bg-gray-100 rounded px-1 py-0.5">ContactService/SynchronizeContactPerson</code>.
          Returnerer <code className="text-xs bg-gray-100 rounded px-1 py-0.5">Recno</code> som brukes
          som kopimottaker ved arkivering. Rollen legges i <em>Title</em>-feltet.
        </p>
        <form onSubmit={syncContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fornavn</label>
              <input
                type="text"
                value={syncFirstName}
                onChange={(e) => setSyncFirstName(e.target.value)}
                placeholder="Ola"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etternavn</label>
              <input
                type="text"
                value={syncLastName}
                onChange={(e) => setSyncLastName(e.target.value)}
                placeholder="Nordmann"
                className="input text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rolle / tittel <span className="text-gray-400 font-normal">(lagres i Title-feltet)</span>
            </label>
            <input
              type="text"
              value={syncRole}
              onChange={(e) => setSyncRole(e.target.value)}
              placeholder="Brannvernleder"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Foretak <span className="text-gray-400 font-normal">(bruk &quot;recno:1234&quot; eller foretaksnavn)</span>
            </label>
            <input
              type="text"
              value={syncEnterprise}
              onChange={(e) => setSyncEnterprise(e.target.value)}
              placeholder='recno:1234 eller "Brannvesen Trondheim"'
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ExternalId <span className="text-gray-400 font-normal">(valgfri – genereres automatisk om tom)</span>
            </label>
            <input
              type="text"
              value={syncExternalId}
              onChange={(e) => setSyncExternalId(e.target.value)}
              placeholder="UUID – gjenbruk samme verdi for å teste upsert"
              className="input text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={syncLoading || (!syncFirstName.trim() && !syncLastName.trim())}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {syncLoading ? "Synkroniserer…" : "Synkroniser kontaktperson"}
          </button>
        </form>

        {syncResult && (
          <div className="mt-4">
            {syncResult.ok ? (
              <div className="rounded-xl p-4 text-sm bg-green-50 border border-green-200 text-green-800">
                <span className="font-semibold">Kontaktperson synkronisert!</span>{" "}
                Recno:{" "}
                <code className="font-mono font-bold">{syncResult.recno}</code>
                <p className="mt-1 text-green-600 text-xs">
                  Bruk <code className="font-mono">recno:{syncResult.recno}</code> i ExternalId-feltet til CreateDocument for å legge til som kopimottaker.
                </p>
              </div>
            ) : (
              <div className="rounded-xl p-4 text-sm bg-red-50 border border-red-200 text-red-800">
                <span className="font-semibold">Feil:</span> {syncResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GetContactPersons lookup */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Debug: GetContactPersons</h2>
        <p className="text-sm text-gray-500 mb-4">
          Slår opp råsvaret fra{" "}
          <code className="text-xs bg-gray-100 rounded px-1 py-0.5">ContactService/GetContactPersons</code>{" "}
          for et gitt ExternalId. Bruk dette for å verifisere at oppslaget fungerer og for å se
          nøyaktig hvilke feltnavn og verdier PNB returnerer (Name, FirstName, LastName, Enterprise, osv.).
        </p>
        <form onSubmit={lookupContact} className="flex gap-3 mb-4">
          <input
            type="text"
            value={lookupExternalId}
            onChange={(e) => setLookupExternalId(e.target.value)}
            placeholder="ExternalId (UUID)"
            className="input flex-1 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={lookupLoading || !lookupExternalId.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {lookupLoading ? "Henter…" : "Slå opp"}
          </button>
        </form>
        {lookupResult && (
          <CopyableJson
            data={lookupResult.ok ? lookupResult.raw : lookupResult.error}
            ok={lookupResult.ok}
          />
        )}
      </div>

      {/* Raw debug: estates + contacts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Rådata-debug: eiendommer og kontakter</h2>
        <p className="text-sm text-gray-500 mb-4">
          Viser det SIF faktisk returnerer fra <code>EstateService/GetEstates</code> og{" "}
          <code>CaseService/GetCaseContacts</code> – brukes til å avdekke feltnavnfeil.
        </p>
        <form onSubmit={debugRaw} className="flex gap-3 mb-4">
          <input
            type="text"
            value={debugCaseNumber}
            onChange={(e) => setDebugCaseNumber(e.target.value)}
            placeholder="F.eks. ULOV-25/00008"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={debugLoading || !debugCaseNumber.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {debugLoading ? "Henter…" : "Hent rådata"}
          </button>
        </form>

        {estatesResult && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              EstateService/GetEstates
            </p>
            <CopyableJson
              data={estatesResult.ok ? estatesResult.raw : estatesResult.error}
              ok={estatesResult.ok}
            />
          </div>
        )}

        {contactsResult && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              CaseService/GetCaseContacts
            </p>
            <CopyableJson
              data={contactsResult.ok ? contactsResult.raw : contactsResult.error}
              ok={contactsResult.ok}
            />
          </div>
        )}
      </div>
    </div>
  );
}
