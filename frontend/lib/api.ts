/**
 * Backend API base URL — set via NEXT_PUBLIC_API_URL in docker-compose or .env.local
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
