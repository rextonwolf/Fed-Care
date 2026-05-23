"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import {
  fetchDatasetUploads,
  uploadDatasetFile,
  type DatasetUpload,
} from "../../lib/datasets";
import { isAuthenticated } from "../../lib/auth";
import {
  StaggerContainer,
  AnimatedCard,
  ListItem,
  AnimatedNumber,
  EntranceChip,
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
        <EntranceChip className={riskBadgeClass(item.risk_category)}>
          {label}
        </EntranceChip>
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
  const [uploads, setUploads] = useState<DatasetUpload[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

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

  const loadUploads = useCallback(async () => {
    try {
      const result = await fetchDatasetUploads();
      setUploads(result);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to fetch uploads."
      );
    }
  }, []);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    setUploadSuccessMessage(null);

    if (!selectedFile) {
      setUploadError("Select a CSV file before uploading.");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      await uploadDatasetFile(selectedFile, (percentage) => {
        setUploadProgress(percentage);
      });

      setUploadStatus("success");
      setUploadSuccessMessage(
        `Dataset ${selectedFile.name} uploaded for federated simulation.`
      );
      setSelectedFile(null);
      setUploadProgress(100);
      await loadUploads();
    } catch (uploadError: unknown) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setUploadStatus("error");
      setUploadError(message);
    }
  };

  useEffect(() => {
    loadDashboard(false);
    loadUploads();
    const intervalId = setInterval(() => loadDashboard(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadDashboard, loadUploads]);

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        >
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
        </motion.div>

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
          <AnimatedCard delay={0.12} className="liquid-glass-panel soft-hover glow-hover">
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
          </AnimatedCard>

          <AnimatedCard delay={0.18} className="liquid-glass-panel soft-hover glow-hover">
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
          </AnimatedCard>
        </div>

        <AnimatedCard delay={0.24} className="liquid-glass-panel soft-hover glow-hover">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="ds-heading-card text-sky-950">Validated Dataset Upload</h2>
              <p className="ds-text-support mt-2 max-w-xl">
                Validated local hospital records prepared for federated training rounds.
                Upload sanitized CSV datasets from your local hospital for future simulation and enterprise readiness.
              </p>
            </div>
            <span className="status-pill status-pill--primary">Premium feature</span>
          </div>

          <form onSubmit={handleUpload} className="grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-sky-900">Choose CSV file</span>
              <input
                type="file"
                accept=".csv"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setUploadError(null);
                  setUploadSuccessMessage(null);
                  setUploadStatus("idle");
                  setUploadProgress(0);
                }}
                className="mt-3 block w-full text-sm text-sky-950 file:rounded-full file:border-0 file:px-4 file:py-2 file:bg-sky-800 file:text-white file:shadow-lg file:shadow-sky-500/20"
              />
            </label>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={uploadStatus === "uploading" || !selectedFile}
                className="btn-liquid-primary w-full md:w-auto"
              >
                {uploadStatus === "uploading" ? "Uploading…" : "Upload dataset"}
              </button>

              <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-sky-700 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-sky-700/80">
                <span>{uploadProgress}% complete</span>
                <span>{uploadStatus === "success" ? "Ready for federation" : "CSV only"}</span>
              </div>
            </div>

            {uploadError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700">
                {uploadError}
              </div>
            )}
            {uploadSuccessMessage && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
                {uploadSuccessMessage}
              </div>
            )}
          </form>

          <div className="mt-8">
            <p className="ds-label-telemetry mb-3">Recent dataset uploads</p>
            {uploads.length === 0 ? (
              <div className="rounded-3xl border border-sky-200/90 bg-sky-100/20 p-5 text-sky-900">
                No validated uploads yet. Hospital users will see only their own datasets.
              </div>
            ) : (
              <div className="grid gap-3">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="rounded-3xl border border-sky-200/70 bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sky-950">{upload.filename}</p>
                        <p className="text-xs text-sky-700 mt-1">
                          Uploaded by {upload.uploaded_by}
                        </p>
                      </div>
                      <span className="text-xs text-sky-500">
                        {new Date(upload.upload_timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.24} className="liquid-glass-panel soft-hover glow-hover">
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
        </AnimatedCard>
      </div>
    </Layout>
  );
}
