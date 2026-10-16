"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ oauthError = false }: { oauthError?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    oauthError
      ? "Innlogging med Microsoft mislyktes. Prøv igjen eller logg inn med e-post og passord."
      : ""
  );

  async function handleMicrosoftLogin() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes: "openid email profile",
      },
    });

    // Ved suksess sender Supabase nettleseren videre til Microsoft, så vi venter bare ved feil.
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-post
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="navn@kommune.no"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Passord
          </label>
          <input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-base transition disabled:opacity-50"
        >
          {loading ? "Logger inn…" : "Logg inn"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
        eller
        <span className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={loading}
        className="w-full border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-100 font-semibold py-3 rounded-xl text-base hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
      >
        Logg inn med Microsoft
      </button>
    </div>
  );
}
