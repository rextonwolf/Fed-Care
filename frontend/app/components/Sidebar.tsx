"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUsername, logout } from "../../lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/prediction", label: "Prediction" },
  { href: "/explainability", label: "Explainability" },
  { href: "/fairness", label: "Fairness" },
  { href: "/federated", label: "Federated" },
  { href: "/audit", label: "Audit Logs" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const username = getUsername();

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col text-slate-700 isolate">
      <div className="shrink-0 p-6 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-sky-900">
          FedHealth AI
        </h1>
        <p className="text-xs text-sky-700/70 mt-1 font-medium">
          Clinical workspace
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "app-sidebar-nav-active"
                    : "app-sidebar-nav-item"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="app-sidebar-footer shrink-0 p-6">
        {username ? (
          <p className="text-xs text-sky-800/70 mb-3 truncate">
            Signed in as{" "}
            <span className="text-sky-900 font-semibold">{username}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-xl border border-white/80 bg-white/55 px-3 py-2.5 text-sm font-semibold text-sky-900 shadow-sm backdrop-blur-sm transition hover:bg-white/85 hover:shadow-md active:scale-[0.98]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
