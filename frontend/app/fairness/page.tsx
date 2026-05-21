"use client";

import Layout from "../components/Layout";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

const auditMeta = {
  modelVersion: "FTTransformer v1.2.4",
  lastAudit: "5/21/2026 2:30 PM",
  nextReview: "6/21/2026",
  framework: "FDA GMLP · EU AI Act · HIPAA",
};

const fairnessMetrics = [
  {
    label: "Overall Fairness Index",
    value: "0.91",
    threshold: "≥ 0.85",
    status: "pass",
    detail: "Weighted composite across protected attributes",
  },
  {
    label: "Demographic Parity Δ",
    value: "0.06",
    threshold: "≤ 0.10",
    status: "pass",
    detail: "Max positive rate gap between groups",
  },
  {
    label: "Equalized Odds Δ",
    value: "0.08",
    threshold: "≤ 0.10",
    status: "pass",
    detail: "TPR/FPR disparity across cohorts",
  },
  {
    label: "Calibration Error",
    value: "0.04",
    threshold: "≤ 0.05",
    status: "pass",
    detail: "Predicted vs. observed risk alignment",
  },
];

const demographicParityData = [
  { group: "Female", positiveRate: 0.34, benchmark: 0.32 },
  { group: "Male", positiveRate: 0.38, benchmark: 0.32 },
  { group: "Non-binary", positiveRate: 0.33, benchmark: 0.32 },
  { group: "Unknown", positiveRate: 0.31, benchmark: 0.32 },
];

const genderRiskDistribution = [
  { category: "Low Risk", female: 42, male: 38, nonBinary: 44 },
  { category: "Medium Risk", female: 31, male: 34, nonBinary: 30 },
  { category: "High Risk", female: 27, male: 28, nonBinary: 26 },
];

const fairnessTrend = [
  { month: "Jan", fairnessIndex: 0.86, parityDelta: 0.11 },
  { month: "Feb", fairnessIndex: 0.87, parityDelta: 0.1 },
  { month: "Mar", fairnessIndex: 0.88, parityDelta: 0.09 },
  { month: "Apr", fairnessIndex: 0.89, parityDelta: 0.08 },
  { month: "May", fairnessIndex: 0.91, parityDelta: 0.06 },
];

const biasIndicators = [
  {
    id: "BIAS-01",
    attribute: "Gender",
    severity: "low",
    metric: "Demographic parity",
    gap: "0.04",
    status: "within_threshold",
    message: "Male cohort shows +4% higher positive rate vs. female",
  },
  {
    id: "BIAS-02",
    attribute: "Age (65+)",
    severity: "medium",
    metric: "False negative rate",
    gap: "0.07",
    status: "monitor",
    message: "Senior patients under-flagged for high risk in validation set",
  },
  {
    id: "BIAS-03",
    attribute: "Race/Ethnicity",
    severity: "low",
    metric: "Equalized odds",
    gap: "0.05",
    status: "within_threshold",
    message: "TPR gap across racial groups within institutional policy",
  },
  {
    id: "BIAS-04",
    attribute: "Insurance type",
    severity: "high",
    metric: "Calibration",
    gap: "0.09",
    status: "action_required",
    message: "Medicaid cohort shows miscalibration at high-risk threshold",
  },
];

const fairnessScorecards = [
  { dimension: "Gender equity", score: 92, grade: "A", trend: "↑ 3 pts" },
  { dimension: "Age fairness", score: 85, grade: "B+", trend: "↑ 1 pt" },
  { dimension: "Racial equity", score: 88, grade: "A-", trend: "stable" },
  { dimension: "Socioeconomic", score: 78, grade: "B", trend: "↓ 2 pts" },
  { dimension: "Geographic", score: 94, grade: "A", trend: "↑ 4 pts" },
];

const complianceItems = [
  { requirement: "Bias audit documentation", status: "compliant", ref: "§ FDA GMLP 4.2" },
  { requirement: "Protected attribute monitoring", status: "compliant", ref: "EU AI Act Art. 10" },
  { requirement: "Human oversight workflow", status: "compliant", ref: "Institutional IRB" },
  { requirement: "Explainability availability", status: "compliant", ref: "Internal policy 7.1" },
  { requirement: "Calibration recertification", status: "pending", ref: "Q2 2026 review" },
];

