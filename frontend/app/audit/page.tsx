"use client";

import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { API_BASE } from "../../lib/api";

type AuditLog = {
  id: number;
  predicted_risk: number | string;   // probability
  risk_category?: string;            // may not exist on backend, so calculate if needed
  timestamp: string;
  model_version?: string;
  // add or remove fields as suitable to backend
  [key: string]: any;
};

const getRiskCategory = (probability: number | string) => {
  // interpret probability and return risk category
  if (typeof probability === "string") probability = Number(probability);
  if (isNaN(probability)) return "--";
  if (probability >= 0.8) return "High";
  if (probability >= 0.5) return "Medium";
  return "Low";
};

const getModelVersion = (log: AuditLog) => {
  if (log.model_version) return log.model_version;
  if (log.modelVersion) return log.modelVersion;
  if (log.version) return log.version;
  return "v1.0";
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const response = await axios.get(`${API_BASE}/logs`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          }
        });
        setLogs(response.data || []);
      } catch (err: any) {
        setError("Error loading audit logs.");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-neutral-800 mb-4">Audit Logs</h1>
          <p className="text-neutral-600 mb-7 text-lg">
            Review predictions and action logs for compliance and oversight.
          </p>
          <div className="bg-white shadow-xl rounded-xl p-4 md:p-6 border border-slate-200">
            {loading ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <div className="text-neutral-600 font-semibold text-lg">Loading audit logs...</div>
                </div>
              </div>
            ) : error ? (
              <div className="py-10 text-center text-red-500 font-semibold">{error}</div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-medium">
                No audit logs found.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full bg-white border border-slate-200 rounded-lg text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs tracking-wider">
                      <th className="py-3 pl-4 pr-2 font-bold">ID</th>
                      <th className="py-3 px-2 font-bold">Risk Probability</th>
                      <th className="py-3 px-2 font-bold">Risk Category</th>
                      <th className="py-3 px-2 font-bold">Timestamp</th>
                      <th className="py-3 px-2 font-bold">Model Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 pl-4 pr-2 text-slate-700">{log.id}</td>
                        <td className="py-3 px-2 text-slate-800">{Number(log.predicted_risk).toFixed(2)}</td>
                        <td className="py-3 px-2">
                          <span className={
                            getRiskCategory(log.predicted_risk) === "High"
                              ? "inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold"
                              : getRiskCategory(log.predicted_risk) === "Medium"
                              ? "inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold"
                              : "inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold"
                          }>
                            {getRiskCategory(log.predicted_risk)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {log.timestamp ? (
                            <span className="whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          ) : "--"}
                        </td>
                        <td className="py-3 px-2 text-slate-700">
                          {getModelVersion(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}