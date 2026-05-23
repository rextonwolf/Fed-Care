"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import AIValidationPanel from "../components/AIValidationPanel";
import { apiClient, getApiErrorMessage } from "../../lib/http";
import {
  createPatient,
  fetchPatient,
  getPatientErrorMessage,
  searchPatients,
  type PatientSummary,
  type PatientDetail,
} from "../../lib/patients";
import {
  ResultCard,
  AnimatedProgressBar,
  EntranceChip,
  AnimatePresence,
  ListItem,
  AnimatedNumber,
} from "../components/MotionLibrary";

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

type ExtendedFormData = {
  cp?: number;
  restecg?: number;
  thalch?: number;
  exang?: number;
  oldpeak?: number;
  slope?: number;
  ca?: number;
  thal?: number;
  heart_rate?: number;
  creatinine?: number;
};

type PredictionResult = {
  risk_probability: number;
  risk_category: string;
  confidence_score?: number;
  confidence_label?: string;
  anomaly_detected?: boolean;
  anomaly_reason?: string | null;
  validation_notes?: string[];
  trust_indicator?: number;
  clinical_warnings?: string[];
  kg_consistency?: string;
  matched_conditions?: string[];
  reasoning_notes?: string[];
  base_risk_probability?: number;
  adjusted_risk_probability?: number
  risk_adjustment?: number;
  probable_condition?: string;
  ai_confidence?: number;
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

const SYMPTOM_LIBRARY = [
  "Chest Pain",
  "Shortness of Breath",
  "Fatigue",
  "Dizziness",
  "Headache",
  "Blurred Vision",
  "Palpitations",
  "Nausea",
  "Edema",
  "Cough",
  "Fever",
  "Weakness",
  "Rapid Heartbeat",
  "Cold Sweats",
  "Confusion",
  "Frequent Urination",
  "Weight Loss",
  "Vision Problems",
  "Vomiting",
  "Muscle Pain",
];

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
  const [extended, setExtended] = useState<ExtendedFormData>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientMrn, setNewPatientMrn] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearchQuery, setSymptomSearchQuery] = useState("");

  const bmi = useMemo(
    () => computeBmi(formData.height, formData.weight),
    [formData.height, formData.weight]
  );

  const isHighRisk = result?.risk_category === "High Risk";
  const riskPercent = result
  ? (result.risk_probability * 100).toFixed(1)
  : null;

  // Filter symptoms based on search query
  const filteredSymptoms = useMemo(() => {
    const query = symptomSearchQuery.toLowerCase().trim();
    if (!query) return SYMPTOM_LIBRARY;
    return SYMPTOM_LIBRARY.filter((s) => s.toLowerCase().includes(query));
  }, [symptomSearchQuery]);

  const handleAddSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms((prev) => [...prev, symptom]);
      setSymptomSearchQuery("");
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s !== symptom));
  };

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

  const handleExtendedNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExtended((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : Number(value),
    }));
  };

  const refreshSelectedPatient = useCallback(async (patientId: number) => {
    try {
      const detail = await fetchPatient(patientId);
      setSelectedPatient(detail);
    } catch {
      /* keep current selection on refresh failure */
    }
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const data = await searchPatients(q);
        setSearchResults(data.results);
      } catch (err: unknown) {
        setSearchResults([]);
        setSearchError(getPatientErrorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPatient = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.display_name);
    setSearchResults([]);
    setShowCreatePatient(false);
    setError(null);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowCreatePatient(false);
  };

  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault();
    const name = newPatientName.trim();
    if (!name) {
      setSearchError("Enter a patient name to create a profile.");
      return;
    }
    setCreatingPatient(true);
    setSearchError(null);
    try {
      const created = await createPatient({
        display_name: name,
        medical_record_number: newPatientMrn.trim() || undefined,
      });
      setSelectedPatient(created);
      setSearchQuery(created.display_name);
      setNewPatientName("");
      setNewPatientMrn("");
      setShowCreatePatient(false);
      setSearchResults([]);
    } catch (err: unknown) {
      setSearchError(getPatientErrorMessage(err));
    } finally {
      setCreatingPatient(false);
    }
  };

  const predictRisk = async () => {
    if (!selectedPatient) {
      setError("Select or create a patient before running a prediction.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        patient_id: selectedPatient.id,
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
      };
      if (showAdvanced) {
        for (const [key, val] of Object.entries(extended)) {
          if (val !== undefined && !Number.isNaN(val)) {
            payload[key] = val;
          }
        }
      }
      // Include selected symptoms
      if (selectedSymptoms.length > 0) {
        payload.symptoms = selectedSymptoms;
      }

      const response = await apiClient.post<PredictionResult>("/predict", payload);
      setResult(response.data);
      await refreshSelectedPatient(selectedPatient.id);
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
            Search or create a patient profile, then run cardiovascular risk scoring.
            Predictions link automatically to the active patient timeline.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          {/* Form column */}
          <div className="xl:col-span-2">
            <SectionCard
              title="Patient Selection"
              subtitle="Search by name or UUID, or register a new patient"
              accent="sky"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            >
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="patient-search" className={labelClass}>
                    Search patient
                  </label>
                  <input
                    id="patient-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedPatient && e.target.value !== selectedPatient.display_name) {
                        setSelectedPatient(null);
                      }
                    }}
                    placeholder="Name or patient UUID…"
                    className={inputClass}
                    autoComplete="off"
                  />
                  {searching && (
                    <p className={`${hintClass} text-teal-600`}>Searching…</p>
                  )}
                  {searchError && (
                    <p className={`${hintClass} text-red-600`}>{searchError}</p>
                  )}
                  {!searching &&
                    searchQuery.trim().length >= 2 &&
                    searchResults.length > 0 && (
                      <ul
                        className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                        role="listbox"
                      >
                        {searchResults.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              role="option"
                              onClick={() => handleSelectPatient(p)}
                              className="w-full px-4 py-3 text-left hover:bg-teal-50 transition"
                            >
                              <span className="font-medium text-slate-900">
                                {p.display_name}
                              </span>
                              <span className="block text-xs font-mono text-slate-500 mt-0.5">
                                {p.patient_uid}
                              </span>
                              {p.medical_record_number && (
                                <span className="block text-xs text-slate-400">
                                  MRN: {p.medical_record_number}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  {!searching &&
                    searchQuery.trim().length >= 2 &&
                    searchResults.length === 0 &&
                    !searchError && (
                      <p className={hintClass}>
                        No patients found. Create a new profile below.
                      </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePatient(!showCreatePatient);
                      if (!showCreatePatient && searchQuery.trim()) {
                        setNewPatientName(searchQuery.trim());
                      }
                    }}
                    className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 transition"
                  >
                    {showCreatePatient ? "Cancel" : "+ Create New Patient"}
                  </button>
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={handleClearPatient}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {showCreatePatient && (
                  <form
                    onSubmit={handleCreatePatient}
                    className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      New patient profile
                    </p>
                    <div>
                      <label htmlFor="new-patient-name" className={labelClass}>
                        Display name
                      </label>
                      <input
                        id="new-patient-name"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="new-patient-mrn" className={labelClass}>
                        MRN <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        id="new-patient-mrn"
                        value={newPatientMrn}
                        onChange={(e) => setNewPatientMrn(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingPatient}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      {creatingPatient ? "Creating…" : "Create & select patient"}
                    </button>
                  </form>
                )}

                {selectedPatient ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                      Active patient
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {selectedPatient.display_name}
                    </p>
                    <p className="text-xs font-mono text-slate-600 mt-1 break-all">
                      {selectedPatient.patient_uid}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Predictions</span>
                        <p className="font-semibold text-slate-900">
                          {selectedPatient.prediction_count}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Latest risk</span>
                        <p className="font-semibold text-slate-900">
                          {selectedPatient.latest_risk_probability != null
                            ? `${(selectedPatient.latest_risk_probability * 100).toFixed(1)}%`
                            : "—"}
                          {selectedPatient.latest_risk_category && (
                            <span className="block text-xs font-normal text-slate-600">
                              {selectedPatient.latest_risk_category}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/patients/${selectedPatient.id}`}
                      className="mt-3 inline-block text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      View full timeline →
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    Select or create a patient to enable prediction and timeline linking.
                  </p>
                )}
              </div>
            </SectionCard>

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

            <SectionCard
              title="Clinical Symptoms"
              subtitle="Patient-reported symptoms for prediction context"
              accent="sky"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <div className="space-y-4">
                {/* Symptom search input */}
                <div>
                  <label htmlFor="symptom-search" className={labelClass}>
                    Search and add symptoms
                  </label>
                  <div className="relative">
                    <input
                      id="symptom-search"
                      type="search"
                      value={symptomSearchQuery}
                      onChange={(e) => setSymptomSearchQuery(e.target.value)}
                      placeholder="Type to search (e.g., chest, breath, fever)…"
                      className={inputClass}
                      autoComplete="off"
                    />
                    {/* Symptom suggestions dropdown */}
                    {symptomSearchQuery.trim().length > 0 && filteredSymptoms.length > 0 && (
                      <ul
                        className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-sky-200 bg-white py-2 shadow-lg"
                        role="listbox"
                      >
                        {filteredSymptoms.map((symptom) => (
                          <li key={symptom}>
                            <button
                              type="button"
                              onClick={() => handleAddSymptom(symptom)}
                              disabled={selectedSymptoms.includes(symptom)}
                              className={`w-full px-4 py-2.5 text-left text-sm transition ${ selectedSymptoms.includes(symptom)
                                ? "bg-sky-50 text-sky-500 opacity-50 cursor-not-allowed"
                                : "hover:bg-sky-50 text-slate-700"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {selectedSymptoms.includes(symptom) && (
                                  <svg className="h-4 w-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {symptom}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {symptomSearchQuery.trim().length > 0 && filteredSymptoms.length === 0 && (
                      <p className={`${hintClass} text-sky-600 mt-2`}>No matching symptoms found.</p>
                    )}
                  </div>
                  <p className={hintClass}>Optional — select any relevant patient symptoms</p>
                </div>

                {/* Selected symptoms chips */}
                {selectedSymptoms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="mb-2.5 text-sm font-medium text-slate-700">Selected symptoms ({selectedSymptoms.length})</p>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence mode="popLayout">
                        {selectedSymptoms.map((symptom) => (
                          <EntranceChip
                            key={symptom}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-100 to-cyan-100 border border-sky-200 px-4 py-1.5 text-sm font-medium text-sky-800 shadow-sm hover:shadow-md transition"
                          >
                            <span>{symptom}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSymptom(symptom)}
                              className="ml-1 rounded-full hover:bg-sky-200 p-0.5 transition"
                              aria-label={`Remove ${symptom}`}
                            >
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </EntranceChip>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* No symptoms message */}
                {selectedSymptoms.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No symptoms selected — predictions will use vital signs and lab values only.</p>
                )}
              </div>
            </SectionCard>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Extended features (UCI / ICU)
                  </h2>
                  <p className="text-sm text-slate-500">
                    Optional fields from multi-dataset training; omitted values use cohort medians.
                  </p>
                </div>
                <span className="text-sm font-medium text-teal-700">
                  {showAdvanced ? "Hide" : "Show"}
                </span>
              </button>
              {showAdvanced && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["thalch", "Max heart rate"],
                      ["heart_rate", "Heart rate (ICU)"],
                      ["creatinine", "Creatinine"],
                      ["oldpeak", "ST depression"],
                      ["cp", "Chest pain (encoded)"],
                      ["exang", "Exercise angina (0/1)"],
                    ] as const
                  ).map(([name, label]) => (
                    <div key={name}>
                      <label htmlFor={name} className={labelClass}>
                        {label}
                      </label>
                      <input
                        id={name}
                        name={name}
                        type="number"
                        step="any"
                        value={extended[name] ?? ""}
                        onChange={handleExtendedNumber}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={predictRisk}
              disabled={loading || !selectedPatient}
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
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Clinical Summary</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPatient
                  ? `Profile: ${selectedPatient.display_name}`
                  : "Select a patient to link predictions"}
              </p>
              {selectedPatient && (
                <p className="mt-2 text-xs font-mono text-slate-500 break-all">
                  {selectedPatient.patient_uid}
                </p>
              )}

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
              <ResultCard
                isHighRisk={isHighRisk}
                duration={0.6}
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
                    <h3 className="font-bold text-slate-900">AI Clinical Assessment</h3>
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
                <div className="mt-5 rounded-xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Most Probable Condition
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-cyan-700">
                    {result.probable_condition || "General Health Risk"}
                  </h2>
                </div>
                <div className="mt-4 rounded-xl bg-white/80 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      AI Confidence
                    </p>

                    <span className="text-sm font-bold text-cyan-700">
                      <AnimatedNumber
                        value={result.ai_confidence || 0}
                        duration={0.8}
                        suffix="%"
                      />
                    </span>
                  </div>

                  <AnimatedProgressBar
                    value={result.ai_confidence || 0}
                    duration={1.5}
                    color="cyan"
                    showGlow={true}
                  />
                </div>
<div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-4 py-3">
  <span className="text-sm text-slate-600">
    Knowledge Graph Consistency
  </span>

  <span
    className={`rounded-full px-3 py-1 text-xs font-bold ${
      result.kg_consistency === "HIGH"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700"
    }`}
  >
    {result.kg_consistency}
  </span>
</div>
<div className="mt-4 rounded-xl bg-white/80 p-4">
  <p className="text-xs uppercase tracking-wide text-slate-500">
    Supporting Clinical Conditions
  </p>

  <div className="mt-3 flex flex-wrap gap-2">
    <AnimatePresence mode="popLayout">
      {result.matched_conditions?.map((condition, idx) => (
        <EntranceChip
          key={condition}
          delay={idx * 0.08}
          className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700"
        >
          {condition}
        </EntranceChip>
      ))}
    </AnimatePresence>
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
                <div className="mt-5">
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 p-4">
  <p className="text-xs uppercase tracking-wide text-slate-500">
    AI Clinical Reasoning
  </p>

  <div className="mt-3 space-y-2">
    {result.reasoning_notes?.map((note, idx) => (
      <ListItem
        key={idx}
        delay={idx * 0.1}
        variant="slideInLeft"
        className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
      >
        {note}
      </ListItem>
    ))}
  </div>
</div>
                  <AIValidationPanel
                    confidence_score={result.confidence_score}
                    confidence_label={result.confidence_label}
                    anomaly_detected={result.anomaly_detected}
                    anomaly_reason={result.anomaly_reason}
                    validation_notes={result.validation_notes}
                    trust_indicator={result.trust_indicator}
                    clinical_warnings={result.clinical_warnings}
                  />
                </div>
              </ResultCard>
            )}
          </div>
        </div>        {/* Floating Action Button for Explainability */}
        {result && (
          <motion.div
            className="fixed bottom-8 right-8 z-30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 120 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Link
                href="/explainability"
                className="flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-2xl transition hover:bg-slate-800"
              >
                <svg
                  className="h-5 w-5 text-teal-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                View AI Explanation
              </Link>
            </motion.div>
          </motion.div>
        )}

      </div>
    </Layout>
  );
}
