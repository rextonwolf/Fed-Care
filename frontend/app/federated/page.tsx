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
} from "recharts";
import {
  fetchFederatedDashboardData,
  getFederatedErrorMessage,
  type FederatedDashboardData,
  type FederatedClient,
} from "../../lib/federated";

const REFRESH_INTERVAL_MS = 30_000;

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online
          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
          : "bg-slate-400"
      }`}
    />
  );
}

function stepStatusStyle(status: string) {
  switch (status) {
    case "complete":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "in_progress":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function activityStatusStyle(status: string) {
  switch (status) {
    case "Online":
      return "bg-emerald-100 text-emerald-700";
    case "Syncing":
      return "bg-amber-100 text-amber-700";
    case "Offline":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function syncProgressFromState(state: string): number {
  if (state === "synchronized") return 100;
  if (state === "syncing") return 65;
  return 0;
}

function isClientOnline(state: string): boolean {
  return state !== "offline";
}

function activityLabel(state: string): string {
  if (state === "synchronized") return "Online";
  if (state === "syncing") return "Syncing";
  return "Offline";
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatRelativeActive(iso: string | null | undefined): string {
  if (!iso) return "No activity";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return formatTimestamp(iso);
}

function shortHospitalName(name: string): string {
  return name.replace(/ Hospital| Medical Center| Health Network| Community Hospital/g, "").trim();
}

function syncStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function syncStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    synchronized: "Synchronized",
    partial_sync: "Partial Sync",
    degraded: "Degraded",
    initializing: "Initializing",
  };
  return map[status] ?? syncStatusLabel(status);
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-slate-200 rounded w-1/2" />
    </div>
  );
}

export default function FederatedPage() {
  const [data, setData] = useState<FederatedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadFederated = useCallback(async (isRefresh = false) => {
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
      const result = await fetchFederatedDashboardData();
      setData(result);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(getFederatedErrorMessage(err));
      if (!isRefresh) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFederated(false);
    const id = setInterval(() => loadFederated(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadFederated]);

  const status = data?.status;
  const clients = data?.clients.clients ?? [];
  const rounds = data?.rounds;

  const onlineCount = clients.filter((c) => isClientOnline(c.synchronization_state)).length;

  const trainingChartData = useMemo(() => {
    const progression = rounds?.accuracy_progression ?? [];
    if (progression.length > 0) {
      return progression.map((p) => ({
        round: p.round,
        loss: p.loss,
        auc: p.accuracy,
      }));
    }
    return (rounds?.rounds ?? []).map((r) => ({
      round: r.round_number,
      loss: r.aggregation_loss,
      auc: r.model_accuracy,
    }));
  }, [rounds]);

  const roundsPerHospital = useMemo(
    () =>
      clients.map((c) => ({
        hospital: shortHospitalName(c.hospital_name),
        rounds: c.current_round,
        samples: c.training_samples,
      })),
    [clients]
  );

  const latestAccuracy = useMemo(() => {
    if (!trainingChartData.length) return null;
    return trainingChartData[trainingChartData.length - 1].auc;
  }, [trainingChartData]);

  const lastAggregated = useMemo(() => {
    const r = rounds?.rounds ?? [];
    if (!r.length) return formatTimestamp(status?.computed_at);
    return formatTimestamp(r[r.length - 1].completed_at ?? r[r.length - 1].started_at);
  }, [rounds, status]);

  const clusterSyncPercent = useMemo(() => {
    if (!clients.length) return 0;
    const sum = clients.reduce(
      (acc, c) => acc + syncProgressFromState(c.synchronization_state),
      0
    );
    return Math.round(sum / clients.length);
  }, [clients]);

  const aggregationSteps = useMemo(() => {
    if (!status) return [];
    const active = status.active_clients;
    const total = status.total_clients;
    const agg = status.aggregation_status;
    const syncing = clients.filter((c) => c.synchronization_state === "syncing");

    return [
      {
        step: "Client gradient collection",
        status: active > 0 ? "complete" : "pending",
        detail: `${active} of ${total} clients responded`,
      },
      {
        step: "Secure aggregation (FedAvg)",
        status: agg === "complete" ? "complete" : agg === "in_progress" ? "in_progress" : "pending",
        detail: `${status.total_training_samples.toLocaleString()} weighted samples`,
      },
      {
        step: "Global model broadcast",
        status:
          syncing.length > 0
            ? "in_progress"
            : active === total && total > 0
            ? "complete"
            : "pending",
        detail:
          syncing.length > 0
            ? `${syncing.map((c) => shortHospitalName(c.hospital_name)).join(", ")} syncing`
            : "All online clients synchronized",
      },
      {
        step: "Round checkpoint persist",
        status: agg === "complete" ? "complete" : "in_progress",
        detail: `Round ${status.current_round} · ${syncStatusDisplay(status.synchronization_status)}`,
      },
    ];
  }, [status, clients]);

  const latencyMetrics = useMemo(() => {
    const avg = status?.average_client_latency ?? 0;
    if (avg <= 0) return [];
    return [
      { label: "Client → coordinator", value: Math.round(avg * 1.4), unit: "ms", trend: "live" },
      { label: "Global model download", value: Math.round(avg * 1.1), unit: "ms", trend: "live" },
      { label: "Aggregation server", value: Math.round(avg * 0.6), unit: "ms", trend: "live" },
      { label: "End-to-end round trip", value: Math.round(avg * 2.8), unit: "ms", trend: "live" },
    ];
  }, [status]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900/5 via-slate-50 to-indigo-50/40 -m-8 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-800">
                Federated Infrastructure
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {loading
                  ? "…"
                  : `${onlineCount}/${clients.length || status?.total_clients || 0} clients online`}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Federated Learning Monitor
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Live oversight of cross-hospital model training, aggregation, and synchronization
              from PostgreSQL prediction telemetry. Auto-refresh every 30s.
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
              onClick={() => loadFederated(!!data)}
              disabled={loading || refreshing}
              className="text-sm font-medium px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 transition"
            >
              Refresh
            </button>

            <div className="w-full shrink-0 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-white shadow-lg lg:max-w-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Global Model Version
              </p>
              {loading ? (
                <div className="mt-4 h-20 animate-pulse bg-indigo-800/50 rounded-lg" />
              ) : (
                <>
                  <p className="mt-1 text-2xl font-bold">
                    {status?.global_model_version ?? "—"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-indigo-300">Current round</p>
                      <p className="text-xl font-semibold">{status?.current_round ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-indigo-300">Global accuracy</p>
                      <p className="text-xl font-semibold">
                        {latestAccuracy != null ? latestAccuracy.toFixed(3) : "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-indigo-300">Training samples</p>
                      <p className="font-mono text-sm text-slate-300">
                        {(status?.total_training_samples ?? 0).toLocaleString()} logs
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-indigo-800/60 pt-4">
                    <span className="text-xs text-indigo-300">
                      Last aggregated: {lastAggregated}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 capitalize">
                      {status ? syncStatusDisplay(status.synchronization_status) : "—"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => loadFederated(!!data)}
              className="text-sm font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            [
              {
                label: "Active Clients",
                value: String(status?.active_clients ?? 0),
                sub: `of ${status?.total_clients ?? 0} hospitals`,
              },
              {
                label: "Current Round",
                value: String(status?.current_round ?? 0),
                sub: "FedAvg cycle",
              },
              {
                label: "Training Samples",
                value: (status?.total_training_samples ?? 0).toLocaleString(),
                sub: "Prediction audit logs",
              },
              {
                label: "Avg Latency",
                value:
                  (status?.average_client_latency ?? 0) > 0
                    ? `${status?.average_client_latency} ms`
                    : "—",
                sub: "Online clients",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
              </div>
            ))
          )}
        </div>

        {/* Sync + aggregation KPI row */}
        {!loading && status && (
          <div className="mb-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              Sync: <strong className="text-indigo-700">{syncStatusDisplay(status.synchronization_status)}</strong>
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              Aggregation: <strong className="capitalize">{status.aggregation_status}</strong>
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              Cluster sync: <strong>{clusterSyncPercent}%</strong>
            </span>
          </div>
        )}

        {/* Hospital cards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Participating Hospital Clients
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-500">No federated clients registered.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {clients.map((h) => (
                <HospitalCard key={h.client_id} client={h} />
              ))}
            </div>
          )}
        </section>

        {/* Charts */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Model Accuracy Progression</h2>
            <p className="mb-6 text-sm text-slate-500">
              Global federated loss and accuracy by aggregation round
            </p>
            {loading ? (
              <ChartSpinner />
            ) : trainingChartData.length === 0 ? (
              <EmptyChart message="No round history yet. Run predictions to build training telemetry." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trainingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="round"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    label={{
                      value: "Round",
                      position: "insideBottom",
                      offset: -4,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis yAxisId="left" domain={[0, "auto"]} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 1]}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="loss"
                    name="Aggregation Loss"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="auc"
                    name="Model Accuracy"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Training Samples by Hospital</h2>
            <p className="mb-6 text-sm text-slate-500">
              Local prediction volume and current round per participating client
            </p>
            {loading ? (
              <ChartSpinner />
            ) : roundsPerHospital.length === 0 ? (
              <EmptyChart message="No hospital activity data." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roundsPerHospital}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hospital" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="samples" name="Training samples" fill="#312e81" radius={[6, 6, 0, 0]} barSize={36} />
                  <Bar dataKey="rounds" name="Current round" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </div>

        {/* Round history table */}
        {!loading && (rounds?.rounds.length ?? 0) > 0 && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-900">Round History</h2>
            <p className="mb-4 text-sm text-slate-500">
              Federated aggregation rounds derived from live prediction activity
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <th className="py-3 pl-4 pr-2 font-bold">Round</th>
                    <th className="px-2 py-3 font-bold">Samples</th>
                    <th className="px-2 py-3 font-bold">Hospitals</th>
                    <th className="px-2 py-3 font-bold">Accuracy</th>
                    <th className="px-2 py-3 font-bold">Loss</th>
                    <th className="px-2 py-3 font-bold">Duration</th>
                    <th className="px-2 py-3 font-bold">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(rounds?.rounds ?? [])].reverse().slice(0, 10).map((r) => (
                    <tr key={r.round_number} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="py-3 pl-4 font-semibold text-slate-900">{r.round_number}</td>
                      <td className="px-2 text-slate-700">{r.aggregated_samples.toLocaleString()}</td>
                      <td className="px-2 text-slate-700">{r.participating_clients}</td>
                      <td className="px-2 font-mono text-slate-700">{r.model_accuracy.toFixed(3)}</td>
                      <td className="px-2 font-mono text-slate-700">{r.aggregation_loss.toFixed(3)}</td>
                      <td className="px-2 text-slate-700">{r.round_duration_seconds}s</td>
                      <td className="px-2 whitespace-nowrap text-slate-600">
                        {formatTimestamp(r.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Aggregation + latency */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Aggregation Status</h2>
              {!loading && status && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 capitalize">
                  Round {status.current_round} · {status.aggregation_status}
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-slate-500 py-8 text-center">Loading pipeline status…</p>
            ) : (
              <div className="space-y-3">
                {aggregationSteps.map((item, index) => (
                  <div
                    key={item.step}
                    className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-900 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{item.step}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${stepStatusStyle(item.status)}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-900">Communication Latency</h2>
            <p className="mb-6 text-sm text-slate-500">
              Network metrics estimated from live client latency ({status?.average_client_latency ?? 0} ms avg)
            </p>
            {loading ? (
              <ChartSpinner height={200} />
            ) : latencyMetrics.length === 0 ? (
              <p className="text-sm text-slate-500 py-6">No online clients — latency unavailable.</p>
            ) : (
              <div className="space-y-4">
                {latencyMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-indigo-700">
                          {m.value} {m.unit}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {m.trend}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min((m.value / 300) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && status && (
              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-xs font-semibold uppercase text-indigo-600">Model synchronization</p>
                <p className="mt-2 text-sm text-slate-700">
                  {status.active_clients} of {status.total_clients} hospital clients online.
                  {status.active_clients < status.total_clients &&
                    " Offline nodes excluded from current aggregation window."}
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">Cluster-wide sync</span>
                    <span className="font-semibold text-slate-800">{clusterSyncPercent}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${clusterSyncPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Activity table */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Hospital Activity</h2>
          <p className="mb-6 text-sm text-slate-500">
            Per-client training participation from live federated telemetry
          </p>
          {loading ? (
            <div className="py-12 flex flex-col items-center">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-slate-500">Loading client activity…</p>
            </div>
          ) : clients.length === 0 ? (
            <p className="py-10 text-center text-slate-500">No hospital clients found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <th className="py-3 pl-4 pr-2 font-bold">Hospital</th>
                    <th className="px-2 py-3 font-bold">Client ID</th>
                    <th className="px-2 py-3 font-bold">Status</th>
                    <th className="px-2 py-3 font-bold">Round</th>
                    <th className="px-2 py-3 font-bold">Samples</th>
                    <th className="px-2 py-3 font-bold">Latency</th>
                    <th className="px-2 py-3 font-bold">Model Version</th>
                    <th className="px-2 py-3 font-bold">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((row) => {
                    const label = activityLabel(row.synchronization_state);
                    return (
                      <tr
                        key={row.client_id}
                        className="border-t border-slate-100 hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3 pl-4 pr-2 font-medium text-slate-900">
                          {row.hospital_name}
                        </td>
                        <td className="px-2 font-mono text-slate-600">{row.client_id}</td>
                        <td className="px-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${activityStatusStyle(label)}`}
                          >
                            <StatusDot online={label !== "Offline"} />
                            {label}
                          </span>
                        </td>
                        <td className="px-2 text-slate-700">{row.current_round}</td>
                        <td className="px-2 text-slate-700">
                          {row.training_samples.toLocaleString()}
                        </td>
                        <td className="px-2 text-slate-700">
                          {row.latency > 0 ? `${row.latency} ms` : "—"}
                        </td>
                        <td className="px-2 text-slate-600 text-xs">
                          {row.local_model_version}
                        </td>
                        <td className="px-2 whitespace-nowrap text-slate-600">
                          {formatTimestamp(row.last_active)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Live federated monitoring from hospital prediction logs and FL client registry.
          Coordinate with your MLOps team for production Flower cluster integration.
        </p>
      </div>
    </Layout>
  );
}

