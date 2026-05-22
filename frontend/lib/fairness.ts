import axios, { AxiosError } from "axios";
import { API_BASE } from "./api";

export type GenderDistributionItem = {
  group: string;
  count: number;
  percentage: number;
};

export type RiskByGenderRow = {
  category: string;
  female: number;
  male: number;
  unknown: number;
};

export type ProtectedGroupStat = {
  group: string;
  attribute: string;
  count: number;
  positive_prediction_rate: number;
  average_risk_score: number;
  average_age: number;
  high_risk_count: number;
  low_risk_count: number;
};

export type SubgroupPositiveRate = {
  group: string;
  attribute: string;
  positive_prediction_rate: number;
  count: number;
  benchmark_rate?: number | null;
};

export type FairnessMetrics = {
  demographic_parity_score: number;
  fairness_gap: number;
  population_positive_rate: number;
  gender_distribution: GenderDistributionItem[];
  risk_distribution_by_gender: RiskByGenderRow[];
  protected_group_statistics: ProtectedGroupStat[];
  subgroup_positive_prediction_rates: SubgroupPositiveRate[];
  sample_size: number;
  computed_at: string;
};

export type FairnessTrendPoint = {
  date: string;
  demographic_parity_score: number;
  fairness_gap: number;
  population_positive_rate: number;
  prediction_count: number;
};

export type SubgroupTrendPoint = {
  date: string;
  group: string;
  attribute: string;
  positive_prediction_rate: number;
  prediction_count: number;
};

export type BiasDriftIndicator = {
  indicator_id: string;
  attribute: string;
  metric: string;
  recent_value: number;
  baseline_value: number;
  drift_delta: number;
  severity: string;
  status: string;
  message: string;
};

export type FairnessTrends = {
  fairness_metrics_over_time: FairnessTrendPoint[];
  subgroup_prediction_trends: SubgroupTrendPoint[];
  bias_drift_indicators: BiasDriftIndicator[];
  sample_size: number;
  computed_at: string;
};

export type FairnessDashboardData = {
  metrics: FairnessMetrics;
  trends: FairnessTrends;
};

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getFairnessErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: string | { message?: string } }>;
    if (axErr.response?.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (axErr.response?.status === 503) {
      return "Fairness analytics temporarily unavailable. Retry shortly.";
    }
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
    return axErr.message || "Failed to load fairness analytics.";
  }
  return "Failed to load fairness analytics.";
}

export async function fetchFairnessDashboardData(
  trendDays = 90
): Promise<FairnessDashboardData> {
  const headers = authHeaders();
  const [metricsRes, trendsRes] = await Promise.all([
    axios.get<FairnessMetrics>(`${API_BASE}/fairness-metrics`, { headers }),
    axios.get<FairnessTrends>(`${API_BASE}/fairness-trends`, {
      headers,
      params: { days: trendDays },
    }),
  ]);

  return {
    metrics: metricsRes.data,
    trends: trendsRes.data,
  };
}
