"use client";

import { useState } from "react";
import { AlertTriangle, Check, ClipboardCopy, RefreshCw } from "lucide-react";

import type { InteractionAlert } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TriageSummaryProps {
  clinicalBriefing: string;
  interactionAlerts: InteractionAlert[];
  onReevaluate: () => void;
  reevaluating: boolean;
  disabled?: boolean;
}

const severityStyles: Record<
  InteractionAlert["severity"],
  { card: string; badge: string }
> = {
  HIGH: {
    card: "border-red-500/50 bg-red-500/10",
    badge: "bg-red-500/20 text-red-200",
  },
  MODERATE: {
    card: "border-amber-500/50 bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-100",
  },
  LOW: {
    card: "border-emerald-500/50 bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-100",
  },
};

function briefingBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);
}

export function TriageSummary({
  clinicalBriefing,
  interactionAlerts,
  onReevaluate,
  reevaluating,
  disabled = false,
}: TriageSummaryProps) {
  const [copied, setCopied] = useState(false);
  const bullets = briefingBullets(clinicalBriefing);

  const exportBriefing = async () => {
    const alertBlock =
      interactionAlerts.length === 0
        ? "No interaction alerts."
        : interactionAlerts
            .map(
              (a) =>
                `[${a.severity}] ${a.drugsInvolved.join(" + ")} — ${a.clinicalRisk} Action: ${a.recommendedAction}`,
            )
            .join("\n");

    const payload = [
      "MediTriage AI — Clinical Briefing",
      "",
      "Pre-consultation summary:",
      ...bullets.map((b) => `• ${b}`),
      "",
      "Interaction alerts:",
      alertBlock,
      "",
      "Academic simulation only — not for clinical use.",
    ].join("\n");

    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4">
      <div
        className="flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-500/15 px-4 py-3 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
        role="alert"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p className="text-sm font-semibold leading-relaxed text-amber-100">
          Check with your doctor. All of this is AI-generated and could be
          wrong.
        </p>
      </div>

      <div className="rounded-xl border border-cyan-500/30 bg-[#131C2E] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
            Pre-Consultation Briefing
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || reevaluating}
              onClick={() => void exportBriefing()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Export Clinical Briefing"}
            </button>
            <button
              type="button"
              disabled={disabled || reevaluating}
              onClick={onReevaluate}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", reevaluating && "animate-spin")}
              />
              Re-evaluate Interactions
            </button>
          </div>
        </div>
        <ul className="space-y-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2 text-sm text-slate-200">
              <span className="text-cyan-400">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Interaction Alerts
        </h3>
        {interactionAlerts.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            No critical interactions flagged for the current medication list.
          </p>
        ) : (
          <div className="space-y-3">
            {interactionAlerts.map((alert) => {
              const styles = severityStyles[alert.severity];
              return (
                <article
                  key={alert.id}
                  className={cn("rounded-xl border p-4", styles.card)}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide",
                        styles.badge,
                      )}
                    >
                      {alert.severity}
                    </span>
                    <p className="text-sm font-semibold text-slate-100">
                      {alert.drugsInvolved.join(" + ")}
                    </p>
                  </div>
                  <p className="text-sm text-slate-200">{alert.clinicalRisk}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-medium text-slate-100">Action: </span>
                    {alert.recommendedAction}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
