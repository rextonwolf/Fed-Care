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
            <div className="mt-6 mb-8">
              <h1 className="text-3xl font-bold text-slate-900">{patient.display_name}</h1>
              <p className="text-sm font-mono text-slate-500 mt-1">{patient.patient_uid}</p>
              {patient.medical_record_number && (
                <p className="text-slate-600 mt-2">MRN: {patient.medical_record_number}</p>
              )}
              {patient.notes && (
                <p className="text-slate-600 mt-2 text-sm">{patient.notes}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard label="Predictions" value={String(data?.count ?? 0)} />
              <StatCard
                label="Latest risk"
                value={
                  patient.latest_risk_probability != null
                    ? `${(patient.latest_risk_probability * 100).toFixed(1)}%`
                    : "—"
                }
              />
              <StatCard label="Category" value={patient.latest_risk_category ?? "—"} />
              <StatCard
                label="Profile created"
                value={new Date(patient.created_at).toLocaleDateString()}
              />
            </div>

            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
