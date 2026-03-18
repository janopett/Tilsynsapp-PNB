"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface AdminUser {
  id: string;
  email?: string;
  name?: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastSignIn?: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null); // userId being toggled
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Brukere og admin-tilgang
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Brukere med admin-tilgang kan konfigurere SIF og administrere
        applikasjonen.
      </p>

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
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.name ?? u.email ?? u.id}
                    </p>
                    {u.name && (
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">
                      Sist innlogget:{" "}
                      {u.lastSignIn
                        ? new Date(u.lastSignIn).toLocaleDateString("nb-NO")
                        : "aldri"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {u.isAdmin && (
                      <span className="text-xs font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                    <button
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={pending === u.id}
                      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                        u.isAdmin
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {pending === u.id
                        ? "…"
                        : u.isAdmin
                        ? "Fjern admin"
                        : "Gi admin"}
                    </button>
                  </div>
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
