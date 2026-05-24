"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Layout from "../../components/Layout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  fetchPatientHistory,
  getPatientErrorMessage,
  type PatientHistory,
} from "../../../lib/patients";

export default function PatientHistoryPage() {
  const params = useParams();
  const patientId = Number(params.id);

  const [data, setData] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId || Number.isNaN(patientId)) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPatientHistory(patientId));
    } catch (err: unknown) {
      setError(getPatientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const patient = data?.patient;

  const latestPrediction = data?.predictions?.[0];
  const bmi = latestPrediction?.height && latestPrediction?.weight
    ? (latestPrediction.weight / ((latestPrediction.height / 100) ** 2)).toFixed(1)
    : null;

  const genderLabel = (value?: number | null) => {
    if (value === 1) return "Female";
    if (value === 0) return "Male";
    return "Unknown";
  };

  const statusClass = (category?: string | null) => {
    const label = (category ?? "").toLowerCase();
    if (label.includes("high")) return "status-pill status-pill--danger";
    if (label.includes("medium") || label.includes("moderate")) return "status-pill status-pill--warning";
    return "status-pill status-pill--success";
  };

  const displayValue = (value: number | string | null | undefined, fallback = "—") =>
    value !== undefined && value !== null && value !== "" ? String(value) : fallback;

  return (
    <Layout>
      <div className="max-w-5xl">
        <Link
          href="/patients"
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          ← Back to patients
        </Link>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading history…</div>
        ) : error ? (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        ) : patient ? (
          <>
            <div className="mt-6 mb-8 rounded-3xl border border-slate-200 bg-slate-50/90 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Clinical Profile</p>
                  <h1 className="text-3xl font-bold text-slate-950 mt-3">{patient.display_name}</h1>
                  <p className="text-sm font-mono text-slate-500 mt-2">{patient.patient_uid}</p>
                  {patient.medical_record_number && (
                    <p className="text-slate-600 mt-3">MRN: {patient.medical_record_number}</p>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <span className={statusClass(patient.latest_risk_category)}>
                    {patient.latest_risk_category ?? "Unknown Risk"}
                  </span>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI confidence</p>
                    <p className="text-2xl font-semibold text-slate-950 mt-1">
                      {patient.latest_risk_probability != null
                        ? `${(patient.latest_risk_probability * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 mt-8 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Patient overview</p>
                  <div className="mt-4 grid gap-3">
                    <ProfileRow label="Hospital / Workspace" value={patient.hospital_name ?? "—"} />
                    <ProfileRow label="Profile created" value={new Date(patient.created_at).toLocaleString()} />
                    <ProfileRow label="Last updated" value={new Date(patient.updated_at).toLocaleString()} />
                    <ProfileRow label="Predictions" value={String(data?.count ?? 0)} />
                    <ProfileRow label="Last prediction" value={patient.last_prediction_at ? new Date(patient.last_prediction_at).toLocaleString() : "—"} />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clinical notes</p>
                  <p className="mt-4 text-slate-700 text-sm leading-6">
                    {patient.notes ?? "No clinical notes available."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 mb-8 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-4">Vitals</p>
                <div className="grid gap-3">
                  <ProfileRow label="Age" value={displayValue(latestPrediction?.age)} />
                  <ProfileRow label="Gender" value={genderLabel(latestPrediction?.gender)} />
                  <ProfileRow label="Height" value={latestPrediction?.height ? `${latestPrediction.height} cm` : "—"} />
                  <ProfileRow label="Weight" value={latestPrediction?.weight ? `${latestPrediction.weight} kg` : "—"} />
                  <ProfileRow label="BMI" value={bmi ? `${bmi} kg/m²` : "—"} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-4">Clinical indicators</p>
                <div className="grid gap-3">
                  <ProfileRow label="Systolic BP" value={latestPrediction?.ap_hi ? `${latestPrediction.ap_hi} mmHg` : "—"} />
                  <ProfileRow label="Diastolic BP" value={latestPrediction?.ap_lo ? `${latestPrediction.ap_lo} mmHg` : "—"} />
                  <ProfileRow label="Cholesterol" value={latestPrediction?.cholesterol ? `${latestPrediction.cholesterol}` : "—"} />
                  <ProfileRow label="Glucose" value={latestPrediction?.gluc ? `${latestPrediction.gluc}` : "—"} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-4">Lifestyle</p>
                <div className="grid gap-3">
                  <ProfileRow label="Smoking" value={latestPrediction?.smoke === 1 ? "Yes" : latestPrediction?.smoke === 0 ? "No" : "—"} />
                  <ProfileRow label="Alcohol intake" value={latestPrediction?.alco === 1 ? "Yes" : latestPrediction?.alco === 0 ? "No" : "—"} />
                  <ProfileRow label="Physical activity" value={latestPrediction?.active === 1 ? "Yes" : latestPrediction?.active === 0 ? "No" : "—"} />
                  <ProfileRow label="Symptoms" value="Not available" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 mb-8 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Risk trend</h2>
                {(data?.risk_trend.length ?? 0) === 0 ? (
                  <p className="text-slate-500 text-sm py-8 text-center">
                    No predictions linked yet. Run a prediction with patient_id={patient.id}.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data?.risk_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 1]} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v) => [`${(Number(v ?? 0) * 100).toFixed(1)}%`, "Risk"]} />
                      <Line
                        type="monotone"
                        dataKey="risk"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Prediction timeline</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="border-b text-xs uppercase text-slate-500">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Risk</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">Source</th>
                        <th className="py-2">Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.predictions.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="py-3 pr-4 text-slate-600">
                            {p.timestamp ? new Date(p.timestamp).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 pr-4 font-mono">
                            {(p.risk_probability * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 pr-4">{p.risk_category ?? "—"}</td>
                          <td className="py-3 pr-4 capitalize">{p.source}</td>
                          <td className="py-3 text-slate-500 text-xs">{p.model_version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-900">
              <strong>Next:</strong> Medical report PDF ingestion will auto-fill vitals and attach
              predictions to this profile. Use{" "}
              <code className="bg-white px-1 rounded">patient_id: {patient.id}</code> in prediction
              requests.
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
