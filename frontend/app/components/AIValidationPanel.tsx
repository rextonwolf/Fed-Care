"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  AnimatedNumber,
  AnimatedProgressBar,
  EntranceChip,
} from "./MotionLibrary";

type ValidationProps = {
  confidence_score?: number | null;
  confidence_label?: string | null;
  anomaly_detected?: boolean | null;
  anomaly_reason?: string | null;
  validation_notes?: string[] | null;
  trust_indicator?: number | null; // 0..100
  clinical_warnings?: string[] | null;
};

export default function AIValidationPanel({
  confidence_score = null,
  confidence_label = null,
  anomaly_detected = false,
  anomaly_reason = null,
  validation_notes = null,
  trust_indicator = null,
  clinical_warnings = null,
}: ValidationProps) {
  const scorePct = confidence_score != null ? Math.round(confidence_score * 100) : null;

  const badgeColor =
    confidence_score == null
      ? "bg-slate-100 text-slate-700"
      : confidence_score >= 0.8
      ? "bg-sky-600 text-white"
      : confidence_score >= 0.5
      ? "bg-sky-100 text-sky-800"
      : "bg-amber-100 text-amber-800";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/80 via-white to-cyan-50/50 p-4 shadow-[0_20px_50px_rgba(14,165,233,0.12)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">AI Validation</h3>
            <p className="mt-1 text-xs text-slate-500">Clinical validation and trust signals</p>
          </div>
          <div className="flex items-center gap-3">
            {scorePct != null ? (
              <EntranceChip className={`rounded-md px-3 py-1 text-sm font-semibold ${badgeColor}`}>
                <span className="inline-flex items-center gap-1">
                  <AnimatedNumber value={scorePct} duration={0.7} />%
                  <span>{confidence_label ?? "Confidence"}</span>
                </span>
              </EntranceChip>
            ) : (
              <div className="rounded-md px-3 py-1 text-sm font-semibold bg-slate-100 text-slate-600">
                Pending
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {/* Trust indicator */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Trust</span>
              <span className="font-mono text-xs text-slate-700">
                {trust_indicator != null ? <AnimatedNumber value={trust_indicator} duration={0.8} /> : "—"}
              </span>
            </div>
            <div className="mt-2">
              <AnimatedProgressBar
                value={Math.max(0, Math.min(100, trust_indicator ?? (scorePct ?? 0)))}
                duration={1}
                color={scorePct != null && scorePct >= 80 ? "emerald" : scorePct != null && scorePct >= 50 ? "cyan" : "yellow"}
              />
            </div>
          </div>

          {/* Anomaly alert */}
          {anomaly_detected ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 shadow-sm">
              <strong>Anomaly detected:</strong> {anomaly_reason ?? "See validation notes"}
            </div>
          ) : (
            <div className="rounded-md border border-sky-100 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
              No anomalies detected
            </div>
          )}

          {/* Clinical warnings */}
          {clinical_warnings && clinical_warnings.length > 0 && (
            <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-800 shadow-sm">
              <strong>Clinical warnings:</strong>
              <ul className="mt-1 list-inside list-disc pl-3 text-xs">
                {clinical_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation notes */}
          {validation_notes && validation_notes.length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50/90 p-3 text-sm text-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Validation notes</p>
              <ul className="mt-2 list-inside list-disc pl-3 text-xs">
                {validation_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
