"use client";

import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { useRouter } from "next/navigation";
import {
  fetchDashboardData,
  getAnalyticsErrorMessage,
  hasAuthToken,
  type DashboardData,
  type RecentActivityItem,
} from "../../lib/analytics";
import { isAuthenticated } from "../../lib/auth";
import {
  StaggerContainer,
  AnimatedCard,
  ViewportFadeIn,
  ListItem,
  AnimatedNumber,
} from "../components/MotionLibrary";

const REFRESH_INTERVAL_MS = 30_000;

const CHART_COLORS = ["#10b981", "#38bdf8", "#f43f5e"];
const CHART_SKY = "#0ea5e9";
const CHART_GRID = "rgba(148, 163, 184, 0.25)";

function statusPillClass(status: string): string {
  if (status === "operational") return "status-pill-glass status-pill-glass--operational";
  if (status === "idle") return "status-pill-glass status-pill-glass--idle";
  return "status-pill-glass";
}

function formatNumber(value: number, decimals = 0): string {
  if (decimals > 0) return value.toFixed(decimals);
  return value.toLocaleString();
}

function riskBadgeClass(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("high")) return "risk-pill risk-pill--high";
  if (c.includes("medium")) return "risk-pill risk-pill--medium";
  return "risk-pill risk-pill--low";
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const riskPct = (item.predicted_risk * 100).toFixed(1);
  const label = item.risk_category ?? "Unknown";

  return (
    <div className="flex items-center justify-between py-3 border-b border-sky-100/80 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-sky-950">
          Prediction #{item.id}
        </p>
        <p className="text-xs text-sky-800/60 mt-0.5">
          {item.timestamp
            ? new Date(item.timestamp).toLocaleString()
            : "—"}
          {item.age != null ? ` · Age ${item.age}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-sky-900 ds-font-mono">
          {riskPct}%
        </span>
        <span className={riskBadgeClass(item.risk_category)}>{label}</span>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="liquid-glass-kpi animate-pulse">
      <div className="h-4 bg-sky-200/60 rounded-lg w-2/3 mb-4" />
      <div className="h-10 bg-sky-200/60 rounded-lg w-1/2" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated() || !hasAuthToken()) {
      setError("No authentication token found. Please log in first.");
      setLoading(false);
      setRefreshing(false);
      router.replace("/login?returnUrl=%2Fdashboard");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchDashboardData();
      setData(result);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message = getAnalyticsErrorMessage(err);
      setError(message);
      if (
        message.includes("unauthorized") ||
        message.includes("Session expired")
      ) {
        router.replace("/login?returnUrl=%2Fdashboard");
      }
      if (!isRefresh) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard(false);
    const intervalId = setInterval(() => loadDashboard(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadDashboard]);

  const metrics = data?.metrics;
  const analytics = data?.analytics;

  const pieData =
    analytics?.risk_distribution.map((item) => ({
      name: item.category,
      patients: item.count,
      percentage: item.percentage,
    })) ?? [];

  const trendsData =
    analytics?.prediction_trends.map((point) => ({
      date: point.date.slice(5),
      fullDate: point.date,
      predictions: point.count,
      avgRisk: point.average_risk_score,
    })) ?? [];

  const systemStatus = metrics?.system_status ?? "initializing";

  return (
    <Layout>
      <div className="page-enter max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <span className="status-pill status-pill--primary mb-3">
              Live analytics
            </span>
            <h1 className="ds-heading-page text-sky-950">
              Healthcare AI Dashboard
            </h1>
            <p className="ds-text-support mt-2">
              Federated prediction telemetry · auto-refresh every 30s
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {metrics && (
              <span className={statusPillClass(systemStatus)}>
                {metrics.system_status}
              </span>
            )}
            {metrics?.model_version && (
              <span className="status-pill-glass">{metrics.model_version}</span>
            )}
            {lastUpdated && (
              <span className="ds-text-caption">
                Updated {lastUpdated.toLocaleTimeString()}
                {refreshing ? " · syncing…" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={loading || refreshing}
              className="btn-liquid-primary"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="liquid-glass-error mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard(!!data)}
              className="text-sm font-semibold text-sky-700 hover:text-sky-900 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <StaggerContainer
          className="ds-grid-metrics mb-10"
          delay={0.2}
          staggerValue={0.08}
        >
          {loading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <AnimatedCard className="liquid-glass-kpi soft-hover">
                <p className="ds-label-telemetry">Total Predictions</p>
                <p className="ds-metric-value text-sky-950 mt-2">
                  <AnimatedNumber
                    value={metrics?.total_predictions ?? 0}
                    duration={0.8}
                  />
                </p>
                <p className="ds-text-caption mt-2">
                  {formatNumber(metrics?.total_logs ?? 0)} audit logs
                </p>
              </AnimatedCard>

              <AnimatedCard className="liquid-glass-kpi soft-hover">
                <p className="ds-label-telemetry">High Risk</p>
                <p className="ds-metric-value text-rose-600 mt-2">
                  <AnimatedNumber
                    value={metrics?.high_risk_patients ?? 0}
                    duration={0.8}
                  />
                </p>
              </AnimatedCard>

              <AnimatedCard className="liquid-glass-kpi soft-hover">
                <p className="ds-label-telemetry">Low Risk</p>
                <p className="ds-metric-value text-emerald-600 mt-2">
                  <AnimatedNumber
                    value={metrics?.low_risk_patients ?? 0}
                    duration={0.8}
                  />
                </p>
              </AnimatedCard>

              <AnimatedCard className="liquid-glass-kpi soft-hover">
                <p className="ds-label-telemetry">Avg Risk Score</p>
                <p className="ds-metric-value text-sky-900 mt-2">
                  <AnimatedNumber
                    value={metrics?.average_risk_score ?? 0}
                    duration={0.8}
                    decimals={2}
                  />
                </p>
                <p className="ds-text-caption mt-2">probability (0–1)</p>
              </AnimatedCard>
            </>
          )}
        </StaggerContainer>

        {!loading && analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="liquid-glass-strip">
              <p className="ds-label-telemetry">Avg Blood Pressure</p>
              <p className="text-lg font-bold text-sky-950 mt-1 ds-font-mono">
                {analytics.average_blood_pressure.systolic} /{" "}
                {analytics.average_blood_pressure.diastolic}
                <span className="ds-metric-unit">mmHg</span>
              </p>
            </div>
            <div className="liquid-glass-strip">
              <p className="ds-label-telemetry">Avg Cholesterol</p>
              <p className="text-lg font-bold text-sky-950 mt-1 ds-font-mono">
                {formatNumber(analytics.average_cholesterol, 1)}
              </p>
            </div>
            <div className="liquid-glass-strip">
              <p className="ds-label-telemetry">Avg Patient Age</p>
              <p className="text-lg font-bold text-sky-950 mt-1 ds-font-mono">
                {formatNumber(analytics.average_age, 1)}
                <span className="ds-metric-unit">yrs</span>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <ViewportFadeIn delay={0.2}>
            <div className="liquid-glass-panel">
              <h2 className="ds-heading-card text-sky-950 mb-6">Risk Distribution</h2>

              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full liquid-spinner animate-spin" />
                </div>
              ) : pieData.length === 0 || pieData.every((d) => d.patients === 0) ? (
                <div className="h-[300px] flex items-center justify-center ds-text-support">
                  No prediction data yet. Run predictions to populate charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="patients"
                      nameKey="name"
                      outerRadius={110}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(186,230,253,0.8)",
                        borderRadius: "12px",
                        backdropFilter: "blur(12px)",
                      }}
                      formatter={(value, _name, item) => {
                        const count = Number(value ?? 0);
                        const pct = item?.payload?.percentage ?? 0;
                        const label = item?.payload?.name ?? "Risk";
                        return [`${count} patients (${pct}%)`, label];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ViewportFadeIn>

          <ViewportFadeIn delay={0.3}>
            <div className="liquid-glass-panel">
              <h2 className="ds-heading-card text-sky-950 mb-6">Prediction Trends</h2>

              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full liquid-spinner animate-spin" />
                </div>
              ) : trendsData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center ds-text-support">
                  No trend data for the selected period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(186,230,253,0.8)",
                      borderRadius: "12px",
                    }}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullDate ?? "")
                    }
                    formatter={(value, name) => {
                      const n = Number(value ?? 0);
                      if (name === "predictions") return [n, "Predictions"];
                      return [n.toFixed(3), "Avg risk"];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="predictions"
                    name="Predictions"
                    fill={CHART_SKY}
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            </div>
          </ViewportFadeIn>
        </div>

        <div className="liquid-glass-panel">
          <div className="flex items-center justify-between mb-6">
            <h2 className="ds-heading-card text-sky-950">Recent Activity</h2>
            {!loading && data?.activity && (
              <span className="status-pill-glass">{data.activity.count} events</span>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="h-8 w-8 rounded-full liquid-spinner animate-spin mb-3" />
              <p className="ds-text-support font-medium">Loading activity feed…</p>
            </div>
          ) : !data?.activity.activities.length ? (
            <p className="py-10 text-center ds-text-support">
              No recent predictions. Activity will appear after inference runs.
            </p>
          ) : (
            <div>
              {data.activity.activities.map((item, idx) => (
                <ListItem
                  key={item.id}
                  delay={idx * 0.05}
                  variant="slideInLeft"
                  hoverTranslate={4}
                >
                  <ActivityRow item={item} />
                </ListItem>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
