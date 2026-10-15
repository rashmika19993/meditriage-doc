import { afterEach, describe, expect, it, vi } from "vitest";

import { runTriageExtract, runTriageReevaluate } from "./triageClient";
import type { ExtractedMedication } from "./types";

const sampleMed: ExtractedMedication = {
  id: "med-1",
  brandName: "Warfarin",
  activeIngredient: "Warfarin",
  dosage: "5mg",
  frequency: "OD",
  confidenceScore: 0.9,
  isFlaggedForReview: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("runTriageExtract", () => {
  it("returns coerced online result on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          extractedMedications: [sampleMed],
          interactionAlerts: [],
          requiresHumanReview: false,
          clinicalBriefing: "• Clear",
        }),
      ),
    );

    const { result, usedOfflineFallback } = await runTriageExtract({
      imageBase64: "abc",
      mimeType: "image/png",
    });

    expect(usedOfflineFallback).toBe(false);
    expect(result.extractedMedications).toHaveLength(1);
    expect(result.clinicalBriefing).toBe("• Clear");
  });

  it("falls back offline on 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "down" }, 503)),
    );

    const { result, usedOfflineFallback } = await runTriageExtract({
      imageBase64: "abc",
      mimeType: "image/png",
    });

    expect(usedOfflineFallback).toBe(true);
    expect(result.extractedMedications).toEqual([]);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.clinicalBriefing).toMatch(/offline matrix/i);
  });

  it("surfaces non-outage API errors as offline empty extract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Image exceeds 10MB limit." }, 413)),
    );

    const { usedOfflineFallback, result } = await runTriageExtract({
      imageBase64: "abc",
      mimeType: "image/png",
    });

    // Client currently treats any thrown path as offline fallback
    expect(usedOfflineFallback).toBe(true);
    expect(result.extractedMedications).toEqual([]);
  });
});

describe("runTriageReevaluate", () => {
  it("preserves clinician medications on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          extractedMedications: [],
          interactionAlerts: [
            {
              id: "a1",
              severity: "HIGH",
              drugsInvolved: ["Warfarin", "Aspirin"],
              clinicalRisk: "Bleed",
              recommendedAction: "Avoid",
            },
          ],
          requiresHumanReview: false,
          clinicalBriefing: "• Check INR",
        }),
      ),
    );

    const meds = [
      sampleMed,
      {
        ...sampleMed,
        id: "med-2",
        brandName: "Aspirin",
        activeIngredient: "Aspirin",
      },
    ];

    const { result, usedOfflineFallback } = await runTriageReevaluate(meds);

    expect(usedOfflineFallback).toBe(false);
    expect(result.extractedMedications).toEqual(meds);
    expect(result.interactionAlerts).toHaveLength(1);
  });

  it("screens with offline matrix when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const meds = [
      sampleMed,
      {
        ...sampleMed,
        id: "med-2",
        brandName: "Aspirin",
        activeIngredient: "Aspirin",
      },
    ];

    const { result, usedOfflineFallback } = await runTriageReevaluate(meds);

    expect(usedOfflineFallback).toBe(true);
    expect(result.extractedMedications).toEqual(meds);
    expect(result.interactionAlerts.length).toBeGreaterThan(0);
  });
});
