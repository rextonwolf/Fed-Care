"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  fetchFairnessDashboardData,
  getFairnessErrorMessage,
  type FairnessDashboardData,
  type ProtectedGroupStat,
  type SubgroupPositiveRate,
} from "../../lib/fairness";

const REFRESH_INTERVAL_MS = 30_000;
const PARITY_GAP_PASS = 0.1;

const GENDER_COLORS: Record<string, string> = {
  female: "#7c3aed",
  male: "#2563eb",
  unknown: "#94a3b8",
};

const PIE_COLORS = ["#7c3aed", "#2563eb", "#94a3b8", "#0891b2"];

function metricStatusStyle(passed: boolean) {
  return passed
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

function flagFromGap(gap: number): string {
  const abs = Math.abs(gap);
  if (abs >= 0.09) return "Action";
  if (abs >= 0.05) return "Review";
  if (abs >= 0.03) return "Monitor";
  return "OK";
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

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  return "C";
}

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-600";
  return "text-amber-600";
}

function formatAuditTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-primary-soft/40 bg-surface p-5 shadow-sm animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-4" />
      <div className="h-9 bg-slate-200 rounded w-1/2" />
    </div>
  );
}

export default function FairnessPage() {
  const [data, setData] = useState<FairnessDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadFairness = useCallback(async (isRefresh = false) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setError("No authentication token found. Please log in first.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await fetchFairnessDashboardData(90);
      setData(result);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(getFairnessErrorMessage(err));
      if (!isRefresh) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFairness(false);
    const id = setInterval(() => loadFairness(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadFairness]);

  const metrics = data?.metrics;
  const trends = data?.trends;

  const parityPassed = (metrics?.fairness_gap ?? 1) <= PARITY_GAP_PASS;
  const scorePassed = (metrics?.demographic_parity_score ?? 0) >= 0.85;

  const governanceStatus = useMemo(() => {
    if (!metrics) return { label: "Loading", color: "text-slate-600" };
    if (metrics.sample_size === 0) return { label: "Awaiting Data", color: "text-slate-600" };
    if (!parityPassed) return { label: "Review Required", color: "text-amber-700" };
    return { label: "Conditionally Approved", color: "text-emerald-700" };
  }, [metrics, parityPassed]);

  const actionRequiredCount =
    trends?.bias_drift_indicators.filter(
      (b) => b.status === "action_required" || b.severity === "high"
    ).length ?? 0;

  const demographicParityChart = useMemo(() => {
    if (!metrics) return [];
    return metrics.subgroup_positive_prediction_rates
      .filter((s) => s.attribute === "gender")
      .map((s) => ({
        group: s.group,
        positiveRate: s.positive_prediction_rate,
        benchmark: s.benchmark_rate ?? metrics.population_positive_rate,
      }));
  }, [metrics]);

  const genderDistributionPie = useMemo(
    () =>
      metrics?.gender_distribution.map((g) => ({
        name: g.group,
        value: g.count,
        percentage: g.percentage,
      })) ?? [],
    [metrics]
  );

  const fairnessTrendChart = useMemo(
    () =>
      trends?.fairness_metrics_over_time.map((p) => ({
        label: p.date.slice(5),
        fullDate: p.date,
        fairnessIndex: p.demographic_parity_score,
        parityDelta: p.fairness_gap,
        predictions: p.prediction_count,
      })) ?? [],
    [trends]
  );

  const fairnessScorecards = useMemo(() => {
    if (!metrics) return [];

    const genderScore = Math.round(metrics.demographic_parity_score * 100);
    const cards: { dimension: string; score: number; grade: string; trend: string }[] = [
      {
        dimension: "Gender equity",
        score: genderScore,
        grade: gradeFromScore(genderScore),
        trend: `Gap ${metrics.fairness_gap.toFixed(2)}`,
      },
    ];

    const ageGroups = metrics.subgroup_positive_prediction_rates.filter(
      (s) => s.attribute === "age"
    );
    if (ageGroups.length > 0) {
      const rates = ageGroups.map((g) => g.positive_prediction_rate);
      const ageGap = Math.max(...rates) - Math.min(...rates);
      const ageScore = Math.round(Math.max(0, 1 - ageGap) * 100);
      cards.push({
        dimension: "Age fairness",
        score: ageScore,
        grade: gradeFromScore(ageScore),
        trend: `Δ ${ageGap.toFixed(2)}`,
      });
    }

    cards.push({
      dimension: "Population coverage",
      score: Math.min(100, metrics.sample_size),
      grade: metrics.sample_size >= 50 ? "A" : metrics.sample_size >= 10 ? "B" : "C",
      trend: `${metrics.sample_size} predictions`,
    });

    return cards;
  }, [metrics]);

  const protectedTableRows = useMemo(() => {
    if (!metrics) return [];

    const pop = metrics.population_positive_rate;

    const fromGender = metrics.protected_group_statistics.map((stat) =>
      buildTableRow(stat, pop)
    );

    const fromAge = metrics.subgroup_positive_prediction_rates
      .filter((s) => s.attribute === "age")
      .map((s) => buildAgeTableRow(s, pop));

    return [...fromGender, ...fromAge];
  }, [metrics]);

  const complianceItems = useMemo(() => {
    const hasData = (metrics?.sample_size ?? 0) > 0;
    const gapOk = parityPassed;
    return [
      {
        requirement: "Bias audit documentation",
        status: hasData ? "compliant" : "pending",
        ref: "§ FDA GMLP 4.2",
      },
      {
        requirement: "Protected attribute monitoring",
        status: hasData ? "compliant" : "pending",
        ref: "EU AI Act Art. 10",
      },
      {
        requirement: "Demographic parity threshold",
        status: gapOk ? "compliant" : "pending",
        ref: `Gap ≤ ${PARITY_GAP_PASS}`,
      },
      {
        requirement: "Explainability availability",
        status: "compliant",
        ref: "Internal policy 7.1",
      },
      {
        requirement: "Live fairness telemetry",
        status: trends?.computed_at ? "compliant" : "pending",
        ref: "PostgreSQL audit trail",
      },
    ];
  }, [metrics, trends, parityPassed]);

  const mitigations = useMemo(() => {
    const indicators = trends?.bias_drift_indicators ?? [];
    return indicators
      .filter((i) => i.severity !== "low" || i.status === "action_required")
      .map((i) => ({
        priority:
          i.severity === "high"
            ? "High"
            : i.severity === "medium"
            ? "Medium"
            : "Low",
        title: `${i.attribute} — ${i.metric.replace(/_/g, " ")}`,
        action: i.message,
        owner: "Responsible AI Committee",
        eta: "Next review cycle",
        id: i.indicator_id,
      }));
  }, [trends]);

  const kpiCards = metrics
    ? [
        {
          label: "Demographic Parity Score",
          value: metrics.demographic_parity_score.toFixed(2),
          threshold: "≥ 0.85",
          status: scorePassed ? "pass" : "warn",
          detail: "1 − max positive-rate gap across gender groups",
        },
        {
          label: "Fairness Gap (Δ)",
          value: metrics.fairness_gap.toFixed(2),
          threshold: `≤ ${PARITY_GAP_PASS}`,
          status: parityPassed ? "pass" : "warn",
          detail: "Max − min high-risk positive rate by gender",
        },
        {
          label: "Population Positive Rate",
          value: `${(metrics.population_positive_rate * 100).toFixed(1)}%`,
          threshold: "Benchmark cohort",
          status: "pass",
          detail: "Share of high-risk predictions platform-wide",
        },
        {
          label: "Audit Sample Size",
          value: metrics.sample_size.toLocaleString(),
          threshold: "Live prediction logs",
          status: metrics.sample_size > 0 ? "pass" : "warn",
          detail: `Computed ${formatAuditTime(metrics.computed_at)}`,
        },
      ]
    : [];

  return (
    <Layout>
      <div className="min-h-screen app-shell-bg -m-8 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                AI Governance & Ethics
              </span>
              <span className="rounded-full border border-primary-soft bg-surface-solid px-3 py-1 text-xs font-medium text-primary">
                Live Bias Monitoring
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Fairness & Bias Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Responsible AI governance view powered by live prediction-log fairness
              analytics. Auto-refresh every 30 seconds.
            </p>
            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-500">
                Last sync: {lastUpdated.toLocaleTimeString()}
                {refreshing ? " · updating…" : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadFairness(!!data)}
              disabled={loading || refreshing}
              className="text-sm font-medium px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition"
            >
              Refresh
            </button>

            <div className="w-full shrink-0 rounded-2xl border border-primary-soft/60 bg-surface p-5 shadow-sm lg:max-w-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
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
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Ethical AI Status
                  </p>
                  <p className={`text-lg font-bold ${governanceStatus.color}`}>
                    {governanceStatus.label}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Sample: {metrics?.sample_size?.toLocaleString() ?? "—"} predictions
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Last computed: {formatAuditTime(metrics?.computed_at)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Frameworks: FDA GMLP · EU AI Act · HIPAA
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => loadFairness(!!data)}
              className="text-sm font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Fairness metrics cards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fairness Metrics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              kpiCards.map((m) => (
                <div
                  key={m.label}
                  className={`rounded-2xl border border-primary-soft/40 bg-surface p-5 shadow-sm ${metricStatusStyle(m.status === "pass")}`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-slate-600">{m.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                        m.status === "pass" ? "bg-emerald-600" : "bg-amber-600"
                      }`}
                    >
                      {m.status === "pass" ? "PASS" : "REVIEW"}
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{m.value}</p>
                  <p className="mt-1 text-xs text-slate-500">Threshold: {m.threshold}</p>
                  <p className="mt-2 text-xs text-slate-600">{m.detail}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Scorecards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Fairness Scorecards
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
          ) : fairnessScorecards.length === 0 ? (
            <p className="text-sm text-slate-500">No scorecard data available.</p>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                fairnessScorecards.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
              }`}
            >
              {fairnessScorecards.map((card) => (
                <div
                  key={card.dimension}
                  className="rounded-2xl border border-primary-soft/40 bg-surface p-5 shadow-sm"
                >
                  <p className="text-sm font-medium text-text-secondary">{card.dimension}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-3xl font-bold text-slate-900">{card.score}</span>
                    <span className={`text-xl font-bold ${gradeColor(card.grade)}`}>
                      {card.grade}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, card.score)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{card.trend}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Charts row 1 */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Subgroup Positive Rates
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              High-risk positive rate by gender vs. population benchmark
            </p>
            {loading ? (
              <ChartSpinner />
            ) : demographicParityChart.length === 0 ? (
              <EmptyChart message="No gender subgroup data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={demographicParityChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis
                    domain={[0, "auto"]}
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
                  {metrics && (
                    <ReferenceLine
                      y={metrics.population_positive_rate}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: "Population", fill: "#64748b", fontSize: 11 }}
                    />
                  )}
                  <Bar
                    dataKey="positiveRate"
                    name="Positive Rate"
                    fill="#7c3aed"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="benchmark"
                    name="Benchmark"
                    fill="#cbd5e1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Gender Distribution</h2>
            <p className="mb-6 text-sm text-slate-500">
              Prediction volume share across gender cohorts (live logs)
            </p>
            {loading ? (
              <ChartSpinner />
            ) : genderDistributionPie.length === 0 ? (
              <EmptyChart message="No gender distribution data." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderDistributionPie}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {genderDistributionPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${value} (${item?.payload?.percentage ?? 0}%)`,
                      item?.payload?.name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        {/* Risk by gender */}
        <section className="mb-8 rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Risk Distribution by Gender</h2>
          <p className="mb-6 text-sm text-slate-500">
            Predicted risk tier counts by gender cohort
          </p>
          {loading ? (
            <ChartSpinner />
          ) : !metrics?.risk_distribution_by_gender.length ? (
            <EmptyChart message="No risk distribution data." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.risk_distribution_by_gender}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar
                  dataKey="female"
                  name="Female"
                  fill={GENDER_COLORS.female}
                  stackId="a"
                />
                <Bar dataKey="male" name="Male" fill={GENDER_COLORS.male} stackId="a" />
                <Bar
                  dataKey="unknown"
                  name="Unknown"
                  fill={GENDER_COLORS.unknown}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Fairness trend */}
        <section className="mb-8 rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Fairness Trend</h2>
          <p className="mb-6 text-sm text-slate-500">
            Daily demographic parity score and fairness gap (lower gap is better)
          </p>
          {loading ? (
            <ChartSpinner height={280} />
          ) : fairnessTrendChart.length === 0 ? (
            <EmptyChart message="No trend data for the selected period." height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={fairnessTrendChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  domain={[0, 1]}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "auto"]}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullDate ?? "")
                  }
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
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
                  name="Parity Score"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="parityDelta"
                  name="Fairness Gap"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Bias indicators + compliance */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Bias Drift Indicators</h2>
              {!loading && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    actionRequiredCount > 0
                      ? "bg-red-100 text-red-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {actionRequiredCount > 0
                    ? `${actionRequiredCount} action required`
                    : "Within thresholds"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading indicators…</div>
            ) : !trends?.bias_drift_indicators.length ? (
              <p className="text-sm text-slate-500 py-6">
                No drift indicators — insufficient historical window for comparison.
              </p>
            ) : (
              <div className="space-y-3">
                {trends.bias_drift_indicators.map((b) => (
                  <div
                    key={b.indicator_id}
                    className="rounded-xl border border-primary-soft/40 bg-surface/80 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          {b.indicator_id}
                        </span>
                        <span className="font-semibold text-slate-900 capitalize">
                          {b.attribute}
                        </span>
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
                        Drift: <strong className="text-slate-700">{b.drift_delta.toFixed(3)}</strong>
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
            )}
          </section>

          <section className="rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
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
                  className="flex items-center justify-between rounded-xl border border-primary-soft/40 bg-surface-solid px-4 py-3"
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
            <div className="mt-4 rounded-lg border border-primary-soft/50 bg-primary-soft/60 p-3 text-xs text-primary">
              <strong>Telemetry:</strong> fairness metrics computed from PostgreSQL
              prediction logs · Responsible AI committee sign-off required for production
              deployment.
            </div>
          </section>
        </div>

        {/* Mitigations from drift */}
        {!loading && mitigations.length > 0 && (
          <section className="mb-8 rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Mitigation Recommendations
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              Prioritized actions derived from live bias drift indicators
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {mitigations.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-primary-soft/40 bg-surface p-5 shadow-sm"
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
        )}

        {/* Protected attribute table */}
        <section className="rounded-2xl border border-primary-soft/40 bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">
            Protected Group Analytics
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            Live performance and disparity metrics from stored prediction cohorts
          </p>
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 border-4 border-primary-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-text-secondary">Loading protected group statistics…</p>
            </div>
          ) : protectedTableRows.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No protected-group records yet. Run predictions to populate analytics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-soft/40 bg-surface-solid text-xs uppercase tracking-wider text-text-secondary">
                    <th className="py-3 pl-4 pr-2 font-bold">Attribute</th>
                    <th className="px-2 py-3 font-bold">Sample Size</th>
                    <th className="px-2 py-3 font-bold">Positive Rate</th>
                    <th className="px-2 py-3 font-bold">Avg Risk</th>
                    <th className="px-2 py-3 font-bold">Avg Age</th>
                    <th className="px-2 py-3 font-bold">Parity Gap</th>
                    <th className="px-2 py-3 font-bold">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {protectedTableRows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-t border-slate-100 hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3 pl-4 pr-2 font-medium text-slate-900">
                        {row.attribute}
                      </td>
                      <td className="px-2 text-slate-700">{row.sampleSize}</td>
                      <td className="px-2 text-slate-700">{row.positiveRate}</td>
                      <td className="px-2 font-mono text-slate-700">{row.avgRisk}</td>
                      <td className="px-2 text-slate-700">{row.avgAge}</td>
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
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Live fairness telemetry from federated healthcare prediction logs. For formal
          regulatory bias assessment, engage your institutional compliance and legal review
          process.
        </p>
      </div>
    </Layout>
  );
}

function ChartSpinner({ height = 300 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height }}
    >
      <div className="h-10 w-10 border-4 border-primary-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function EmptyChart({ message, height = 300 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-slate-500 text-sm"
      style={{ height }}
    >
      {message}
    </div>
  );
}

function buildTableRow(stat: ProtectedGroupStat, popRate: number) {
  const gap = stat.positive_prediction_rate - popRate;
  return {
    key: `gender-${stat.group}`,
    attribute: `${stat.attribute} — ${stat.group}`,
    sampleSize: stat.count.toLocaleString(),
    positiveRate: `${(stat.positive_prediction_rate * 100).toFixed(1)}%`,
    avgRisk: stat.average_risk_score.toFixed(3),
    avgAge: stat.average_age.toFixed(1),
    parityGap: gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2),
    flag: flagFromGap(gap),
  };
}

function buildAgeTableRow(sub: SubgroupPositiveRate, popRate: number) {
  const gap = sub.positive_prediction_rate - popRate;
  return {
    key: `age-${sub.group}`,
    attribute: `age — ${sub.group}`,
    sampleSize: sub.count.toLocaleString(),
    positiveRate: `${(sub.positive_prediction_rate * 100).toFixed(1)}%`,
    avgRisk: "—",
    avgAge: "—",
    parityGap: gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2),
    flag: flagFromGap(gap),
  };
}
