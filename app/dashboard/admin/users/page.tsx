"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface AdminUser {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSignIn?: string | null;
}

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const EMPTY_FORM: CreateForm = { firstName: "", lastName: "", email: "", password: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Inline name editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUsers(
          data.users.sort((a: AdminUser, b: AdminUser) =>
            (a.email ?? "").localeCompare(b.email ?? "")
          )
        );
      } else {
        setError(data.error ?? "Klarte ikke hente brukere");
      }
    } catch {
      setError("Nettverksfeil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    setPending(userId);
    setError(null);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u
          )
        );
      } else {
        setError(data.error ?? "Ukjent feil");
      }
    } catch {
      setError("Nettverksfeil");
    } finally {
      setPending(null);
    }
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditFirst(u.firstName ?? "");
    setEditLast(u.lastName ?? "");
    setNameError(null);
  }

  async function saveName(userId: string) {
    setSavingName(true);
    setNameError(null);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, firstName: editFirst, lastName: editLast }),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingId(null);
        await loadUsers();
      } else {
        setNameError(data.error ?? "Klarte ikke lagre");
      }
    } catch {
      setNameError("Nettverksfeil");
    } finally {
      setSavingName(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const res = await authFetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCreateSuccess(
          `Bruker opprettet: ${data.user.name} (${data.user.email})`
        );
        setForm(EMPTY_FORM);
        setShowCreate(false);
        await loadUsers();
      } else {
        setCreateError(data.error ?? "Klarte ikke opprette bruker");
      }
    } catch {
      setCreateError("Nettverksfeil");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Brukere og admin-tilgang
        </h1>
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setCreateError(null);
            setCreateSuccess(null);
          }}
          className="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition"
        >
          {showCreate ? "Avbryt" : "+ Legg til bruker"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Brukere med admin-tilgang kan konfigurere SIF og administrere
        applikasjonen.
      </p>

      {/* Create user form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">
            Legg til ny bruker
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornavn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                placeholder="Ola"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etternavn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                placeholder="Nordmann"
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-post <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="navn@kommune.no"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passord <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              placeholder="Minst 8 tegn"
              className="input"
            />
          </div>

          {createError && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {createError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {creating ? "Oppretter…" : "Opprett bruker"}
            </button>
          </div>
        </form>
      )}

      {createSuccess && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
          {createSuccess}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32 text-gray-400 text-sm">
          Laster brukere…
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">Ingen brukere funnet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {users.map((u) => (
                <li key={u.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.name ?? <span className="text-gray-400 italic">Navn ikke satt</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Sist innlogget:{" "}
                        {u.lastSignIn
                          ? new Date(u.lastSignIn).toLocaleDateString("nb-NO")
                          : "aldri"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.isAdmin && (
                        <span className="text-xs font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                      <button
                        onClick={() => editingId === u.id ? setEditingId(null) : startEdit(u)}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      >
                        {editingId === u.id ? "Avbryt" : "Rediger navn"}
                      </button>
                      <button
                        onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        disabled={pending === u.id}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                          u.isAdmin
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {pending === u.id ? "…" : u.isAdmin ? "Fjern admin" : "Gi admin"}
                      </button>
                    </div>
                  </div>

                  {editingId === u.id && (
                    <div className="flex gap-2 items-end pt-1">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Fornavn</label>
                        <input
                          type="text"
                          value={editFirst}
                          onChange={(e) => setEditFirst(e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Fornavn"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Etternavn</label>
                        <input
                          type="text"
                          value={editLast}
                          onChange={(e) => setEditLast(e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Etternavn"
                          onKeyDown={(e) => e.key === "Enter" && saveName(u.id)}
                        />
                      </div>
                      <button
                        onClick={() => saveName(u.id)}
                        disabled={savingName || !editFirst.trim() || !editLast.trim()}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition disabled:opacity-50 shrink-0"
                      >
                        {savingName ? "Lagrer…" : "Lagre"}
                      </button>
                      {nameError && (
                        <p className="text-xs text-red-600">{nameError}</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">Første admin (bootstrap)</p>
        <p className="mb-2">
          Hvis ingen admin finnes ennå, kan du sette den første via terminalen:
        </p>
        <pre className="bg-white rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
          npx tsx scripts/set-admin.ts brukernavn@epost.no
        </pre>
      </div>
    </div>
  );
}
