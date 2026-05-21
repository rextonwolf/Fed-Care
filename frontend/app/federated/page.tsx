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
} from "recharts";

const globalModel = {
  version: "FTTransformer v1.2.4",
  round: 24,
  checksum: "a3f8c91e…2b7d",
  lastAggregated: "5/21/2026 3:45 PM",
  rocAuc: 0.792,
  status: "Synchronized",
};

const hospitals = [
  {
    id: "HOSP-A",
    name: "Metro General Hospital",
    region: "Northeast",
    status: "online" as const,
    patients: "12,400",
    localRounds: 24,
    syncProgress: 100,
    latencyMs: 42,
    lastHeartbeat: "2 min ago",
  },
  {
    id: "HOSP-B",
    name: "Riverside Medical Center",
    region: "Midwest",
    status: "online" as const,
    patients: "9,800",
    localRounds: 24,
    syncProgress: 100,
    latencyMs: 58,
    lastHeartbeat: "4 min ago",
  },
  {
    id: "HOSP-C",
    name: "Summit Health Network",
    region: "West",
    status: "online" as const,
    patients: "11,200",
    localRounds: 23,
    syncProgress: 87,
    latencyMs: 71,
    lastHeartbeat: "6 min ago",
  },
  {
    id: "HOSP-D",
    name: "Coastal Community Hospital",
    region: "Southeast",
    status: "offline" as const,
    patients: "7,600",
    localRounds: 22,
    syncProgress: 0,
    latencyMs: 0,
    lastHeartbeat: "45 min ago",
  },
];

const trainingRoundsOverTime = [
  { round: 16, loss: 0.42, auc: 0.761 },
  { round: 17, loss: 0.39, auc: 0.768 },
  { round: 18, loss: 0.37, auc: 0.774 },
  { round: 19, loss: 0.35, auc: 0.779 },
  { round: 20, loss: 0.33, auc: 0.783 },
  { round: 21, loss: 0.31, auc: 0.786 },
  { round: 22, loss: 0.29, auc: 0.789 },
  { round: 23, loss: 0.28, auc: 0.791 },
  { round: 24, loss: 0.27, auc: 0.792 },
];

const roundsPerHospital = [
  { hospital: "Metro General", rounds: 24 },
  { hospital: "Riverside", rounds: 24 },
  { hospital: "Summit Health", rounds: 23 },
  { hospital: "Coastal", rounds: 22 },
];

const latencyMetrics = [
  { label: "Upload (gradients)", value: 124, unit: "ms", trend: "stable" },
  { label: "Download (global model)", value: 89, unit: "ms", trend: "improved" },
  { label: "Aggregation server", value: 34, unit: "ms", trend: "stable" },
  { label: "End-to-end round trip", value: 247, unit: "ms", trend: "stable" },
];

const aggregationSteps = [
  { step: "Client gradient collection", status: "complete", detail: "3 of 4 clients responded" },
  { step: "Secure aggregation (FedAvg)", status: "complete", detail: "Weighted by sample count" },
  { step: "Differential privacy noise", status: "complete", detail: "ε=1.2, δ=1e-5" },
  { step: "Global model broadcast", status: "in_progress", detail: "Summit Health syncing (87%)" },
  { step: "Round checkpoint persist", status: "pending", detail: "Awaiting full client sync" },
];

const hospitalActivity = [
  {
    hospital: "Metro General Hospital",
    clientId: "HOSP-A",
    status: "Online",
    round: 24,
    samples: "12,400",
    trainLoss: 0.26,
    uploadMb: 48.2,
    lastActive: "5/21/2026 3:44 PM",
  },
  {
    hospital: "Riverside Medical Center",
    clientId: "HOSP-B",
    status: "Online",
    round: 24,
    samples: "9,800",
    trainLoss: 0.28,
    uploadMb: 38.1,
    lastActive: "5/21/2026 3:42 PM",
  },
  {
    hospital: "Summit Health Network",
    clientId: "HOSP-C",
    status: "Syncing",
    round: 23,
    samples: "11,200",
    trainLoss: 0.29,
    uploadMb: 43.6,
    lastActive: "5/21/2026 3:40 PM",
  },
  {
    hospital: "Coastal Community Hospital",
    clientId: "HOSP-D",
    status: "Offline",
    round: 22,
    samples: "7,600",
    trainLoss: 0.31,
    uploadMb: 0,
    lastActive: "5/21/2026 2:58 PM",
  },
];

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-slate-400"
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

