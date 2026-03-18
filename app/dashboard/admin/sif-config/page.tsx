"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SifSettingsForm {
  // Connection
  baseUrl: string;
  rpcPath: string;
  authMode: "authkey" | "combined_daemon";
  authkey: string;
  timeoutMs: number;
  // OAuth
  oauthClientId: string;
  oauthClientSecret: string;
  oauthTokenUrl: string;
  oauthScope: string;
  // Document mapping
  docArchive: string;
  docCategory: string;
  docStatus: string;
  docTitleTemplate: string;
  docMainFileRelationType: string;
  docAttachmentRelationType: string;
  // Contact roles
  roleMunicipalitySender: string;
  roleApplicantRecipient: string;
  // Defaults
  responsiblePersonRecno: number;
  // Meta (from server)
  hasAuthkey?: boolean;
  hasOauthClientSecret?: boolean;
}

interface CodeTableRow {
  recno?: number;
  code?: string;
  description?: string;
  active?: boolean;
}

const DEFAULT_FORM: SifSettingsForm = {
  baseUrl: "",
  rpcPath: "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
  authMode: "authkey",
  authkey: "",
  timeoutMs: 30000,
  oauthClientId: "",
  oauthClientSecret: "",
  oauthTokenUrl: "",
  oauthScope: "",
  docArchive: "recno:2",
  docCategory: "recno:111",
  docStatus: "J",
  docTitleTemplate: "Tilsynsrapport - {{propertyAddress}} - {{date}}",
  docMainFileRelationType: "H",
  docAttachmentRelationType: "V",
  roleMunicipalitySender: "AV",
  roleApplicantRecipient: "EM",
  responsiblePersonRecno: 0,
};

type Tab = "connection" | "mapping" | "test";

// ─── Code table picker component ─────────────────────────────────────────────

