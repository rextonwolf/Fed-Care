"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const stats = [
  { value: "14K+", label: "Predictions Served" },
  { value: "0.79", label: "ROC-AUC Score" },
  { value: "4", label: "Hospital Clients" },
  { value: "99.9%", label: "Uptime SLA" },
];

const features = [
  {
    title: "Explainable AI",
    description:
      "SHAP-driven attributions and clinical narratives so clinicians understand every high-risk prediction.",
    href: "/explainability",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
    gradient: "from-cyan-500/20 to-teal-500/5",
    border: "border-cyan-500/30",
  },
  {
    title: "Federated Learning",
    description:
      "Train global models across hospitals without moving patient data—privacy by architecture, not policy alone.",
    href: "/federated",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    ),
    gradient: "from-indigo-500/20 to-violet-500/5",
    border: "border-indigo-500/30",
  },
  {
    title: "Bias Monitoring",
    description:
      "Continuous fairness audits across protected attributes with governance-ready compliance scorecards.",
    href: "/fairness",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
      />
    ),
    gradient: "from-violet-500/20 to-purple-500/5",
    border: "border-violet-500/30",
  },
  {
    title: "Audit Compliance",
    description:
      "Immutable prediction logs, model versioning, and regulatory trails for HIPAA and AI governance frameworks.",
    href: "/audit",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
    gradient: "from-emerald-500/20 to-teal-500/5",
    border: "border-emerald-500/30",
  },
];

const architectureLayers = [
  { layer: "Hospital Edge", items: ["Local EHR", "On-prem inference", "DP-SGD training"] },
  { layer: "Federation Hub", items: ["Secure aggregation", "Model sync", "Round orchestration"] },
  { layer: "Governance Cloud", items: ["Fairness audits", "SHAP explainability", "Compliance logs"] },
];