function HospitalCard({ client }: { client: FederatedClient }) {
  const online = isClientOnline(client.synchronization_state);
  const syncProgress = syncProgressFromState(client.synchronization_state);

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        online ? "border-slate-200" : "border-slate-300 opacity-80"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-500">{client.client_id}</p>
          <p className="font-semibold text-slate-900">{client.hospital_name}</p>
          <p className="text-xs text-slate-500">{client.region ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot online={online} />
          <span
            className={`text-xs font-semibold uppercase ${
              online ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            {client.synchronization_state}
          </span>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-500">Samples</p>
          <p className="font-semibold text-slate-800">
            {client.training_samples.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Local round</p>
          <p className="font-semibold text-slate-800">{client.current_round}</p>
        </div>
        <div>
          <p className="text-slate-500">Latency</p>
          <p className="font-semibold text-slate-800">
            {online && client.latency > 0 ? `${client.latency} ms` : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Last active</p>
          <p className="font-semibold text-slate-800 text-xs">
            {formatRelativeActive(client.last_active)}
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-slate-500">Model sync</span>
          <span className="font-semibold text-slate-700">{syncProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              syncProgress === 100
                ? "bg-emerald-500"
                : syncProgress > 0
                ? "bg-amber-500"
                : "bg-slate-300"
            }`}
            style={{ width: `${syncProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ChartSpinner({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyChart({ message, height = 300 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-slate-500 text-sm px-4 text-center"
      style={{ height }}
    >
      {message}
    </div>
  );
}
