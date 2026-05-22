import axios, { AxiosError } from "axios";
import { API_BASE } from "./api";

export type SystemMetrics = {
  total_predictions: number;
  high_risk_patients: number;
  low_risk_patients: number;
  average_risk_score: number;
  total_logs: number;
  system_status: string;
  model_version: string;
};

export type RiskDistributionItem = {
  category: string;
  count: number;
  percentage: number;
};

export type PredictionTrendPoint = {
  date: string;
  count: number;
  average_risk_score: number;
};

export type PredictionAnalytics = {
  risk_distribution: RiskDistributionItem[];
  average_blood_pressure: { systolic: number; diastolic: number };
  average_cholesterol: number;
  average_age: number;
  prediction_trends: PredictionTrendPoint[];
};

export type RecentActivityItem = {
  id: number;
  predicted_risk: number;
  risk_category?: string | null;
  age?: number | null;
  ap_hi?: number | null;
  ap_lo?: number | null;
  cholesterol?: number | null;
  timestamp?: string | null;
  model_version?: string | null;
};

export type RecentActivity = {
  activities: RecentActivityItem[];
  count: number;
};

export type DashboardData = {
  metrics: SystemMetrics;
  analytics: PredictionAnalytics;
  activity: RecentActivity;
};

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getAnalyticsErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: string | { message?: string } }>;
    if (axErr.response?.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (axErr.response?.status === 503) {
      return "Analytics service temporarily unavailable. Retry shortly.";
    }
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
    return axErr.message || "Failed to load analytics.";
  }
  return "Failed to load analytics.";
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const headers = authHeaders();
  const [metricsRes, analyticsRes, activityRes] = await Promise.all([
    axios.get<SystemMetrics>(`${API_BASE}/system-metrics`, { headers }),
    axios.get<PredictionAnalytics>(`${API_BASE}/prediction-analytics`, {
      headers,
    }),
    axios.get<RecentActivity>(`${API_BASE}/recent-activity`, {
      headers,
      params: { limit: 20 },
    }),
  ]);

  return {
    metrics: metricsRes.data,
    analytics: analyticsRes.data,
    activity: activityRes.data,
  };
}
