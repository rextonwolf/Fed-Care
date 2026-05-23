import { apiClient, getApiErrorMessage } from "./http";
import { getToken } from "./auth";

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

export function getAnalyticsErrorMessage(err: unknown): string {
  return getApiErrorMessage(
    err,
    "Failed to load analytics. Check that the API is running and you are logged in."
  );
}

export function hasAuthToken(): boolean {
  return Boolean(getToken());
}

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!getToken()) {
    const err = new Error("Not authenticated") as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  const [metricsRes, analyticsRes, activityRes] = await Promise.all([
    apiClient.get<SystemMetrics>("/system-metrics"),
    apiClient.get<PredictionAnalytics>("/prediction-analytics"),
    apiClient.get<RecentActivity>("/recent-activity", {
      params: { limit: 20 },
    }),
  ]);

  return {
    metrics: metricsRes.data,
    analytics: analyticsRes.data,
    activity: activityRes.data,
  };
}
