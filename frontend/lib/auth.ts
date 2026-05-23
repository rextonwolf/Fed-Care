import axios, { AxiosError } from "axios";
import { API_BASE } from "./api";

const TOKEN_KEY = "token";
const USERNAME_KEY = "username";
const ROLE_KEY = "role";

export type LoginResponse = {
  access_token: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function persistSession(
  token: string,
  username: string,
  role?: string
): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  if (role) localStorage.setItem(ROLE_KEY, role);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getLoginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ detail?: string }>;
    if (axErr.response?.status === 401) {
      return "Invalid username or password.";
    }
    if (typeof axErr.response?.data?.detail === "string") {
      return axErr.response.data.detail;
    }
    return axErr.message || "Login failed.";
  }
  return "Login failed. Please try again.";
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    `${API_BASE}/login`,
    null,
    {
      params: { username, password },
    }
  );
  return response.data;
}

export function logout(): void {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
