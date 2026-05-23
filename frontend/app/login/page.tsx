"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getLoginErrorMessage,
  isAuthenticated,
  login,
  persistSession,
} from "../../lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await login(username.trim(), password);
      persistSession(data.access_token, username.trim());
      const returnUrl = searchParams.get("returnUrl");
      router.push(returnUrl ? decodeURIComponent(returnUrl) : "/dashboard");
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-white overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-cyan-500 blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 h-64 w-64 rounded-full bg-indigo-600 blur-[90px] animate-pulse" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Enterprise Healthcare AI
              </p>
              <h1 className="text-2xl font-bold">FedHealth AI</h1>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight max-w-md">
            Federated, explainable cardiovascular intelligence
          </h2>
          <p className="mt-6 text-slate-400 max-w-md text-lg leading-relaxed">
            Privacy-preserving risk prediction with SHAP explainability, fairness
            governance, and immutable audit trails across hospital networks.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Hospitals", val: "4+" },
            { label: "ROC-AUC", val: "0.79" },
            { label: "Compliance", val: "HIPAA-ready" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3"
            >
              <p className="text-2xl font-bold text-cyan-300">{s.val}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Login card */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl font-bold text-cyan-400">FedHealth AI</h1>
            <p className="text-slate-500 text-sm mt-1">Healthcare AI Platform</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-400">
              Access the clinical analytics workspace with your institutional credentials.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
                  placeholder="admin"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3.5 font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  "Sign in to platform"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Demo: admin / admin123 · doctor / doctor123 · analyst / analyst123
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-600">
            Protected health information — authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
