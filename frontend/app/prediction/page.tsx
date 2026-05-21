"use client";

import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import axios, { AxiosError } from "axios";
import { API_BASE } from "../../lib/api";

type FormData = {
  age: number;
  gender: number;
  height: number;
  weight: number;
  ap_hi: number;
  ap_lo: number;
  cholesterol: number;
  gluc: number;
  smoke: number;
  alco: number;
  active: number;
};

type PredictionResult = {
  risk_probability: number;
  risk_category: string;
};

const INITIAL_FORM: FormData = {
  age: 50,
  gender: 1,
  height: 170,
  weight: 75,
  ap_hi: 140,
  ap_lo: 90,
  cholesterol: 2,
  gluc: 1,
  smoke: 0,
  alco: 0,
  active: 1,
};

function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: string }>;
    if (axErr.response?.status === 401) {
      return "Authentication required. Please log in and try again.";
    }
    if (typeof axErr.response?.data?.detail === "string") {
      return axErr.response.data.detail;
    }
    return axErr.message || "Prediction request failed.";
  }
  return "An unexpected error occurred.";
}

function computeBmi(heightCm: number, weightKg: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function cholesterolLabel(v: number) {
  if (v === 1) return "Normal";
  if (v === 2) return "Above Normal";
  return "Well Above Normal";
}

function glucLabel(v: number) {
  if (v === 1) return "Normal";
  if (v === 2) return "Above Normal";
  return "Well Above Normal";
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const hintClass = "mt-1 text-xs text-slate-500";

function SectionCard({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "sky" | "rose" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const accents = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accents[accent]}`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function PredictionPage() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bmi = useMemo(
    () => computeBmi(formData.height, formData.weight),
    [formData.height, formData.weight]
  );

  const isHighRisk = result?.risk_category === "High Risk";
  const riskPercent = result ? Math.round(result.risk_probability * 100) : null;

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const predictRisk = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please log in first.");
        setLoading(false);
        return;
      }

      const response = await axios.post<PredictionResult>(
        `${API_BASE}/predict`,
        {
          age: Number(formData.age),
          gender: Number(formData.gender),
          height: Number(formData.height),
          weight: Number(formData.weight),
          ap_hi: Number(formData.ap_hi),
          ap_lo: Number(formData.ap_lo),
          cholesterol: Number(formData.cholesterol),
          gluc: Number(formData.gluc),
          smoke: Number(formData.smoke),
          alco: Number(formData.alco),
          active: Number(formData.active),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 -m-8 p-6 md:p-8">
        <div className="mb-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
              Clinical Decision Support
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Patient Risk Prediction
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Enter patient vitals and lifestyle indicators for federated cardiovascular
            risk scoring. All fields map to the backend PatientData schema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          {/* Form column */}
          <div className="space-y-6 xl:col-span-2">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
                <p className="font-semibold">Prediction failed</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            )}

            <SectionCard
              title="Patient Demographics"
              subtitle="Age and biological sex for cohort-adjusted modeling"
              accent="sky"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="age" className={labelClass}>
                    Age <span className="text-slate-400">(years)</span>
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min={1}
                    max={120}
                    value={formData.age}
                    onChange={handleNumber}
                    className={inputClass}
                  />
                  <p className={hintClass}>Typical range 18–90 for model calibration</p>
                </div>
                <div>
                  <label htmlFor="gender" className={labelClass}>
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={1}>Female</option>
                    <option value={2}>Male</option>
                  </select>
                  <p className={hintClass}>Encoded per cardiovascular cohort standards</p>
                </div>
                <div>
                  <label htmlFor="height" className={labelClass}>
                    Height <span className="text-slate-400">(cm)</span>
                  </label>
                  <input
                    id="height"
                    name="height"
                    type="number"
                    min={100}
                    max={250}
                    value={formData.height}
                    onChange={handleNumber}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="weight" className={labelClass}>
                    Weight <span className="text-slate-400">(kg)</span>
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    min={30}
                    max={300}
                    value={formData.weight}
                    onChange={handleNumber}
                    className={inputClass}
                  />
                  <p className={hintClass}>Used with height to compute BMI in summary</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Vital Signs"
              subtitle="Blood pressure readings for hypertension risk"
              accent="rose"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ap_hi" className={labelClass}>
                    Systolic BP <span className="text-slate-400">(mmHg)</span>
                  </label>
                  <input
                    id="ap_hi"
                    name="ap_hi"
                    type="number"
                    min={80}
                    max={250}
                    value={formData.ap_hi}
                    onChange={handleNumber}
                    className={inputClass}
                  />
                  <p className={hintClass}>Normal adult: &lt; 120 mmHg</p>
                </div>
                <div>
                  <label htmlFor="ap_lo" className={labelClass}>
                    Diastolic BP <span className="text-slate-400">(mmHg)</span>
                  </label>
                  <input
                    id="ap_lo"
                    name="ap_lo"
                    type="number"
                    min={40}
                    max={150}
                    value={formData.ap_lo}
                    onChange={handleNumber}
                    className={inputClass}
                  />
                  <p className={hintClass}>Stage 1 hypertension: ≥ 130/80</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Lifestyle Indicators"
              subtitle="Behavioral factors influencing cardiovascular outcomes"
              accent="amber"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="smoke" className={labelClass}>
                    Smoking
                  </label>
                  <select
                    id="smoke"
                    name="smoke"
                    value={formData.smoke}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="alco" className={labelClass}>
                    Alcohol intake
                  </label>
                  <select
                    id="alco"
                    name="alco"
                    value={formData.alco}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="active" className={labelClass}>
                    Physical activity
                  </label>
                  <select
                    id="active"
                    name="active"
                    value={formData.active}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                  <p className={hintClass}>
                    Regular activity is a protective factor in the federated model
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Clinical Indicators"
              subtitle="Lipid and glucose levels from recent labs"
              accent="violet"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="cholesterol" className={labelClass}>
                    Cholesterol
                  </label>
                  <select
                    id="cholesterol"
                    name="cholesterol"
                    value={formData.cholesterol}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={1}>Normal</option>
                    <option value={2}>Above Normal</option>
                    <option value={3}>Well Above Normal</option>
                  </select>
                  <p className={hintClass}>1 = normal, 2 = elevated, 3 = high</p>
                </div>
                <div>
                  <label htmlFor="gluc" className={labelClass}>
                    Glucose
                  </label>
                  <select
                    id="gluc"
                    name="gluc"
                    value={formData.gluc}
                    onChange={handleSelect}
                    className={selectClass}
                  >
                    <option value={1}>Normal</option>
                    <option value={2}>Above Normal</option>
                    <option value={3}>Well Above Normal</option>
                  </select>
                  <p className={hintClass}>Fasting glucose category from clinical record</p>
                </div>
              </div>
            </SectionCard>

            <button
              type="button"
              onClick={predictRisk}
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 px-8 py-4 text-center font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-teal-500/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyzing patient risk…
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Predict Risk
                  </>
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition group-hover:translate-x-full duration-700" />
            </button>
          </div>

          {/* Summary sidebar */}
          <div className="space-y-6">
            <aside className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Patient Summary</h2>
              <p className="mt-1 text-sm text-slate-500">Live preview of entered data</p>

              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Body mass index
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {bmi !== null ? bmi.toFixed(1) : "—"}
                </p>
                {bmi !== null && (
                  <span className="mt-2 inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {bmiCategory(bmi)}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Risk status
                </p>
                {result ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-2xl font-bold ${
                        isHighRisk ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {riskPercent}%
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        isHighRisk
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {result.risk_category}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Awaiting prediction — submit the form to score risk
                  </p>
                )}
              </div>

              <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Blood pressure</span>
                  <span className="font-medium text-slate-900">
                    {formData.ap_hi}/{formData.ap_lo} mmHg
                  </span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Cholesterol</span>
                  <span className="font-medium text-slate-900">
                    {cholesterolLabel(formData.cholesterol)}
                  </span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Glucose</span>
                  <span className="font-medium text-slate-900">
                    {glucLabel(formData.gluc)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Lifestyle</span>
                  <span className="font-medium text-slate-900">
                    {formData.smoke ? "Smoker" : "Non-smoker"} ·{" "}
                    {formData.active ? "Active" : "Inactive"}
                  </span>
                </li>
              </ul>
            </aside>

            {result && (
              <div
                className={`rounded-2xl border p-6 shadow-sm ${
                  isHighRisk
                    ? "border-red-200 bg-gradient-to-br from-red-50 to-white"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                }`}
              >
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${
                      isHighRisk ? "bg-red-600" : "bg-emerald-600"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Analytics Result</h3>
                    <p className="text-xs text-slate-500">Federated FT-Transformer inference</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-white/80 px-4 py-3">
                    <span className="text-sm text-slate-600">Risk probability</span>
                    <span className="font-mono text-lg font-bold text-slate-900">
                      {result.risk_probability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/80 px-4 py-3">
                    <span className="text-sm text-slate-600">Risk category</span>
                    <span
                      className={`font-semibold ${
                        isHighRisk ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {result.risk_category}
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighRisk ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${riskPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  For clinical decision support only. Review with standard-of-care protocols.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