const protectedAttributeTable = [
  {
    attribute: "Gender — Female",
    sampleSize: "18,200",
    positiveRate: "34%",
    tpr: "0.81",
    fpr: "0.12",
    parityGap: "—",
    flag: "OK",
  },
  {
    attribute: "Gender — Male",
    sampleSize: "19,400",
    positiveRate: "38%",
    tpr: "0.84",
    fpr: "0.14",
    parityGap: "+0.04",
    flag: "Monitor",
  },
  {
    attribute: "Age — Under 50",
    sampleSize: "14,100",
    positiveRate: "28%",
    tpr: "0.79",
    fpr: "0.10",
    parityGap: "—",
    flag: "OK",
  },
  {
    attribute: "Age — 50–64",
    sampleSize: "12,800",
    positiveRate: "35%",
    tpr: "0.82",
    fpr: "0.13",
    parityGap: "+0.03",
    flag: "OK",
  },
  {
    attribute: "Age — 65+",
    sampleSize: "10,700",
    positiveRate: "41%",
    tpr: "0.76",
    fpr: "0.15",
    parityGap: "+0.07",
    flag: "Review",
  },
  {
    attribute: "Race — White",
    sampleSize: "22,100",
    positiveRate: "33%",
    tpr: "0.83",
    fpr: "0.13",
    parityGap: "—",
    flag: "OK",
  },
  {
    attribute: "Race — Black",
    sampleSize: "8,400",
    positiveRate: "36%",
    tpr: "0.80",
    fpr: "0.14",
    parityGap: "+0.03",
    flag: "OK",
  },
  {
    attribute: "Insurance — Medicaid",
    sampleSize: "6,200",
    positiveRate: "39%",
    tpr: "0.74",
    fpr: "0.16",
    parityGap: "+0.09",
    flag: "Action",
  },
];

const mitigations = [
  {
    priority: "High",
    title: "Recalibrate Medicaid cohort predictions",
    action:
      "Apply Platt scaling on held-out validation split; target calibration error ≤ 0.05 before next deployment.",
    owner: "Model Risk Committee",
    eta: "5/28/2026",
  },
  {
    priority: "Medium",
    title: "Age-stratified threshold review",
    action:
      "Evaluate age-adjusted decision thresholds for 65+ patients to reduce false negative disparity.",
    owner: "Clinical AI Governance",
    eta: "6/05/2026",
  },
  {
    priority: "Low",
    title: "Expand gender category reporting",
    action:
      "Increase non-binary sample representation in federated round 25 training cohort.",
    owner: "Data Stewardship",
    eta: "6/15/2026",
  },
];

const GENDER_COLORS = { female: "#7c3aed", male: "#2563eb", nonBinary: "#0891b2" };

function metricStatusStyle(status: string) {
  return status === "pass"
    ? "border-emerald-200 bg-emerald-50"
    : "border-amber-200 bg-amber-50";
}

