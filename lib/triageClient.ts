import type { ExtractedMedication, TriageResult } from "./types";
import { coerceTriageResult, screenOffline } from "./screenOffline";

export type TriageMode = "extract" | "reevaluate";

export interface TriageClientResult {
  result: TriageResult;
  usedOfflineFallback: boolean;
}

async function postTriage(payload: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    return await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function offlineFromMedications(
  medications: ExtractedMedication[],
): TriageClientResult {
  const screened = screenOffline(medications);
  return {
    usedOfflineFallback: true,
    result: {
      extractedMedications: medications,
      ...screened,
    },
  };
}

export async function runTriageExtract(params: {
  imageBase64: string;
  mimeType: string;
}): Promise<TriageClientResult> {
  try {
    const response = await postTriage({
      imageBase64: params.imageBase64,
      mimeType: params.mimeType,
    });

    if (response.status === 503 || response.status === 429) {
      throw new Error("Service unavailable");
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        typeof err.error === "string" ? err.error : `Request failed (${response.status})`,
      );
    }

    const json: unknown = await response.json();
    return {
      usedOfflineFallback: false,
      result: coerceTriageResult(json),
    };
  } catch {
    return {
      usedOfflineFallback: true,
      result: {
        extractedMedications: [],
        interactionAlerts: [],
        requiresHumanReview: true,
        clinicalBriefing:
          "• AI service unavailable — offline matrix engaged.\n• No medications could be OCR-extracted without the model; add them manually and re-evaluate.\n• Confirm all handwriting transcriptions before prescribing.",
      },
    };
  }
}

export async function runTriageReevaluate(
  medications: ExtractedMedication[],
): Promise<TriageClientResult> {
  try {
    const response = await postTriage({ medications });

    if (response.status === 503 || response.status === 429) {
      throw new Error("Service unavailable");
    }

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const json: unknown = await response.json();
    const coerced = coerceTriageResult(json);
    return {
      usedOfflineFallback: false,
      result: {
        ...coerced,
        extractedMedications: medications.map((m) => ({
          ...m,
          isFlaggedForReview: m.isFlaggedForReview || m.confidenceScore < 0.7,
        })),
        requiresHumanReview:
          coerced.requiresHumanReview ||
          medications.some((m) => m.isFlaggedForReview || m.confidenceScore < 0.7),
      },
    };
  } catch {
    return offlineFromMedications(medications);
  }
}