function CodeTablePicker({
  tableName,
  label,
  value,
  onChange,
}: {
  tableName: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [rows, setRows] = useState<CodeTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/sif/code-tables?table=${encodeURIComponent(tableName)}`
      );
      const data = await res.json();
      if (data.ok) {
        setRows(data.rows ?? []);
        setOpen(true);
      } else {
        setError(data.error ?? "Ukjent feil");
      }
    } catch {
      setError("Nettverksfeil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input flex-1"
          placeholder="F.eks. recno:2 eller Saksdokument"
        />
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Laster…" : `Bla i ${label}`}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
      {open && rows.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600">
              Velg fra {label}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Lukk
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {rows
              .filter((r) => r.active !== false)
              .map((r, i) => {
                const recnoVal = r.recno ? `recno:${r.recno}` : (r.code ?? "");
                const display = r.description
                  ? `${r.description}${r.recno ? ` (recno:${r.recno})` : r.code ? ` (${r.code})` : ""}`
                  : recnoVal;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(recnoVal);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-700 border-b border-gray-100 last:border-0 transition"
                  >
                    {display}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SifConfigPage() {
  const [tab, setTab] = useState<Tab>("connection");
  const [form, setForm] = useState<SifSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Connection test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    version?: string;
    error?: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/sif/settings");
      const data = await res.json();
      if (data.configured && data.settings) {
        setForm((prev) => ({ ...prev, ...data.settings }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function set<K extends keyof SifSettingsForm>(key: K, value: SifSettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveResult(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await authFetch("/api/sif/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveResult({ ok: true, message: "Innstillinger lagret." });
        await loadSettings();
      } else {
        setSaveResult({ ok: false, message: data.error ?? "Ukjent feil" });
      }
    } catch {
      setSaveResult({ ok: false, message: "Nettverksfeil" });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTestLoading(true);
    setTestResult(null);
    const res = await authFetch("/api/sif/health");
    const data = await res.json();
    setTestResult(data);
    setTestLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Laster innstillinger…
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "connection", label: "Tilkobling" },
    { id: "mapping", label: "Dokumentmapping" },
    { id: "test", label: "Test" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        SIF Admin – Konfigurasjon
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Konfigurer tilkoblingen mot Plan &amp; Build (Public 360° / SIF RPC).
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* ── Tab: Tilkobling ─────────────────────────────────────────── */}
        {tab === "connection" && (
          <div className="space-y-5">
            <Section title="SIF RPC-endepunkt">
              <Field
                label="Base URL"
                hint="URL til 360°-installasjonen, f.eks. https://kunde.public360online.com"
              >
                <input
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => set("baseUrl", e.target.value)}
                  placeholder="https://kunde.public360online.com"
                  className="input"
                />
              </Field>
              <Field
                label="RPC-sti"
                hint="Standard: /Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC"
              >
                <input
                  type="text"
                  value={form.rpcPath}
                  onChange={(e) => set("rpcPath", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Timeout (ms)">
                <input
                  type="number"
                  min={1000}
                  max={120000}
                  step={1000}
                  value={form.timeoutMs}
                  onChange={(e) =>
                    set("timeoutMs", Number(e.target.value))
                  }
                  className="input"
                />
              </Field>
            </Section>

            <Section title="Autentisering">
              <Field label="Modus">
                <select
                  value={form.authMode}
                  onChange={(e) =>
                    set("authMode", e.target.value as SifSettingsForm["authMode"])
                  }
                  className="input"
                >
                  <option value="authkey">
                    AuthKey (tjeneste-til-tjeneste)
                  </option>
                  <option value="combined_daemon">
                    Combined Daemon (OAuth + AuthKey)
                  </option>
                </select>
              </Field>

              <Field
                label="AuthKey"
                hint={
                  form.hasAuthkey
                    ? "En nøkkel er lagret. Skriv inn ny for å erstatte den."
                    : "GUID-nøkkel fra 360° endepunktkonfigurasjon."
                }
              >
                <input
                  type="password"
                  value={form.authkey}
                  onChange={(e) => set("authkey", e.target.value)}
                  placeholder={
                    form.hasAuthkey ? "••••••••" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  }
                  autoComplete="off"
                  className="input font-mono"
                />
              </Field>

              {form.authMode === "combined_daemon" && (
                <>
                  <Field
                    label="OAuth Token URL"
                    hint="Token-endepunkt, f.eks. https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
                  >
                    <input
                      type="url"
                      value={form.oauthTokenUrl}
                      onChange={(e) => set("oauthTokenUrl", e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="OAuth Client ID">
                    <input
                      type="text"
                      value={form.oauthClientId}
                      onChange={(e) => set("oauthClientId", e.target.value)}
                      autoComplete="off"
                      className="input font-mono"
                    />
                  </Field>
                  <Field
                    label="OAuth Client Secret"
                    hint={
                      form.hasOauthClientSecret
                        ? "En secret er lagret. Skriv inn ny for å erstatte den."
                        : undefined
                    }
                  >
                    <input
                      type="password"
                      value={form.oauthClientSecret}
                      onChange={(e) =>
                        set("oauthClientSecret", e.target.value)
                      }
                      placeholder={
                        form.hasOauthClientSecret ? "••••••••" : ""
                      }
                      autoComplete="off"
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="OAuth Scope (valgfritt)">
                    <input
                      type="text"
                      value={form.oauthScope}
                      onChange={(e) => set("oauthScope", e.target.value)}
                      placeholder="f.eks. https://graph.microsoft.com/.default"
                      className="input"
                    />
                  </Field>
                </>
              )}
            </Section>
          </div>
        )}

        {/* ── Tab: Dokumentmapping ────────────────────────────────────── */}
        {tab === "mapping" && (
          <div className="space-y-5">
            <Section
              title="Dokumentarkiv"
              hint="Verdiene kan være en recno (recno:17) eller en kodeverdi. Bruk 'Bla'-knappen for å slå opp fra 360°."
            >
              <Field
                label="Arkiv"
                hint="Hvilken dokumentarkiv tilsynsrapporten skal lagres i"
              >
                <CodeTablePicker
                  tableName="Document archive"
                  label="arkiver"
                  value={form.docArchive}
                  onChange={(v) => set("docArchive", v)}
                />
              </Field>
              <Field label="Kategori">
                <CodeTablePicker
                  tableName="Document category"
                  label="kategorier"
                  value={form.docCategory}
                  onChange={(v) => set("docCategory", v)}
                />
              </Field>
              <Field
                label="Status"
                hint="J = Journalført (standard)"
              >
                <CodeTablePicker
                  tableName="Document status"
                  label="statuser"
                  value={form.docStatus}
                  onChange={(v) => set("docStatus", v)}
                />
              </Field>
            </Section>

            <Section title="Dokumenttittel">
              <Field
                label="Tittelmal"
                hint="Variabler: {{propertyAddress}}, {{caseNumber}}, {{date}}"
              >
                <input
                  type="text"
                  value={form.docTitleTemplate}
                  onChange={(e) => set("docTitleTemplate", e.target.value)}
                  className="input"
                />
              </Field>
            </Section>

            <Section title="Filrelasjonstyper">
              <Field label="Hoveddokument (mainFileRelationType)">
                <input
                  type="text"
                  value={form.docMainFileRelationType}
                  onChange={(e) =>
                    set("docMainFileRelationType", e.target.value)
                  }
                  placeholder="H"
                  className="input"
                />
              </Field>
              <Field label="Vedlegg (attachmentRelationType)">
                <input
                  type="text"
                  value={form.docAttachmentRelationType}
                  onChange={(e) =>
                    set("docAttachmentRelationType", e.target.value)
                  }
                  placeholder="V"
                  className="input"
                />
              </Field>
            </Section>

            <Section title="Kontaktroller">
              <Field label="Avsender (kommune)">
                <CodeTablePicker
                  tableName="Contact role"
                  label="roller"
                  value={form.roleMunicipalitySender}
                  onChange={(v) => set("roleMunicipalitySender", v)}
                />
              </Field>
              <Field label="Mottaker (søker/tiltakshaver)">
                <CodeTablePicker
                  tableName="Contact role"
                  label="roller"
                  value={form.roleApplicantRecipient}
                  onChange={(v) => set("roleApplicantRecipient", v)}
                />
              </Field>
            </Section>

            <Section title="Standardverdier">
              <Field
                label="Ansvarlig saksbehandler (recno)"
                hint="0 = ikke satt"
              >
                <input
                  type="number"
                  min={0}
                  value={form.responsiblePersonRecno}
                  onChange={(e) =>
                    set("responsiblePersonRecno", Number(e.target.value))
                  }
                  className="input"
                />
              </Field>
            </Section>
          </div>
        )}

        {/* ── Tab: Test ────────────────────────────────────────────────── */}
        {tab === "test" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold mb-3">Tilkoblingstest</h2>
              <p className="text-sm text-gray-500 mb-4">
                Kaller{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">
                  SupportService/GetSIFVersion
                </code>{" "}
                for å bekrefte at SIF-endepunktet er nåbart og at
                autentiseringen fungerer.
              </p>
              <button
                type="button"
                onClick={testConnection}
                disabled={testLoading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {testLoading ? "Tester…" : "Test tilkobling"}
              </button>
              {testResult && (
                <div
                  className={`mt-4 rounded-xl p-4 text-sm ${
                    testResult.ok
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                  }`}
                >
                  {testResult.ok ? (
                    <>
                      <span className="font-semibold">Tilkobling OK</span>
                      {testResult.version && (
                        <span className="ml-2 text-green-600">
                          – SIF versjon: {testResult.version}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Feil:</span>{" "}
                      {testResult.error}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">Husk å lagre før du tester</p>
              <p>
                Tilkoblingstesten bruker de lagrede innstillingene.
                Endringer som ikke er lagret vil ikke reflekteres i testen.
              </p>
            </div>
          </div>
        )}

        {/* ── Save bar (hidden on test tab) ─────────────────────────── */}
        {tab !== "test" && (
          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {saving ? "Lagrer…" : "Lagre innstillinger"}
            </button>
            {saveResult && (
              <span
                className={`text-sm ${
                  saveResult.ok ? "text-green-600" : "text-red-600"
                }`}
              >
                {saveResult.message}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      {hint && <p className="text-xs text-gray-400 mb-4">{hint}</p>}
      <div className="space-y-4 mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