export default function FederatedPage() {
  const onlineCount = hospitals.filter((h) => h.status === "online").length;

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
                {onlineCount}/{hospitals.length} clients online
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Federated Learning Monitor
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Real-time oversight of cross-hospital model training, aggregation, and
              synchronization. Mock data for enterprise healthcare AI demo.
            </p>
          </div>

          {/* Global model version */}
          <div className="w-full shrink-0 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-white shadow-lg lg:max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Global Model Version
            </p>
            <p className="mt-1 text-2xl font-bold">{globalModel.version}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-indigo-300">Current round</p>
                <p className="text-xl font-semibold">{globalModel.round}</p>
              </div>
              <div>
                <p className="text-indigo-300">Global ROC-AUC</p>
                <p className="text-xl font-semibold">{globalModel.rocAuc}</p>
              </div>
              <div className="col-span-2">
                <p className="text-indigo-300">Model checksum</p>
                <p className="font-mono text-sm text-slate-300">{globalModel.checksum}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-indigo-800/60 pt-4">
              <span className="text-xs text-indigo-300">
                Last aggregated: {globalModel.lastAggregated}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                {globalModel.status}
              </span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Active Round", value: "24", sub: "FedAvg cycle" },
            { label: "Total Patients", value: "41,000", sub: "Across cohort" },
            { label: "Avg Latency", value: "57 ms", sub: "Online clients" },
            { label: "Privacy Budget", value: "ε 1.2", sub: "DP-SGD enabled" },
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
          ))}
        </div>

        {/* Connected hospital cards */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Connected Hospital Clients
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {hospitals.map((h) => {
              const isOnline = h.status === "online";
              return (
                <div
                  key={h.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    isOnline ? "border-slate-200" : "border-slate-300 opacity-80"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{h.id}</p>
                      <p className="font-semibold text-slate-900">{h.name}</p>
                      <p className="text-xs text-slate-500">{h.region}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot online={isOnline} />
                      <span
                        className={`text-xs font-semibold uppercase ${
                          isOnline ? "text-emerald-600" : "text-slate-500"
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Patients</p>
                      <p className="font-semibold text-slate-800">{h.patients}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Local rounds</p>
                      <p className="font-semibold text-slate-800">{h.localRounds}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Latency</p>
                      <p className="font-semibold text-slate-800">
                        {isOnline ? `${h.latencyMs} ms` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Heartbeat</p>
                      <p className="font-semibold text-slate-800">{h.lastHeartbeat}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-500">Model sync</span>
                      <span className="font-semibold text-slate-700">{h.syncProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          h.syncProgress === 100
                            ? "bg-emerald-500"
                            : h.syncProgress > 0
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${h.syncProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Charts row */}
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Training Rounds Over Time</h2>
            <p className="mb-6 text-sm text-slate-500">
              Global federated loss and ROC-AUC by aggregation round
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trainingRoundsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="round"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  label={{ value: "Round", position: "insideBottom", offset: -4, fill: "#94a3b8" }}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0.2, 0.5]}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0.75, 0.8]}
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
                  name="Train Loss"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="auc"
                  name="ROC-AUC"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Training Rounds by Hospital</h2>
            <p className="mb-6 text-sm text-slate-500">
              Completed local epochs per participating client
            </p>
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
                <Bar dataKey="rounds" fill="#312e81" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* Aggregation + latency */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Aggregation Status</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Round 24 in progress
              </span>
            </div>
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Communication Latency Metrics
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Network performance for current federated round (online clients)
            </p>
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
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-xs font-semibold uppercase text-indigo-600">
                Model synchronization
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Global weights broadcast to 3 of 4 clients. Coastal Community Hospital offline —
                round will complete with partial participation (minimum 2 clients met).
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Cluster-wide sync</span>
                  <span className="font-semibold text-slate-800">75%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full w-3/4 rounded-full bg-indigo-600" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Hospital activity table */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Hospital Activity</h2>
          <p className="mb-6 text-sm text-slate-500">
            Per-client training participation and upload metrics for the current round
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                  <th className="py-3 pl-4 pr-2 font-bold">Hospital</th>
                  <th className="px-2 py-3 font-bold">Client ID</th>
                  <th className="px-2 py-3 font-bold">Status</th>
                  <th className="px-2 py-3 font-bold">Round</th>
                  <th className="px-2 py-3 font-bold">Samples</th>
                  <th className="px-2 py-3 font-bold">Train Loss</th>
                  <th className="px-2 py-3 font-bold">Upload</th>
                  <th className="px-2 py-3 font-bold">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {hospitalActivity.map((row) => (
                  <tr
                    key={row.clientId}
                    className="border-t border-slate-100 hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 pl-4 pr-2 font-medium text-slate-900">
                      {row.hospital}
                    </td>
                    <td className="px-2 font-mono text-slate-600">{row.clientId}</td>
                    <td className="px-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${activityStatusStyle(row.status)}`}
                      >
                        <StatusDot online={row.status !== "Offline"} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-2 text-slate-700">{row.round}</td>
                    <td className="px-2 text-slate-700">{row.samples}</td>
                    <td className="px-2 font-mono text-slate-700">{row.trainLoss}</td>
                    <td className="px-2 text-slate-700">
                      {row.uploadMb > 0 ? `${row.uploadMb} MB` : "—"}
                    </td>
                    <td className="px-2 whitespace-nowrap text-slate-600">{row.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Mock federated learning telemetry for healthcare AI infrastructure demo. Not connected
          to live training jobs.
        </p>
      </div>
    </Layout>
  );
}
