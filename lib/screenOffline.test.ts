import { describe, expect, it } from "vitest";

import {
  coerceTriageResult,
  emptyMedication,
  screenOffline,
} from "./screenOffline";
import type { ExtractedMedication } from "./types";

function med(
  partial: Partial<ExtractedMedication> &
    Pick<ExtractedMedication, "activeIngredient" | "brandName">,
): ExtractedMedication {
  return {
    id: partial.id ?? "med-1",
    dosage: partial.dosage ?? "10mg",
    frequency: partial.frequency ?? "OD",
    confidenceScore: partial.confidenceScore ?? 0.95,
    isFlaggedForReview: partial.isFlaggedForReview ?? false,
    ...partial,
  };
}

describe("screenOffline", () => {
  it("detects HIGH warfarin + aspirin via aliases", () => {
    const result = screenOffline([
      med({ id: "1", brandName: "Coumadin", activeIngredient: "Warfarin" }),
      med({ id: "2", brandName: "Ecosprin", activeIngredient: "Aspirin" }),
    ]);

    expect(result.interactionAlerts.length).toBeGreaterThan(0);
    const warfarinAspirin = result.interactionAlerts.find((a) =>
      a.drugsInvolved.some((d) => /warfarin/i.test(d)),
    );
    expect(warfarinAspirin?.severity).toBe("HIGH");
    expect(result.clinicalBriefing).toMatch(/HIGH-severity/i);
  });

  it("returns no-matrix message when nothing matches", () => {
    const result = screenOffline([
      med({ brandName: "Paracetamol", activeIngredient: "Acetaminophen" }),
    ]);

    expect(result.interactionAlerts).toEqual([]);
    expect(result.clinicalBriefing).toMatch(/No matches in the embedded/);
  });

  it("flags human review for low confidence", () => {
    const result = screenOffline([
      med({
        brandName: "Unknown",
        activeIngredient: "Mystery",
        confidenceScore: 0.4,
      }),
    ]);

    expect(result.requiresHumanReview).toBe(true);
    expect(result.clinicalBriefing).toMatch(/human OCR review/i);
  });

  it("sorts alerts HIGH before MODERATE", () => {
    const result = screenOffline([
      med({ brandName: "Warfarin", activeIngredient: "Warfarin" }),
      med({ brandName: "Aspirin", activeIngredient: "Aspirin" }),
      med({ brandName: "Metformin", activeIngredient: "Metformin" }),
      med({ brandName: "Ibuprofen", activeIngredient: "Ibuprofen" }),
    ]);

    const severities = result.interactionAlerts.map((a) => a.severity);
    const firstModerate = severities.indexOf("MODERATE");
    const lastHigh = severities.lastIndexOf("HIGH");
    if (firstModerate !== -1 && lastHigh !== -1) {
      expect(lastHigh).toBeLessThan(firstModerate);
    }
  });
});

describe("emptyMedication", () => {
  it("returns a blank line item ready for edit", () => {
    const blank = emptyMedication();
    expect(blank.brandName).toBe("");
    expect(blank.activeIngredient).toBe("");
    expect(blank.confidenceScore).toBe(1);
    expect(blank.isFlaggedForReview).toBe(false);
    expect(blank.id).toMatch(/^med-/);
  });
});

describe("coerceTriageResult", () => {
  it("fills defaults for empty/invalid payloads", () => {
    const result = coerceTriageResult(null);
    expect(result.extractedMedications).toEqual([]);
    expect(result.interactionAlerts).toEqual([]);
    expect(result.requiresHumanReview).toBe(false);
    expect(result.clinicalBriefing).toMatch(/Review extracted medications/);
  });

  it("clamps confidence and auto-flags below 0.7", () => {
    const result = coerceTriageResult({
      extractedMedications: [
        {
          brandName: "X",
          activeIngredient: "Y",
          dosage: "5mg",
          frequency: "BD",
          confidenceScore: 1.5,
          isFlaggedForReview: false,
        },
        {
          brandName: "A",
          activeIngredient: "B",
          dosage: "1mg",
          frequency: "OD",
          confidenceScore: 0.4,
          isFlaggedForReview: false,
        },
      ],
    });

    expect(result.extractedMedications[0].confidenceScore).toBe(1);
    expect(result.extractedMedications[0].isFlaggedForReview).toBe(false);
    expect(result.extractedMedications[1].isFlaggedForReview).toBe(true);
    expect(result.requiresHumanReview).toBe(true);
  });

  it("normalizes invalid alert severity to MODERATE", () => {
    const result = coerceTriageResult({
      interactionAlerts: [
        {
          severity: "CRITICAL",
          drugsInvolved: ["A", "B"],
          clinicalRisk: "Risk",
          recommendedAction: "Act",
        },
      ],
    });

    expect(result.interactionAlerts[0].severity).toBe("MODERATE");
  });
});
