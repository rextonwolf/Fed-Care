"use client";

import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import AIValidationPanel from "../components/AIValidationPanel";
import axios, { AxiosError } from "axios";
import { API_BASE } from "../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const API_URL = `${API_BASE}/explainability`;

type PatientData = {
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

type TopFeature = {
  feature: string;
  shap_value: number;
  direction: string;
};

type FeatureImportance = {
  feature: string;
  shap_value: number;
  abs_importance: number;
  rank: number;
};

type ExplainabilityData = {
  risk_probability: number;
  risk_category: string;
  shap_values: Record<string, number>;
  feature_importance: FeatureImportance[];
  top_features: TopFeature[];
  model: { name: string; version: string; framework: string };
  input_features: string[];
};

type ExplainabilityResponse = {
  status: string;
  data: ExplainabilityData;
};

const DEFAULT_PATIENT: PatientData = {
  age: 62,
  gender: 1,
  height: 170,
  weight: 90,
  ap_hi: 148,
  ap_lo: 92,
  cholesterol: 3,
  gluc: 2,
  smoke: 1,
  alco: 0,
  active: 0,
};

const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  gender: "Gender",
  height: "Height",
  weight: "Weight",
  ap_hi: "Systolic BP",
  ap_lo: "Diastolic BP",
  cholesterol: "Cholesterol",
  gluc: "Glucose",
  smoke: "Smoking",
  alco: "Alcohol",
  active: "Physical Activity",
};

const accentStyles: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  rose: {
    border: "border-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
  },
  amber: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
  },
  sky: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-800",
  },
  teal: {
    border: "border-teal-200",
    bg: "bg-teal-50",
    text: "text-teal-700",
    badge: "bg-teal-100 text-teal-800",
  },
};

function formatFeatureLabel(feature: string) {
  return FEATURE_LABELS[feature] ?? feature;
}

