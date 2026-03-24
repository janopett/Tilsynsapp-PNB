"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { SifSettings } from "@/lib/sif/settings";

type ClientSettings = Omit<SifSettings, "authkey" | "oauthClientSecret"> & {
  authkey: string;
  oauthClientSecret: string;
  hasAuthkey: boolean;
  hasOauthClientSecret: boolean;
};

interface SifConfigFormProps {
  initialSettings: ClientSettings | null;
}

const DEFAULTS: ClientSettings = {
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
  roleCopyRecipient: "KM",
  responsiblePersonRecno: 0,
  docAccessCode: "",
  autoDispatch: false,
  hasAuthkey: false,
  hasOauthClientSecret: false,
};

export default function SifConfigForm({ initialSettings }: SifConfigFormProps) {
  const [form, setForm] = useState<ClientSettings>(initialSettings ?? DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await authFetch("/api/sif/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
      } else {
        setError(data.error ?? "Lagring feilet");
      }
    } catch {
      setError("Nettverksfeil");
    } finally {
      setSaving(false);
    }
  }

  const inp = "block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const label = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1";
  const section = "bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 space-y-4";
  const heading = "text-base font-semibold text-gray-800 dark:text-slate-200 mb-3";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">SIF-konfigurasjon</h1>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {saving ? "Lagrer…" : "Lagre"}
        </button>
      </div>

      {success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-2">
          Innstillingene er lagret.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">{error}</p>
      )}

      {/* Connection */}
      <div className={section}>
        <p className={heading}>Tilkobling</p>
        <div>
          <label className={label}>Base URL</label>
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => set("baseUrl", e.target.value)}
            placeholder="https://plan360.example.no"
            className={inp}
          />
        </div>
        <div>
          <label className={label}>RPC-sti</label>
          <input
            type="text"
            value={form.rpcPath}
            onChange={(e) => set("rpcPath", e.target.value)}
            className={inp}
          />
        </div>
        {form.baseUrl && (
          <p className="text-xs text-gray-400 dark:text-slate-500">
            <a
              href={`${form.baseUrl.replace(/\/$/, "")}/Biz/v2/api/swagger/SI.Data.RPC`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              Åpne Swagger-dokumentasjon →
            </a>
          </p>
        )}
        <div>
          <label className={label}>Autentiseringsmodus</label>
          <select
            value={form.authMode}
            onChange={(e) => set("authMode", e.target.value as "authkey" | "combined_daemon")}
            className={inp}
          >
            <option value="authkey">Authkey</option>
            <option value="combined_daemon">OAuth (combined_daemon)</option>
          </select>
        </div>
        <div>
          <label className={label}>
            Authkey{" "}
            {form.hasAuthkey && (
              <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">(satt – tøm feltet for å beholde)</span>
            )}
          </label>
          <input
            type="password"
            value={form.authkey}
            onChange={(e) => set("authkey", e.target.value)}
            placeholder={form.hasAuthkey ? "••••••••" : "Skriv inn authkey"}
            className={inp}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className={label}>Timeout (ms)</label>
          <input
            type="number"
            value={form.timeoutMs}
            onChange={(e) => set("timeoutMs", Number(e.target.value))}
            min={1000}
            className={inp}
          />
        </div>
      </div>

      {/* OAuth */}
      {form.authMode === "combined_daemon" && (
        <div className={section}>
          <p className={heading}>OAuth-innstillinger</p>
          <div>
            <label className={label}>Client ID</label>
            <input
              type="text"
              value={form.oauthClientId}
              onChange={(e) => set("oauthClientId", e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className={label}>
              Client Secret{" "}
              {form.hasOauthClientSecret && (
                <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">(satt)</span>
              )}
            </label>
            <input
              type="password"
              value={form.oauthClientSecret}
              onChange={(e) => set("oauthClientSecret", e.target.value)}
              placeholder={form.hasOauthClientSecret ? "••••••••" : "Skriv inn client secret"}
              className={inp}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={label}>Token URL</label>
            <input
              type="url"
              value={form.oauthTokenUrl}
              onChange={(e) => set("oauthTokenUrl", e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className={label}>Scope</label>
            <input
              type="text"
              value={form.oauthScope}
              onChange={(e) => set("oauthScope", e.target.value)}
              className={inp}
            />
          </div>
        </div>
      )}

      {/* Document mapping */}
      <div className={section}>
        <p className={heading}>Dokumentmapping</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Arkiv</label>
            <input type="text" value={form.docArchive} onChange={(e) => set("docArchive", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Kategori</label>
            <input type="text" value={form.docCategory} onChange={(e) => set("docCategory", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Status</label>
            <input type="text" value={form.docStatus} onChange={(e) => set("docStatus", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Tilgangskode</label>
            <input type="text" value={form.docAccessCode} onChange={(e) => set("docAccessCode", e.target.value)} placeholder="(ingen)" className={inp} />
          </div>
          <div>
            <label className={label}>Hoveddokument-relasjonstype</label>
            <input type="text" value={form.docMainFileRelationType} onChange={(e) => set("docMainFileRelationType", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Vedlegg-relasjonstype</label>
            <input type="text" value={form.docAttachmentRelationType} onChange={(e) => set("docAttachmentRelationType", e.target.value)} className={inp} />
          </div>
        </div>
        <div>
          <label className={label}>Tittelmal</label>
          <input
            type="text"
            value={form.docTitleTemplate}
            onChange={(e) => set("docTitleTemplate", e.target.value)}
            placeholder="Tilsynsrapport - {{propertyAddress}} - {{date}}"
            className={inp}
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Variabler: {"{{propertyAddress}}"}, {"{{date}}"}, {"{{caseNumber}}"}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="autoDispatch"
            type="checkbox"
            checked={form.autoDispatch}
            onChange={(e) => set("autoDispatch", e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          <label htmlFor="autoDispatch" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer select-none">
            Send automatisk til mottakere etter arkivering
          </label>
        </div>
      </div>

      {/* Contact roles */}
      <div className={section}>
        <p className={heading}>Kontaktroller</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Avsender (kommunen)</label>
            <input type="text" value={form.roleMunicipalitySender} onChange={(e) => set("roleMunicipalitySender", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Mottaker (søker)</label>
            <input type="text" value={form.roleApplicantRecipient} onChange={(e) => set("roleApplicantRecipient", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Kopi-mottaker</label>
            <input type="text" value={form.roleCopyRecipient} onChange={(e) => set("roleCopyRecipient", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Ansvarlig person (Recno)</label>
            <input
              type="number"
              value={form.responsiblePersonRecno}
              onChange={(e) => set("responsiblePersonRecno", Number(e.target.value))}
              min={0}
              className={inp}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {saving ? "Lagrer…" : "Lagre innstillinger"}
        </button>
      </div>
    </form>
  );
}
