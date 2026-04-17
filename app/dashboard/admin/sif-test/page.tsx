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
          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition"
        >
          {copied ? "Kopiert!" : "Kopier"}
        </button>
      </div>
      <pre
        className={`text-xs whitespace-pre-wrap overflow-auto rounded-xl p-3 max-h-72 ${
          ok
            ? "bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
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

interface EnterpriseHit {
  Recno: number;
  Name: string;
  OrgNo?: string;
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

  // Enterprise search
  const [enterpriseQuery, setEnterpriseQuery] = useState("");
  const [enterpriseHits, setEnterpriseHits] = useState<EnterpriseHit[]>([]);
  const [enterpriseSearching, setEnterpriseSearching] = useState(false);
  const enterpriseSearchTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  // GetContactPersons lookup
  const [lookupExternalId, setLookupExternalId] = useState("");
  const [lookupResult, setLookupResult] = useState<RawDebugResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // UpdateContactPerson test
  const [updateRecno, setUpdateRecno] = useState("");
  const [updateFirstName, setUpdateFirstName] = useState("");
  const [updateLastName, setUpdateLastName] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateExternalId, setUpdateExternalId] = useState("");
  const [updateEnterprise, setUpdateEnterprise] = useState("");
  const [updateEnterpriseQuery, setUpdateEnterpriseQuery] = useState("");
  const [updateEnterpriseHits, setUpdateEnterpriseHits] = useState<EnterpriseHit[]>([]);
  const [updateEnterpriseSearching, setUpdateEnterpriseSearching] = useState(false);
  const updateEnterpriseTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const [updateResult, setUpdateResult] = useState<RawDebugResult | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // GetCodeTableRows test
  const [codeTableName, setCodeTableName] = useState("eBy Supervision area");
  const [codeTableResult, setCodeTableResult] = useState<RawDebugResult | null>(null);
  const [codeTableLoading, setCodeTableLoading] = useState(false);

  async function lookupCodeTable(e: React.FormEvent) {
    e.preventDefault();
    if (!codeTableName.trim()) return;
    setCodeTableLoading(true);
    setCodeTableResult(null);
    const res = await authFetch(
      `/api/sif/debug-raw?service=codetable&codetable=${encodeURIComponent(codeTableName.trim())}`
    );
    const data = await res.json();
    setCodeTableResult(data);
    setCodeTableLoading(false);
  }

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

  function handleEnterpriseQueryChange(value: string) {
    setEnterpriseQuery(value);
    setEnterpriseHits([]);
    if (enterpriseSearchTimer[0]) clearTimeout(enterpriseSearchTimer[0]);
    if (value.trim().length < 2) return;
    enterpriseSearchTimer[0] = setTimeout(async () => {
      setEnterpriseSearching(true);
      try {
        const res = await authFetch(
          `/api/sif/enterprise-search?q=${encodeURIComponent(value.trim())}`
        );
        const data = await res.json();
        setEnterpriseHits(data.ok ? (data.enterprises ?? []) : []);
      } finally {
        setEnterpriseSearching(false);
      }
    }, 300);
  }

  function selectEnterprise(hit: EnterpriseHit) {
    setSyncEnterprise(`recno:${hit.Recno}`);
    setEnterpriseQuery(hit.Name);
    setEnterpriseHits([]);
  }

  function handleUpdateEnterpriseQueryChange(value: string) {
    setUpdateEnterpriseQuery(value);
    setUpdateEnterpriseHits([]);
    if (updateEnterpriseTimer[0]) clearTimeout(updateEnterpriseTimer[0]);
    if (value.trim().length < 2) return;
    updateEnterpriseTimer[0] = setTimeout(async () => {
      setUpdateEnterpriseSearching(true);
      try {
        const res = await authFetch(`/api/sif/enterprise-search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setUpdateEnterpriseHits(data.ok ? (data.enterprises ?? []) : []);
      } finally {
        setUpdateEnterpriseSearching(false);
      }
    }, 300);
  }

  function selectUpdateEnterprise(hit: EnterpriseHit) {
    setUpdateEnterprise(`recno:${hit.Recno}`);
    setUpdateEnterpriseQuery(hit.Name);
    setUpdateEnterpriseHits([]);
  }

  async function runUpdateContactPerson(e: React.FormEvent) {
    e.preventDefault();
    const recno = parseInt(updateRecno.trim(), 10);
    if (!updateRecno.trim() || isNaN(recno)) return;
    setUpdateLoading(true);
    setUpdateResult(null);
    try {
      const res = await authFetch("/api/sif/update-contact-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recno,
          firstName: updateFirstName.trim() || undefined,
          lastName: updateLastName.trim() || undefined,
          title: updateTitle.trim() || undefined,
          externalId: updateExternalId.trim() || undefined,
          enterprise: updateEnterprise.trim() || undefined,
        }),
      });
      const data = await res.json();
      setUpdateResult({ ok: data.ok, raw: data.ok ? data.raw : data.error });
    } finally {
      setUpdateLoading(false);
    }
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

  // GetFilesWithMetadata test
  const [filesCaseNumber, setFilesCaseNumber] = useState("");
  const [filesResult, setFilesResult] = useState<RawDebugResult | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);

  async function lookupFiles(e: React.FormEvent) {
    e.preventDefault();
    if (!filesCaseNumber.trim()) return;
    setFilesLoading(true);
    setFilesResult(null);
    const cn = encodeURIComponent(filesCaseNumber.trim());
    const res = await authFetch(`/api/sif/debug-raw?caseNumber=${cn}&service=files`);
    const data = await res.json();
    setFilesResult(data);
    setFilesLoading(false);
  }

  // IncludeReferringCases test
  const [refCaseNumber, setRefCaseNumber] = useState("");
  const [refCasesResult, setRefCasesResult] = useState<RawDebugResult | null>(null);
  const [refCasesLoading, setRefCasesLoading] = useState(false);

  async function lookupReferringCases(e: React.FormEvent) {
    e.preventDefault();
    if (!refCaseNumber.trim()) return;
    setRefCasesLoading(true);
    setRefCasesResult(null);
    const cn = encodeURIComponent(refCaseNumber.trim());
    const res = await authFetch(`/api/sif/debug-raw?caseNumber=${cn}&service=cases`);
    const data = await res.json();
    setRefCasesResult(data);
    setRefCasesLoading(false);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">SIF Admin – Testverktøy</h1>

      {/* Connection test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-5">
        <h2 className="text-base font-semibold mb-4">Tilkoblingstest</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
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
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <h2 className="text-base font-semibold mb-4">Saksoppslag</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
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
              <div className="rounded-xl p-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                <span className="font-semibold">Feil:</span> {caseLookupResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* IncludeReferringCases test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: IncludeReferringCases (GetCases)</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Kaller{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">CaseService/GetCases</code>{" "}
          med <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">IncludeReferringCases: true</code>{" "}
          og viser råsvaret. Bruk dette for å undersøke om saken har refererte saker, og hva{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">ReferringCases</code>-feltet inneholder.
        </p>
        <form onSubmit={lookupReferringCases} className="flex gap-3 mb-4">
          <input
            type="text"
            value={refCaseNumber}
            onChange={(e) => setRefCaseNumber(e.target.value)}
            placeholder="F.eks. ULOV-25/00008"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={refCasesLoading || !refCaseNumber.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {refCasesLoading ? "Henter…" : "Hent sak"}
          </button>
        </form>

        {refCasesResult && (
          <div className="space-y-4">
            {/* ReferringCases highlighted */}
            {refCasesResult.ok && (refCasesResult.raw as { Cases?: Array<{ ReferringCases?: unknown }> })?.Cases?.[0] && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  ReferringCases (fra Cases[0])
                </p>
                <CopyableJson
                  data={(refCasesResult.raw as { Cases: Array<{ ReferringCases?: unknown }> }).Cases[0].ReferringCases ?? null}
                  ok={true}
                />
              </div>
            )}
            {/* Full raw response */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Fullstendig råsvar fra GetCases
              </p>
              <CopyableJson
                data={refCasesResult.ok ? refCasesResult.raw : refCasesResult.error}
                ok={refCasesResult.ok}
              />
            </div>
          </div>
        )}
      </div>

      {/* Files-in-documents test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: Filer i sak (via GetDocuments)</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Henter dokumenter med tilhørende filer via{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">DocumentService/GetDocuments</code>{" "}
          med <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">IncludeFiles: true</code>.{" "}
          (<code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">FileService/GetFilesWithMetadata</code> er blokkert på dette endepunktet.)
        </p>
        <form onSubmit={lookupFiles} className="flex gap-3 mb-4">
          <input
            type="text"
            value={filesCaseNumber}
            onChange={(e) => setFilesCaseNumber(e.target.value)}
            placeholder="F.eks. BYGG-25/00388"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={filesLoading || !filesCaseNumber.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {filesLoading ? "Henter…" : "Hent filer"}
          </button>
        </form>

        {filesResult && (
          <CopyableJson
            data={filesResult.ok ? filesResult.raw : filesResult.error}
            ok={filesResult.ok}
          />
        )}
      </div>

      {/* SynchronizeContactPerson test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: SynchronizeContactPerson</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Oppretter eller oppdaterer en kontaktperson i Plan &amp; Build via{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">ContactService/SynchronizeContactPerson</code>.
          Returnerer <code className="text-xs bg-gray-100 rounded px-1 py-0.5">Recno</code> som brukes
          som kopimottaker ved arkivering. Rollen legges i <em>Title</em>-feltet.
        </p>
        <form onSubmit={syncContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fornavn</label>
              <input
                type="text"
                value={syncFirstName}
                onChange={(e) => setSyncFirstName(e.target.value)}
                placeholder="Ola"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Etternavn</label>
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
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
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
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Foretak <span className="text-gray-400 font-normal">(søk på navn, velg resultat)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={enterpriseQuery}
                onChange={(e) => handleEnterpriseQueryChange(e.target.value)}
                placeholder="Søk på foretaksnavn eller org.nr…"
                className="input text-sm"
                autoComplete="off"
              />
              {enterpriseSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Søker…
                </span>
              )}
              {enterpriseHits.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg text-sm overflow-hidden">
                  {enterpriseHits.map((hit) => (
                    <li key={hit.Recno}>
                      <button
                        type="button"
                        onClick={() => selectEnterprise(hit)}
                        className="w-full text-left px-4 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition flex justify-between items-center gap-2 dark:text-slate-100"
                      >
                        <span>{hit.Name}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                          {hit.OrgNo ? `${hit.OrgNo} · ` : ""}recno:{hit.Recno}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {syncEnterprise && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">{syncEnterprise}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
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
              <div className="rounded-xl p-4 text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
                <span className="font-semibold">Kontaktperson synkronisert!</span>{" "}
                Recno:{" "}
                <code className="font-mono font-bold">{syncResult.recno}</code>
                <p className="mt-1 text-green-600 text-xs">
                  Bruk <code className="font-mono">recno:{syncResult.recno}</code> i ExternalId-feltet til CreateDocument for å legge til som kopimottaker.
                </p>
              </div>
            ) : (
              <div className="rounded-xl p-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
                <span className="font-semibold">Feil:</span> {syncResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GetContactPersons lookup */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Debug: GetContactPersons</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Slår opp råsvaret fra{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">ContactService/GetContactPersons</code>{" "}
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

      {/* UpdateContactPerson test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: UpdateContactPerson</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Kaller{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">ContactService/UpdateContactPerson</code>{" "}
          direkte med angitt Recno. Returnerer råsvaret fra SIF. Bruk dette til å verifisere at oppdatering av
          eksisterende kontaktperson fungerer.
        </p>
        <form onSubmit={runUpdateContactPerson} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Recno <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={updateRecno}
              onChange={(e) => setUpdateRecno(e.target.value)}
              placeholder="F.eks. 219065"
              className="input text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fornavn</label>
              <input
                type="text"
                value={updateFirstName}
                onChange={(e) => setUpdateFirstName(e.target.value)}
                placeholder="Ola"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Etternavn</label>
              <input
                type="text"
                value={updateLastName}
                onChange={(e) => setUpdateLastName(e.target.value)}
                placeholder="Nordmann"
                className="input text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Ny rolle / tittel <span className="text-gray-400 font-normal">(Title-feltet)</span>
            </label>
            <input
              type="text"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
              placeholder="Brannvernleder"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Foretak <span className="text-gray-400 font-normal">(søk på navn, velg resultat)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={updateEnterpriseQuery}
                onChange={(e) => handleUpdateEnterpriseQueryChange(e.target.value)}
                placeholder="Søk på foretaksnavn eller org.nr…"
                className="input text-sm"
                autoComplete="off"
              />
              {updateEnterpriseSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Søker…
                </span>
              )}
              {updateEnterpriseHits.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg text-sm overflow-hidden">
                  {updateEnterpriseHits.map((hit) => (
                    <li key={hit.Recno}>
                      <button
                        type="button"
                        onClick={() => selectUpdateEnterprise(hit)}
                        className="w-full text-left px-4 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition flex justify-between items-center gap-2 dark:text-slate-100"
                      >
                        <span>{hit.Name}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                          {hit.OrgNo ? `${hit.OrgNo} · ` : ""}recno:{hit.Recno}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {updateEnterprise && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">{updateEnterprise}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              ExternalId <span className="text-gray-400 font-normal">(valgfri)</span>
            </label>
            <input
              type="text"
              value={updateExternalId}
              onChange={(e) => setUpdateExternalId(e.target.value)}
              placeholder="UUID"
              className="input text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={updateLoading || !updateRecno.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {updateLoading ? "Oppdaterer…" : "Oppdater kontaktperson"}
          </button>
        </form>
        {updateResult && (
          <div className="mt-4">
            <p className={`text-xs font-semibold mb-1 ${updateResult.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
              {updateResult.ok ? "Svar fra SIF:" : "Feil:"}
            </p>
            <CopyableJson data={updateResult.raw} ok={updateResult.ok} />
          </div>
        )}
      </div>

      {/* GetCodeTableRows test */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Test: GetCodeTableRows</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Kaller{" "}
          <code className="text-xs bg-gray-100 dark:bg-slate-700 rounded px-1 py-0.5 dark:text-slate-300">SupportService/GetCodeTableRows</code>{" "}
          direkte og viser råsvaret. Bruk dette for å verifisere at kodetabellnavnet er riktig i din installasjon.
        </p>
        <form onSubmit={lookupCodeTable} className="flex gap-3 mb-4">
          <input
            type="text"
            value={codeTableName}
            onChange={(e) => setCodeTableName(e.target.value)}
            placeholder="F.eks. eBy Supervision area"
            className="input flex-1 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={codeTableLoading || !codeTableName.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {codeTableLoading ? "Henter…" : "Hent kodetabell"}
          </button>
        </form>
        {codeTableResult && (
          <CopyableJson
            data={codeTableResult.ok ? codeTableResult.raw : codeTableResult.error}
            ok={codeTableResult.ok}
          />
        )}
      </div>

      {/* Raw debug: estates + contacts */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mt-5">
        <h2 className="text-base font-semibold mb-1">Rådata-debug: eiendommer og kontakter</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
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
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
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
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
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
