"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import type { ExtractedMedication } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MedicationCardProps {
  medication: ExtractedMedication;
  onChange: (next: ExtractedMedication) => void;
  onDelete: () => void;
}

export function MedicationCard({
  medication,
  onChange,
  onDelete,
}: MedicationCardProps) {
  const needsReview =
    medication.isFlaggedForReview || medication.confidenceScore < 0.7;

  const update = (field: keyof ExtractedMedication, value: string | number | boolean) => {
    onChange({ ...medication, [field]: value });
  };

  return (
    <article
      className={cn(
        "rounded-xl border bg-[#131C2E] p-4 shadow-sm",
        needsReview ? "border-amber-500/50" : "border-slate-700",
      )}
    >
      {needsReview && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          [⚠️ Human Review Required: Low OCR Confidence]
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Confidence
          </p>
          <p
            className={cn(
              "text-sm font-semibold",
              medication.confidenceScore < 0.7 ? "text-amber-300" : "text-emerald-400",
            )}
          >
            {(medication.confidenceScore * 100).toFixed(0)}%
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Brand Name
          <input
            value={medication.brandName}
            onChange={(e) => update("brandName", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/40 focus:ring-2"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Active Molecule
          <input
            value={medication.activeIngredient}
            onChange={(e) => update("activeIngredient", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/40 focus:ring-2"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Dosage
          <input
            value={medication.dosage}
            onChange={(e) => update("dosage", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/40 focus:ring-2"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Frequency
          <input
            value={medication.frequency}
            onChange={(e) => update("frequency", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/40 focus:ring-2"
          />
        </label>
      </div>
    </article>
  );
}
