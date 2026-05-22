import axios, { AxiosError } from "axios";
import { API_BASE } from "./api";

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

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getFederatedErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: string | { message?: string } }>;
    if (axErr.response?.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (axErr.response?.status === 503) {
      return "Federated monitoring temporarily unavailable. Retry shortly.";
    }
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
    return axErr.message || "Failed to load federated monitoring data.";
  }
  return "Failed to load federated monitoring data.";
}

export async function fetchFederatedDashboardData(): Promise<FederatedDashboardData> {
  const headers = authHeaders();
  const [statusRes, clientsRes, roundsRes] = await Promise.all([
    axios.get<FederatedStatus>(`${API_BASE}/federated-status`, { headers }),
    axios.get<FederatedClientsResponse>(`${API_BASE}/federated-clients`, {
      headers,
    }),
    axios.get<FederatedRoundsResponse>(`${API_BASE}/federated-rounds`, { headers }),
  ]);

  return {
    status: statusRes.data,
    clients: clientsRes.data,
    rounds: roundsRes.data,
  };
}
