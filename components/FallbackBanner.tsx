"use client";

import { AlertTriangle, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface FallbackBannerProps {
  offline: boolean;
  requiresHumanReview: boolean;
}

export function FallbackBanner({
  offline,
  requiresHumanReview,
}: FallbackBannerProps) {
  if (!offline && !requiresHumanReview) return null;

  return (
    <div className="space-y-2">
      {offline && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3",
          )}
          role="alert"
        >
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-200">
              Offline / API outage fallback active
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Gemini is unreachable (network, timeout, or rate limit). Screening
              is using the embedded critical interaction matrix.
            </p>
          </div>
        </div>
      )}
      {requiresHumanReview && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3",
          )}
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-200">
              [⚠️ Human Review Required: Low OCR Confidence]
            </p>
            <p className="mt-1 text-sm text-slate-300">
              One or more medications need clinician verification before the
              chart is finalized.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