function severityStyle(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function flagStyle(flag: string) {
  switch (flag) {
    case "Action":
      return "bg-red-100 text-red-700";
    case "Review":
      return "bg-amber-100 text-amber-700";
    case "Monitor":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-600";
  return "text-amber-600";
}

export default function FairnessPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-slate-50 to-slate-100 -m-8 p-6 md:p-8">
        {/* Header — AI governance */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-800">
                AI Governance & Ethics
              </span>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Bias Monitoring
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Fairness & Bias Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Enterprise compliance view of model fairness across protected attributes.
              Mock healthcare analytics for ethical AI oversight and regulatory readiness.
            </p>
          </div>

          <div className="w-full shrink-0 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm lg:max-w-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Ethical AI Status</p>
                <p className="text-lg font-bold text-emerald-700">Conditionally Approved</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Model: {auditMeta.modelVersion} · Last audit: {auditMeta.lastAudit}
            </p>
            <p className="mt-1 text-xs text-slate-500">Frameworks: {auditMeta.framework}</p>
          </div>
        </div>

        {/* Fairness metrics cards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fairness Metrics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {fairnessMetrics.map((m) => (
              <div
                key={m.label}
                className={`rounded-2xl border p-5 shadow-sm ${metricStatusStyle(m.status)}`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-600">{m.label}</p>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    PASS
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">{m.value}</p>
                <p className="mt-1 text-xs text-slate-500">Threshold: {m.threshold}</p>
                <p className="mt-2 text-xs text-slate-600">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fairness scorecards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fairness Scorecards
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {fairnessScorecards.map((card) => (
              <div
                key={card.dimension}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-600">{card.dimension}</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-bold text-slate-900">{card.score}</span>
                  <span className={`text-xl font-bold ${gradeColor(card.grade)}`}>
                    {card.grade}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${card.score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{card.trend}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Charts */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Demographic Parity</h2>
            <p className="mb-6 text-sm text-slate-500">
              High-risk positive rate by gender vs. institutional benchmark (32%)
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographicParityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  domain={[0, 0.5]}
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => {
                    const n = Number(value ?? 0);
                    return [`${(n * 100).toFixed(1)}%`, ""];
                  }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Legend />
                <ReferenceLine
                  y={0.32}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: "Benchmark", fill: "#64748b", fontSize: 11 }}
                />
                <Bar dataKey="positiveRate" name="Positive Rate" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="benchmark" name="Benchmark" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Gender Risk Distribution</h2>
            <p className="mb-6 text-sm text-slate-500">
              Predicted risk category distribution (%) by gender cohort
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genderRiskDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} stackId="a" />
                <Bar dataKey="male" name="Male" fill={GENDER_COLORS.male} stackId="a" />
                <Bar dataKey="nonBinary" name="Non-binary" fill={GENDER_COLORS.nonBinary} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* Fairness trend */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Fairness Trend</h2>
          <p className="mb-6 text-sm text-slate-500">
            Monthly fairness index and demographic parity delta (lower parity delta is better)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={fairnessTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                domain={[0.8, 1]}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 0.15]}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Legend />
              <ReferenceLine
                yAxisId="left"
                y={0.85}
                stroke="#059669"
                strokeDasharray="4 4"
                label={{ value: "Min fairness", fill: "#059669", fontSize: 10 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="fairnessIndex"
                name="Fairness Index"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="parityDelta"
                name="Parity Δ"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Bias indicators + compliance */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Bias Detection Indicators</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                1 action required
              </span>
            </div>
            <div className="space-y-3">
              {biasIndicators.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{b.id}</span>
                      <span className="font-semibold text-slate-900">{b.attribute}</span>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${severityStyle(b.severity)}`}
                    >
                      {b.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{b.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>
                      Metric: <strong className="text-slate-700">{b.metric}</strong>
                    </span>
                    <span>
                      Gap: <strong className="text-slate-700">{b.gap}</strong>
                    </span>
                    <span
                      className={
                        b.status === "action_required"
                          ? "font-semibold text-red-600"
                          : b.status === "monitor"
                          ? "font-semibold text-amber-600"
                          : "font-semibold text-emerald-600"
                      }
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-700 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Model Compliance</h2>
            </div>
            <div className="space-y-3">
              {complianceItems.map((item) => (
                <div
                  key={item.requirement}
                  className="flex items-center justify-between rounded-xl border border-violet-100 bg-white/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.requirement}</p>
                    <p className="text-xs text-slate-500">{item.ref}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.status === "compliant"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-xs text-violet-900">
              <strong>Next scheduled review:</strong> {auditMeta.nextReview} · Responsible AI
              committee sign-off required for production deployment.
            </div>
          </section>
        </div>

        {/* Mitigation panel */}
        <section className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Mitigation Recommendations</h2>
          <p className="mb-6 text-sm text-slate-600">
            Prioritized actions from bias audit — assign owners before next model release
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {mitigations.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm"
              >
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                    m.priority === "High"
                      ? "bg-red-100 text-red-700"
                      : m.priority === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.priority} priority
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{m.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{m.action}</p>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <p>
                    Owner: <span className="font-medium text-slate-700">{m.owner}</span>
                  </p>
                  <p className="mt-1">
                    Target: <span className="font-medium text-slate-700">{m.eta}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Protected attribute table */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">
            Protected Attribute Comparison
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Performance and disparity metrics across federally protected and institutional
            sensitive attributes
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                  <th className="py-3 pl-4 pr-2 font-bold">Attribute</th>
                  <th className="px-2 py-3 font-bold">Sample Size</th>
                  <th className="px-2 py-3 font-bold">Positive Rate</th>
                  <th className="px-2 py-3 font-bold">TPR</th>
                  <th className="px-2 py-3 font-bold">FPR</th>
                  <th className="px-2 py-3 font-bold">Parity Gap</th>
                  <th className="px-2 py-3 font-bold">Flag</th>
                </tr>
              </thead>
              <tbody>
                {protectedAttributeTable.map((row) => (
                  <tr
                    key={row.attribute}
                    className="border-t border-slate-100 hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 pl-4 pr-2 font-medium text-slate-900">
                      {row.attribute}
                    </td>
                    <td className="px-2 text-slate-700">{row.sampleSize}</td>
                    <td className="px-2 text-slate-700">{row.positiveRate}</td>
                    <td className="px-2 font-mono text-slate-700">{row.tpr}</td>
                    <td className="px-2 font-mono text-slate-700">{row.fpr}</td>
                    <td className="px-2 font-mono text-slate-700">{row.parityGap}</td>
                    <td className="px-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${flagStyle(row.flag)}`}
                      >
                        {row.flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Mock fairness analytics for federated healthcare AI governance. Not a substitute for
          formal regulatory bias assessment or legal compliance review.
        </p>
      </div>
    </Layout>
  );
}
