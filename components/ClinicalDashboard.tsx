"use client";

import { useCallback, useState } from "react";
import { Activity, Loader2, Plus, Stethoscope } from "lucide-react";

import { FallbackBanner } from "@/components/FallbackBanner";
import { ImageUploader } from "@/components/ImageUploader";
import { MedicationCard } from "@/components/MedicationCard";
import { TriageSummary } from "@/components/TriageSummary";
import { emptyMedication } from "@/lib/screenOffline";
import { runTriageExtract, runTriageReevaluate } from "@/lib/triageClient";
import type { ExtractedMedication, TriageResult } from "@/lib/types";

interface ImageState {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

const emptyResult: TriageResult = {
  extractedMedications: [],
  interactionAlerts: [],
  requiresHumanReview: false,
  clinicalBriefing: "",
};

export function ClinicalDashboard() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [medications, setMedications] = useState<ExtractedMedication[]>([]);
  const [offline, setOffline] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResults = result !== null;

  const onImageReady = useCallback(
    (payload: { base64: string; mimeType: string; previewUrl: string }) => {
      setImage((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return payload;
      });
      setError(null);
    },
    [],
  );

  const onClearImage = useCallback(() => {
    setImage((prev) => {
      if (prev?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const handleExtract = async () => {
    if (!image) {
      setError("Upload a prescription image first.");
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const { result: triage, usedOfflineFallback } = await runTriageExtract({
        imageBase64: image.base64,
        mimeType: image.mimeType,
      });

      setOffline(usedOfflineFallback);
      setResult(triage);
      setMedications(triage.extractedMedications);

      if (usedOfflineFallback && triage.extractedMedications.length === 0) {
        setError(
          "AI unavailable. Offline matrix is active — add medications manually, then re-evaluate.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleReevaluate = async () => {
    if (medications.length === 0) {
      setError("Add at least one medication before re-evaluating.");
      return;
    }

    setReevaluating(true);
    setError(null);

    try {
      const { result: triage, usedOfflineFallback } =
        await runTriageReevaluate(medications);
      setOffline(usedOfflineFallback);
      setResult({
        ...triage,
        extractedMedications: medications,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-evaluation failed");
    } finally {
      setReevaluating(false);
    }
  };

  const updateMedication = (id: string, next: ExtractedMedication) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? next : m)));
  };

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const addMedication = () => {
    setMedications((prev) => [...prev, emptyMedication()]);
    if (!result) {
      setResult({ ...emptyResult, requiresHumanReview: true });
    }
  };

  const requiresHumanReview =
    (result?.requiresHumanReview ?? false) ||
    medications.some((m) => m.isFlaggedForReview || m.confidenceScore < 0.7);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-300">
            <Activity className="h-3.5 w-3.5" />
            Clinical workstation
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            MediTriage AI
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Intelligent prescription extraction and clinical contraindication
            screening for Dr. S.Chandrasena.
          </p>
        </div>
       
      </header>

      {(offline || requiresHumanReview) && hasResults && (
        <FallbackBanner
          offline={offline}
          requiresHumanReview={requiresHumanReview}
        />
      )}

      {error && (
        <div
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid flex-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-[#131C2E] p-5 shadow-xl shadow-black/20">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Prescription Intake
          </h2>
          <ImageUploader
            previewUrl={image?.previewUrl ?? null}
            onImageReady={onImageReady}
            onClear={onClearImage}
            disabled={extracting}
          />

          <button
            type="button"
            disabled={!image || extracting}
            onClick={() => void handleExtract()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting &amp; Screening…
              </>
            ) : (
              "Extract & Screen Prescription"
            )}
          </button>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-800 bg-[#131C2E] p-5 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Extraction &amp; Clinical Triage
          </h2>

          {!hasResults ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0B1220] px-6 text-center">
              <Stethoscope className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                Results appear here after extraction
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Upload a prescription image, then run Extract &amp; Screen.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Extracted Medications
                  </h3>
                  <span className="text-xs text-slate-500">
                    {medications.length} item
                    {medications.length === 1 ? "" : "s"}
                  </span>
                </div>

                {medications.length === 0 ? (
                  <p className="rounded-lg border border-slate-700 bg-[#0B1220] px-4 py-3 text-sm text-slate-400">
                    No medications yet. Add entries manually if OCR failed.
                  </p>
                ) : (
                  medications.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      onChange={(next) => updateMedication(med.id, next)}
                      onDelete={() => deleteMedication(med.id)}
                    />
                  ))
                )}

                <button
                  type="button"
                  onClick={addMedication}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-200"
                >
                  <Plus className="h-4 w-4" />
                  Add New Medication
                </button>
              </div>

              <TriageSummary
                clinicalBriefing={result.clinicalBriefing}
                interactionAlerts={result.interactionAlerts}
                onReevaluate={() => void handleReevaluate()}
                reevaluating={reevaluating}
                disabled={extracting}
              />
            </>
          )}
        </section>
      </div>

      <footer className="border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
        Not a medical device. Not for
        clinical decision-making or patient care.
      </footer>
    </div>
  );
}
