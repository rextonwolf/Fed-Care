"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import {
  createPatient,
  fetchPatients,
  getPatientErrorMessage,
  type PatientSummary,
} from "../../lib/patients";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [mrn, setMrn] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPatients(await fetchPatients());
    } catch (err: unknown) {
      setError(getPatientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createPatient({
        display_name: name.trim(),
        medical_record_number: mrn.trim() || undefined,
      });
      setName("");
      setMrn("");
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(getPatientErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Patient Registry</h1>
            <p className="text-slate-600 mt-2">
              Longitudinal profiles for prediction history and future medical report ingestion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 transition"
          >
            {showForm ? "Cancel" : "+ New patient"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900 mb-4">Create patient profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Display name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">MRN (optional)</label>
                <input
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="MRN-10294"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create profile"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading patients…</div>
        ) : patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No patient profiles yet.</p>
            <p className="text-sm text-slate-500 mt-2">
              Create a profile, then run predictions with a linked patient ID.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{p.display_name}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-1">{p.patient_uid}</p>
                    {p.medical_record_number && (
                      <p className="text-sm text-slate-600 mt-1">MRN: {p.medical_record_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        (p.latest_risk_probability ?? 0) > 0.5
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.latest_risk_category ?? "No predictions"}
                    </span>
                    <p className="text-sm text-slate-500 mt-2">
                      {p.prediction_count} prediction{p.prediction_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
