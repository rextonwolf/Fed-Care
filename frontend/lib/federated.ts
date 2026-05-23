import { apiClient, getApiErrorMessage } from "./http";
import { getToken } from "./auth";

export type FederatedStatus = {
  active_clients: number;
  total_clients: number;
  global_model_version: string;
  current_round: number;
  synchronization_status: string;
  average_client_latency: number;
  aggregation_status: string;
  total_training_samples: number;
  computed_at: string;
};

export type FederatedClient = {
  client_id: string;
  hospital_name: string;
  region?: string | null;
  training_samples: number;
  last_active?: string | null;
  latency: number;
  local_model_version: string;
  synchronization_state: string;
  current_round: number;
};

export type FederatedClientsResponse = {
  clients: FederatedClient[];
  count: number;
  computed_at: string;
};

export type FederatedRound = {
  round_number: number;
  started_at?: string | null;
  completed_at?: string | null;
  round_duration_seconds: number;
  participating_clients: number;
  aggregated_samples: number;
  model_accuracy: number;
  aggregation_loss: number;
  aggregation_metrics: {
    fedavg_weighted_samples: number;
    participating_clients: number;
    convergence_delta?: number | null;
    client_ids?: string[] | null;
  };
};

export type FederatedRoundsResponse = {
  rounds: FederatedRound[];
  count: number;
  accuracy_progression: { round: number; accuracy: number; loss: number; samples?: number }[];
  computed_at: string;
};

export type FederatedDashboardData = {
  status: FederatedStatus;
  clients: FederatedClientsResponse;
  rounds: FederatedRoundsResponse;
};

export function getFederatedErrorMessage(err: unknown): string {
  return getApiErrorMessage(err, "Failed to load federated monitoring data.");
}

export async function fetchFederatedDashboardData(): Promise<FederatedDashboardData> {
  if (!getToken()) {
    throw new Error("Not authenticated");
  }

  const [statusRes, clientsRes, roundsRes] = await Promise.all([
    apiClient.get<FederatedStatus>("/federated-status"),
    apiClient.get<FederatedClientsResponse>("/federated-clients"),
    apiClient.get<FederatedRoundsResponse>("/federated-rounds"),
  ]);

  return {
    status: statusRes.data,
    clients: clientsRes.data,
    rounds: roundsRes.data,
  };
}
