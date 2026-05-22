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
import {
  fetchDashboardData,
  getAnalyticsErrorMessage,
  type DashboardData,
  type RecentActivityItem,
} from "../../lib/analytics";

const REFRESH_INTERVAL_MS = 30_000;

const COLORS = ["#22c55e", "#facc15", "#ef4444"];

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-emerald-100 text-emerald-800 border-emerald-200",
  idle: "bg-amber-100 text-amber-800 border-amber-200",
  initializing: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatNumber(value: number, decimals = 0): string {
  if (decimals > 0) return value.toFixed(decimals);
  return value.toLocaleString();
}

function riskBadgeClass(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("high")) {
    return "bg-red-100 text-red-700";
  }
  if (c.includes("medium")) {
    return "bg-yellow-100 text-yellow-700";
  }
  return "bg-green-100 text-green-700";
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const riskPct = (item.predicted_risk * 100).toFixed(1);
  const label = item.risk_category ?? "Unknown";

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-black">
          Prediction #{item.id}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.timestamp
            ? new Date(item.timestamp).toLocaleString()
            : "—"}
          {item.age != null ? ` · Age ${item.age}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium text-gray-700">{riskPct}%</span>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadgeClass(
            item.risk_category
          )}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-10 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setError("No authentication token found. Please log in first.");
      setLoading(false);
      setRefreshing(false);
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
      setError(getAnalyticsErrorMessage(err));
      if (!isRefresh) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);

    const intervalId = setInterval(() => {
      loadDashboard(true);
    }, REFRESH_INTERVAL_MS);

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
  const statusClass =
    STATUS_STYLES[systemStatus] ?? STATUS_STYLES.initializing;

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Healthcare AI Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              Live federated prediction analytics · auto-refresh every 30s
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {metrics && (
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${statusClass}`}
              >
                {metrics.system_status}
              </span>
            )}
            {metrics?.model_version && (
              <span className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                {metrics.model_version}
              </span>
            )}
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
                {refreshing ? " · syncing…" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={loading || refreshing}
              className="text-sm font-medium px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard(!!data)}
              className="text-sm font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {loading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white p-6 rounded-2xl shadow-md">
                <p className="text-gray-500">Total Predictions</p>
                <h2 className="text-4xl font-bold text-black mt-2">
                  {formatNumber(metrics?.total_predictions ?? 0)}
                </h2>
                <p className="text-xs text-gray-400 mt-2">
                  {formatNumber(metrics?.total_logs ?? 0)} audit logs
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-md">
                <p className="text-gray-500">High Risk Patients</p>
                <h2 className="text-4xl font-bold text-red-600 mt-2">
                  {formatNumber(metrics?.high_risk_patients ?? 0)}
                </h2>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-md">
                <p className="text-gray-500">Low Risk Patients</p>
                <h2 className="text-4xl font-bold text-emerald-600 mt-2">
                  {formatNumber(metrics?.low_risk_patients ?? 0)}
                </h2>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-md">
                <p className="text-gray-500">Average Risk Score</p>
                <h2 className="text-4xl font-bold text-black mt-2">
                  {formatNumber(metrics?.average_risk_score ?? 0, 2)}
                </h2>
                <p className="text-xs text-gray-400 mt-2">probability (0–1)</p>
              </div>
            </>
          )}
        </div>

        {/* Population vitals strip */}
        {!loading && analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Avg Blood Pressure
              </p>
              <p className="text-lg font-bold text-black mt-1">
                {analytics.average_blood_pressure.systolic} /{" "}
                {analytics.average_blood_pressure.diastolic}{" "}
                <span className="text-sm font-normal text-gray-500">mmHg</span>
              </p>
            </div>
            <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Avg Cholesterol
              </p>
              <p className="text-lg font-bold text-black mt-1">
                {formatNumber(analytics.average_cholesterol, 1)}
              </p>
            </div>
            <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Avg Patient Age
              </p>
              <p className="text-lg font-bold text-black mt-1">
                {formatNumber(analytics.average_age, 1)} yrs
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold text-black mb-6">
              Risk Distribution
            </h2>

            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
              </div>
            ) : pieData.length === 0 ||
              pieData.every((d) => d.patients === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
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
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
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

          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold text-black mb-6">
              Prediction Trends
            </h2>

            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
              </div>
            ) : trendsData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No trend data for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullDate ?? "")
                    }
                    formatter={(value, name) => {
                      const n = Number(value ?? 0);
                      if (name === "predictions") {
                        return [n, "Predictions"];
                      }
                      return [n.toFixed(3), "Avg risk"];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="predictions"
                    name="Predictions"
                    fill="#000000"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent activity feed */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Recent Activity</h2>
            {!loading && data?.activity && (
              <span className="text-sm text-gray-500">
                {data.activity.count} events
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-3" />
              <p className="text-gray-500 font-medium">Loading activity feed…</p>
            </div>
          ) : !data?.activity.activities.length ? (
            <p className="py-10 text-center text-gray-500">
              No recent predictions. Activity will appear here after inference
              runs.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.activity.activities.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
