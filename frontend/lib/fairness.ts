import { apiClient, getApiErrorMessage } from "./http";
import { getToken } from "./auth";

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

export function getFairnessErrorMessage(err: unknown): string {
  return getApiErrorMessage(err, "Failed to load fairness analytics.");
}

export async function fetchFairnessDashboardData(
  trendDays = 90
): Promise<FairnessDashboardData> {
  if (!getToken()) {
    throw new Error("Not authenticated");
  }

  const [metricsRes, trendsRes] = await Promise.all([
    apiClient.get<FairnessMetrics>("/fairness-metrics"),
    apiClient.get<FairnessTrends>("/fairness-trends", {
      params: { days: trendDays },
    }),
  ]);

  return {
    metrics: metricsRes.data,
    trends: trendsRes.data,
  };
}
