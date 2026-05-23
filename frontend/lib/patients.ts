import { apiClient, getApiErrorMessage } from "./http";
import { getToken } from "./auth";

export type PatientSummary = {
  id: number;
  patient_uid: string;
  display_name: string;
  medical_record_number?: string | null;
  hospital_name?: string | null;
  prediction_count: number;
  latest_risk_probability?: number | null;
  latest_risk_category?: string | null;
  last_prediction_at?: string | null;
  created_at: string;
};

export type PatientDetail = PatientSummary & {
  notes?: string | null;
  updated_at: string;
};

export type PredictionHistoryItem = {
  id: number;
  risk_probability: number;
  risk_category?: string | null;
  model_version?: string | null;
  source: string;
  timestamp?: string | null;
  age?: number | null;
  gender?: number | null;
  height?: number | null;
  weight?: number | null;
  ap_hi?: number | null;
  ap_lo?: number | null;
  cholesterol?: number | null;
  gluc?: number | null;
  smoke?: number | null;
  alco?: number | null;
  active?: number | null;
};

export type PatientHistory = {
  patient: PatientDetail;
  predictions: PredictionHistoryItem[];
  count: number;
  risk_trend: { date: string; risk: number; category?: string | null }[];
};

export function getPatientErrorMessage(err: unknown): string {
  return getApiErrorMessage(err, "Failed to load patient data.");
}

export type PatientSearchResult = {
  query: string;
  results: PatientSummary[];
  count: number;
};

export async function fetchPatients(): Promise<PatientSummary[]> {
  if (!getToken()) throw new Error("Not authenticated");
  const res = await apiClient.get<{ patients: PatientSummary[] }>("/patients");
  return res.data.patients;
}

export async function searchPatients(
  q: string,
  limit = 20
): Promise<PatientSearchResult> {
  if (!getToken()) throw new Error("Not authenticated");
  const res = await apiClient.get<PatientSearchResult>("/patients/search", {
    params: { q: q.trim(), limit },
  });
  return res.data;
}

export async function fetchPatient(patientId: number): Promise<PatientDetail> {
  if (!getToken()) throw new Error("Not authenticated");
  const res = await apiClient.get<PatientDetail>(`/patients/${patientId}`);
  return res.data;
}

export async function createPatient(payload: {
  display_name: string;
  medical_record_number?: string;
  notes?: string;
}): Promise<PatientDetail> {
  if (!getToken()) throw new Error("Not authenticated");
  const res = await apiClient.post<PatientDetail>("/patients", payload);
  return res.data;
}

export async function fetchPatientHistory(
  patientId: number
): Promise<PatientHistory> {
  if (!getToken()) throw new Error("Not authenticated");
  const res = await apiClient.get<PatientHistory>(
    `/patients/${patientId}/history`
  );
  return res.data;
}