function formatShapSigned(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatShapPercent(value: number) {
  const pct = Math.abs(value) * 100;
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${pct.toFixed(0)}%`;
}

function cholesterolLabel(level: number) {
  if (level >= 3) return "High";
  if (level >= 2) return "Above normal";
  return "Normal";
}

function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: { message?: string } | string }>;
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
    if (axErr.response?.status === 401) {
      return "Authentication required. Please log in from the dashboard.";
    }
    return axErr.message || "Failed to load explainability data.";
  }
  return "An unexpected error occurred.";
}

function buildClinicalMetrics(patient: PatientData, shap: Record<string, number>) {
  return [
    {
      label: "Blood Pressure",
      value: `${patient.ap_hi}/${patient.ap_lo}`,
      unit: "mmHg",
      status: patient.ap_hi >= 140 || patient.ap_lo >= 90 ? "Elevated" : "Normal",
      shapContribution: shap.ap_hi ?? 0,
      icon: "BP",
      accent: "rose" as const,
    },
    {
      label: "Cholesterol",
      value: `Level ${patient.cholesterol}`,
      unit: "",
      status: cholesterolLabel(patient.cholesterol),
      shapContribution: shap.cholesterol ?? 0,
      icon: "CH",
      accent: "amber" as const,
    },
    {
      label: "Age",
      value: String(patient.age),
      unit: "years",
      status: patient.age >= 60 ? "Senior" : patient.age >= 45 ? "Mid-life" : "Adult",
      shapContribution: shap.age ?? 0,
      icon: "AG",
      accent: "sky" as const,
    },
    {
      label: "Weight",
      value: String(patient.weight),
      unit: "kg",
      status: patient.weight >= 85 ? "Elevated" : "Normal",
      shapContribution: shap.weight ?? 0,
      icon: "WT",
      accent: "teal" as const,
    },
  ];
}

export default function ExplainabilityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExplainabilityData | null>(null);
  const [patient, setPatient] = useState<PatientData>(DEFAULT_PATIENT);
  const [validation, setValidation] = useState<any | null>(null);

  const fetchExplainability = async (payload: PatientData) => {
    setLoading(true);
    setError(null);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        setError("No authentication token found. Please log in first.");
        setLoading(false);
        return;
      }

      const response = await axios.post<ExplainabilityResponse>(
        API_URL,
        {
          age: Number(payload.age),
          gender: Number(payload.gender),
          height: Number(payload.height),
          weight: Number(payload.weight),
          ap_hi: Number(payload.ap_hi),
          ap_lo: Number(payload.ap_lo),
          cholesterol: Number(payload.cholesterol),
          gluc: Number(payload.gluc),
          smoke: Number(payload.smoke),
          alco: Number(payload.alco),
          active: Number(payload.active),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
        }
      );

      if (response.data.status !== "success" || !response.data.data) {
        setError("Explainability API returned an unexpected response.");
        setData(null);
        return;
      }

      setData(response.data.data);
      setPatient(payload);
      // also fetch lightweight validation from /predict for the same payload
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token) {
          const vresp = await axios.post(
            `${API_URL.replace(/\/explainability$/, "")}/predict`,
            {
              age: Number(payload.age),
              gender: Number(payload.gender),
              height: Number(payload.height),
              weight: Number(payload.weight),
              ap_hi: Number(payload.ap_hi),
              ap_lo: Number(payload.ap_lo),
              cholesterol: Number(payload.cholesterol),
              gluc: Number(payload.gluc),
              smoke: Number(payload.smoke),
              alco: Number(payload.alco),
              active: Number(payload.active),
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setValidation(vresp.data ?? null);
        }
      } catch (err) {
        // ignore validation fetch failures — explainability still shows
        setValidation(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplainability(DEFAULT_PATIENT);
  }, []);

  const riskPercent = data ? Math.round(data.risk_probability * 100) : 0;
  const isHighRisk = data?.risk_category === "High Risk";

  const shapFeatures = useMemo(() => {
    if (!data?.feature_importance) return [];
    return data.feature_importance.map((row) => ({
      feature: formatFeatureLabel(row.feature),
      shap: row.shap_value,
    }));
  }, [data]);

  const featureImpactData = useMemo(() => {
    if (!data?.feature_importance) return [];
    return data.feature_importance.map((row) => ({
      name: formatFeatureLabel(row.feature),
      impact: Math.round(row.shap_value * 100),
    }));
  }, [data]);

  const chartDomain = useMemo(() => {
    if (!featureImpactData.length) return [-10, 30];
    const maxAbs = Math.max(
      ...featureImpactData.map((d) => Math.abs(d.impact)),
      5
    );
    const bound = Math.ceil(maxAbs * 1.2);
    return [-bound, bound];
  }, [featureImpactData]);

  const clinicalMetrics = useMemo(() => {
    if (!data) return [];
    return buildClinicalMetrics(patient, data.shap_values);
  }, [data, patient]);

  const topRiskFactors = useMemo(() => {
    if (!data?.top_features) return [];
    return data.top_features.map((item) => ({
      factor: formatFeatureLabel(item.feature),
      impact: formatShapSigned(item.shap_value),
      direction: item.direction === "increases_risk" ? "increases" : "decreases",
      detail: `SHAP ${formatShapSigned(item.shap_value)} — ${item.direction.replace(/_/g, " ")}`,
    }));
  }, [data]);

  const protectiveFeatures = useMemo(() => {
    return (
      data?.feature_importance.filter((f) => f.shap_value < 0).slice(0, 2) ?? []
    );
  }, [data]);

  const modelVersion = data?.model
    ? `${data.model.name} ${data.model.version}`
    : "FTTransformer";

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 -m-8 p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
                Model Explainability
              </span>
              <span className="text-xs text-slate-500">{modelVersion}</span>
              {data && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Live API
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              AI Explainability Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              SHAP-based feature attributions from the federated cardiovascular model.
              Analysis powered by{" "}
              <code className="rounded bg-slate-100 px-1 text-sm">POST /explainability</code>.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Patient Cohort
              </p>
              <p className="font-semibold text-slate-900">Live inference record</p>
            </div>
            <div className="h-px w-full bg-slate-200 sm:h-10 sm:w-px" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Predicted Risk
              </p>
              {loading ? (
                <div className="mt-1 h-8 w-24 animate-pulse rounded bg-slate-200" />
              ) : data ? (
                <div className="flex items-center gap-2">
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
                    {data.risk_category}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
            <p className="font-semibold">Unable to load explainability analysis</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => fetchExplainability(patient)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="mb-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            <p className="mt-4 font-semibold text-slate-700">
              Computing SHAP explainability…
            </p>
            <p className="mt-1 text-sm text-slate-500">
              First request may take up to 30 seconds while the explainer initializes.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* AI Validation panel (uses validation fetched from /predict) */}
            <div className="mb-6">
              <AIValidationPanel
                confidence_score={validation?.confidence_score ?? null}
                confidence_label={validation?.confidence_label ?? null}
                anomaly_detected={validation?.anomaly_detected ?? false}
                anomaly_reason={validation?.anomaly_reason ?? null}
                validation_notes={validation?.validation_notes ?? null}
                trust_indicator={validation?.trust_indicator ?? null}
                clinical_warnings={validation?.clinical_warnings ?? null}
              />
            </div>
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Key Clinical Indicators
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {clinicalMetrics.map((metric) => {
                  const style = accentStyles[metric.accent];
                  return (
                    <div
                      key={metric.label}
                      className={`rounded-2xl border ${style.border} bg-white p-5 shadow-sm transition hover:shadow-md`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.bg} text-xs font-bold ${style.text}`}
                        >
                          {metric.icon}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
                        >
                          {metric.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{metric.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {metric.value}
                        {metric.unit && (
                          <span className="ml-1 text-sm font-normal text-slate-500">
                            {metric.unit}
                          </span>
                        )}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        SHAP contribution:{" "}
                        <span className={`font-semibold ${style.text}`}>
                          {formatShapPercent(metric.shapContribution)}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Top Risk Factors</h2>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                    Ranked by SHAP
                  </span>
                </div>
                <div className="space-y-3">
                  {topRiskFactors.map((item, index) => (
                    <div
                      key={`${item.factor}-${index}`}
                      className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{item.factor}</p>
                          <span className="font-mono text-sm font-bold text-red-600">
                            {item.impact}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Direction:{" "}
                          <span
                            className={
                              item.direction === "increases"
                                ? "text-red-600"
                                : "text-emerald-600"
                            }
                          >
                            {item.direction}
                          </span>{" "}
                          predicted risk
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <svg
                      className="h-5 w-5"
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
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">AI Explanation Panel</h2>
                </div>
                <div className="space-y-4 text-sm leading-relaxed text-slate-700">
                  <p>
                    The federated {data.model.name} model assigned a{" "}
                    <strong className={isHighRisk ? "text-red-700" : "text-emerald-700"}>
                      {riskPercent}% {isHighRisk ? "high-risk" : "low-risk"}
                    </strong>{" "}
                    probability for cardiovascular events. The strongest drivers from live SHAP
                    analysis are listed below.
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-slate-600">
                    {data.top_features.slice(0, 3).map((f) => (
                      <li key={f.feature}>
                        <strong className="text-slate-800">
                          {formatFeatureLabel(f.feature)} (SHAP {formatShapSigned(f.shap_value)})
                        </strong>
                        {" — "}
                        {f.direction.replace(/_/g, " ")} model output.
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-lg border border-teal-200 bg-white/80 p-3 text-xs text-teal-800">
                    <strong>Clinical note:</strong> Explanations are for decision support only.
                    Confirm with standard-of-care assessments before treatment changes.
                  </div>
                </div>
              </section>
            </div>

            <section
              className={`mb-8 rounded-2xl border p-6 shadow-sm ${
                isHighRisk
                  ? "border-red-100 bg-red-50/50"
                  : "border-emerald-100 bg-emerald-50/50"
              }`}
            >
              <h2 className="mb-3 text-lg font-bold text-slate-900">
                {isHighRisk
                  ? "Why This Patient Is Classified as High Risk"
                  : "Risk Classification Summary"}
              </h2>
              <p className="mb-4 text-slate-700 leading-relaxed">
                {isHighRisk ? (
                  <>
                    Live SHAP attributions indicate elevated cardiovascular risk (score:{" "}
                    <strong>{data.risk_probability}</strong>). The top contributing features are{" "}
                    <strong>
                      {data.top_features
                        .slice(0, 3)
                        .map((f) => formatFeatureLabel(f.feature))
                        .join(", ")}
                    </strong>
                    , pushing the model above the 0.50 decision threshold.
                  </>
                ) : (
                  <>
                    The model predicts <strong>low cardiovascular risk</strong> (probability:{" "}
                    {data.risk_probability}). Protective or neutral SHAP factors outweigh positive
                    risk drivers for this patient profile.
                  </>
                )}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.top_features.slice(0, 2).map((f, i) => (
                  <div
                    key={f.feature}
                    className={`rounded-xl bg-white p-4 border ${
                      isHighRisk ? "border-red-100" : "border-emerald-100"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {i === 0 ? "Primary driver" : "Secondary driver"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatFeatureLabel(f.feature)}
                    </p>
                    <p className="text-sm text-slate-600">
                      SHAP {formatShapSigned(f.shap_value)}
                    </p>
                  </div>
                ))}
                <div
                  className={`rounded-xl bg-white p-4 border ${
                    isHighRisk ? "border-red-100" : "border-emerald-100"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Protective factors
                  </p>
                  {protectiveFeatures.length > 0 ? (
                    <>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatFeatureLabel(protectiveFeatures[0].feature)}
                      </p>
                      <p className="text-sm text-slate-600">
                        SHAP {formatShapSigned(protectiveFeatures[0].shap_value)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">None significant in this cohort</p>
                  )}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-slate-900">
                  SHAP Feature Importance
                </h2>
                <p className="mb-6 text-sm text-slate-500">
                  Live SHAP values — features pushing prediction toward risk outcome
                </p>
                <div className="space-y-3">
                  {shapFeatures.map((row) => {
                    const maxShap = Math.max(
                      ...shapFeatures.map((r) => Math.abs(r.shap)),
                      0.001
                    );
                    const width = (Math.abs(row.shap) / maxShap) * 100;
                    const isPositive = row.shap >= 0;
                    return (
                      <div key={row.feature}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.feature}</span>
                          <span
                            className={`font-mono font-semibold ${
                              isPositive ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {formatShapSigned(row.shap)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              isPositive ? "bg-red-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Framework: {data.model.framework} · {data.input_features.length} features
                  analyzed
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-slate-900">Feature Impact Chart</h2>
                <p className="mb-6 text-sm text-slate-500">
                  SHAP contribution scaled to percentage points (live backend)
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={featureImpactData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      domain={chartDomain}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: "#334155", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = Number(value ?? 0);
                        return [`${n > 0 ? "+" : ""}${n}%`, "Impact"];
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <ReferenceLine x={0} stroke="#94a3b8" />
                    <Bar dataKey="impact" radius={[0, 4, 4, 0]} barSize={18}>
                      {featureImpactData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.impact >= 0 ? "#dc2626" : "#059669"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          </>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Explainability data sourced from FastAPI SHAP endpoint. For clinical use only with
          institutional validation.
        </p>
      </div>
    </Layout>
  );
}