const dashboardPreviews = [
  {
    title: "Risk Dashboard",
    metric: "14,000 predictions",
    href: "/dashboard",
    accent: "cyan",
    bars: [40, 65, 45, 80, 55, 90, 70],
  },
  {
    title: "Explainability",
    metric: "SHAP attributions",
    href: "/explainability",
    accent: "teal",
    bars: [70, 55, 85, 40, 75, 60, 95],
  },
  {
    title: "Federated Monitor",
    metric: "24 active rounds",
    href: "/federated",
    accent: "indigo",
    bars: [50, 70, 60, 85, 65, 75, 88],
  },
  {
    title: "Fairness & Audit",
    metric: "0.91 fairness index",
    href: "/fairness",
    accent: "violet",
    bars: [60, 80, 50, 70, 90, 65, 72],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Fed<span className="text-cyan-400">Health</span> AI
          </span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-slate-400 transition hover:text-white">
            Features
          </a>
          <a href="#architecture" className="text-sm text-slate-400 transition hover:text-white">
            Architecture
          </a>
          <a href="#platform" className="text-sm text-slate-400 transition hover:text-white">
            Platform
          </a>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40"
        >
          Launch Dashboard
        </Link>
      </div>
    </motion.nav>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Ambient gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-[600px] w-[600px] rounded-full bg-indigo-600/25 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Nav />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pt-40">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
            </span>
            Enterprise Healthcare AI · Series A Ready
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-bold leading-[1.1] tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Federated Explainable Healthcare AI Platform
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl"
          >
            Privacy-preserving cardiovascular risk intelligence. Train globally across
            hospital networks with federated learning—explain every prediction, audit every
            decision, and monitor fairness without ever centralizing patient data.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/dashboard"
              className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-500 px-8 py-4 text-center text-base font-semibold text-slate-950 shadow-xl shadow-cyan-500/30 transition sm:w-auto"
            >
              <span className="relative z-10">Launch Dashboard</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition group-hover:translate-x-full duration-700" />
            </Link>
            <Link
              href="/explainability"
              className="w-full rounded-full border border-white/20 bg-white/5 px-8 py-4 text-center text-base font-semibold text-white backdrop-blur-md transition hover:border-cyan-500/50 hover:bg-white/10 sm:w-auto"
            >
              View Analytics
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero glass card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl"
        >
          <div className="rounded-xl border border-white/5 bg-slate-900/80 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs text-slate-500">
                fedhealth.ai · FTTransformer v1.2
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Global ROC-AUC", val: "0.792" },
                { label: "Federated Round", val: "24" },
                { label: "Fairness Index", val: "0.91" },
                { label: "Hospitals Online", val: "3/4" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-cyan-400">{item.val}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Animated stats */}
      <section className="relative border-y border-white/5 bg-slate-900/50 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="text-center"
              >
                <motion.p
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 120, delay: i * 0.1 }}
                  className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
                >
                  {stat.value}
                </motion.p>
                <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">
              Built for Clinical Trust & Scale
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              End-to-end responsible AI—from federated training to bedside explainability.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <Link
                  href={f.href}
                  className={`group block h-full rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-8 backdrop-blur-xl transition hover:border-white/30`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg
                      className="h-6 w-6 text-cyan-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">{f.title}</h3>
                  <p className="mt-3 text-slate-400 leading-relaxed">{f.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-400 opacity-0 transition group-hover:opacity-100">
                    Explore module →
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">Architecture Overview</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Three-tier federated stack—data never leaves the hospital, intelligence travels
              through encrypted gradients.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative space-y-4"
          >
            {architectureLayers.map((layer, i) => (
              <motion.div
                key={layer.layer}
                variants={fadeUp}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 text-sm font-bold">
                      {i + 1}
                    </div>
                    <h3 className="text-xl font-bold">{layer.layer}</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {layer.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-slate-800/80 px-4 py-1.5 text-sm text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {i < architectureLayers.length - 1 && (
                  <div className="absolute -bottom-2 left-1/2 hidden h-4 w-px -translate-x-1/2 bg-gradient-to-b from-cyan-500/50 to-transparent md:block" />
                )}
              </motion.div>
            ))}

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6 text-center text-sm text-slate-400"
            >
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">→</span> TLS 1.3 encrypted channels
              </span>
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">→</span> Differential privacy (ε=1.2)
              </span>
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">→</span> HIPAA-aligned audit trails
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard previews */}
      <section id="platform" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold md:text-4xl">Platform Preview</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Production-ready dashboards for clinicians, data scientists, and compliance officers.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {dashboardPreviews.map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.03 }}
              >
                <Link
                  href={card.href}
                  className="block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:border-cyan-500/40"
                >
                  <div className="border-b border-white/10 bg-slate-900/80 p-4">
                    <p className="text-xs text-slate-500">{card.metric}</p>
                    <p className="font-semibold text-white">{card.title}</p>
                  </div>
                  <div className="flex h-28 items-end gap-1.5 p-4">
                    {card.bars.map((h, j) => (
                      <motion.div
                        key={j}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + j * 0.05, duration: 0.5 }}
                        className={`flex-1 rounded-t-sm bg-gradient-to-t ${
                          card.accent === "cyan"
                            ? "from-cyan-600 to-cyan-400"
                            : card.accent === "teal"
                            ? "from-teal-600 to-teal-400"
                            : card.accent === "indigo"
                            ? "from-indigo-600 to-indigo-400"
                            : "from-violet-600 to-violet-400"
                        } opacity-80`}
                      />
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl px-6 text-center lg:px-8"
        >
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-violet-500/10 p-12 backdrop-blur-xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              Ready to deploy responsible healthcare AI?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join hospital networks already running federated cardiovascular models with full
              explainability and compliance tooling.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg shadow-cyan-500/25"
              >
                Launch Dashboard
              </Link>
              <Link
                href="/prediction"
                className="rounded-full border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                Run Prediction
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="font-bold text-white">
                  Fed<span className="text-cyan-400">Health</span> AI
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-slate-500">
                Federated explainable healthcare AI for hospital networks. Privacy-first by
                design.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Platform
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>
                    <Link href="/dashboard" className="hover:text-cyan-400">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/explainability" className="hover:text-cyan-400">
                      Explainability
                    </Link>
                  </li>
                  <li>
                    <Link href="/federated" className="hover:text-cyan-400">
                      Federated
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Governance
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>
                    <Link href="/fairness" className="hover:text-cyan-400">
                      Fairness
                    </Link>
                  </li>
                  <li>
                    <Link href="/audit" className="hover:text-cyan-400">
                      Audit Logs
                    </Link>
                  </li>
                  <li>
                    <Link href="/prediction" className="hover:text-cyan-400">
                      Prediction
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Compliance
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  <li>HIPAA-ready architecture</li>
                  <li>FDA GMLP aligned</li>
                  <li>EU AI Act monitoring</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-slate-600 sm:flex-row">
            <p>© 2026 FedHealth AI. Demo platform for federated healthcare research.</p>
            <p>Built with Next.js · Federated Learning · SHAP Explainability</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
