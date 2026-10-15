import offlineInteractions from "./offlineInteractions.json";
import type {
  ExtractedMedication,
  InteractionAlert,
  OfflineInteraction,
  TriageResult,
} from "./types";
import { createId } from "./utils";

const MATRIX = offlineInteractions as OfflineInteraction[];

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function medicationSearchText(med: ExtractedMedication): string {
  return normalizeToken(`${med.activeIngredient} ${med.brandName}`);
}

function matchesAlias(text: string, aliases: string[]): boolean {
  return aliases.some((alias) => {
    const needle = normalizeToken(alias);
    if (!needle) return false;
    if (text.includes(needle)) return true;
    // Word-boundary-ish match for short tokens like "asa"
    const parts = text.split(" ");
    return parts.includes(needle);
  });
}

function findMatchedLabel(
  meds: ExtractedMedication[],
  aliases: string[],
): string | null {
  for (const med of meds) {
    const text = medicationSearchText(med);
    if (matchesAlias(text, aliases)) {
      return med.activeIngredient || med.brandName || aliases[0];
    }
  }
  return null;
}

export function screenOffline(
  medications: ExtractedMedication[],
): Pick<
  TriageResult,
  "interactionAlerts" | "requiresHumanReview" | "clinicalBriefing"
> {
  const alerts: InteractionAlert[] = [];

  for (const rule of MATRIX) {
    const labelA = findMatchedLabel(medications, rule.drugA);
    const labelB = findMatchedLabel(medications, rule.drugB);
    if (!labelA || !labelB) continue;

    alerts.push({
      id: createId(rule.id),
      severity: rule.severity,
      drugsInvolved: [labelA, labelB],
      clinicalRisk: rule.clinicalRisk,
      recommendedAction: rule.recommendedAction,
    });
  }

  const severityRank: Record<InteractionAlert["severity"], number> = {
    HIGH: 0,
    MODERATE: 1,
    LOW: 2,
  };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const requiresHumanReview = medications.some(
    (m) => m.isFlaggedForReview || m.confidenceScore < 0.7,
  );

  const highCount = alerts.filter((a) => a.severity === "HIGH").length;
  const moderateCount = alerts.filter((a) => a.severity === "MODERATE").length;

  const bullets: string[] = [];
  if (highCount > 0) {
    bullets.push(
      `${highCount} HIGH-severity interaction${highCount === 1 ? "" : "s"} detected — review before prescribing.`,
    );
  }
  if (moderateCount > 0) {
    bullets.push(
      `${moderateCount} MODERATE interaction${moderateCount === 1 ? "" : "s"} may need dose adjustment or monitoring.`,
    );
  }
  if (alerts.length === 0) {
    bullets.push(
      "No matches in the embedded critical interaction matrix for the listed agents.",
    );
  }
  if (requiresHumanReview) {
    bullets.push(
      "One or more medications need human OCR review before finalizing the chart.",
    );
  } else if (alerts.length > 0) {
    bullets.push(
      "Confirm patient comorbidities and current labs before acting on automated flags.",
    );
  }

  return {
    interactionAlerts: alerts,
    requiresHumanReview,
    clinicalBriefing: bullets.map((b) => `• ${b}`).join("\n"),
  };
}

export function emptyMedication(): ExtractedMedication {
  return {
    id: createId("med"),
    brandName: "",
    activeIngredient: "",
    dosage: "",
    frequency: "",
    confidenceScore: 1,
    isFlaggedForReview: false,
  };
}

export function coerceTriageResult(raw: unknown): TriageResult {
  const data = (raw ?? {}) as Partial<TriageResult>;
  const extractedMedications = Array.isArray(data.extractedMedications)
    ? data.extractedMedications.map((med, index) => {
        const m = med as Partial<ExtractedMedication>;
        const confidence =
          typeof m.confidenceScore === "number" && Number.isFinite(m.confidenceScore)
            ? Math.min(1, Math.max(0, m.confidenceScore))
            : 0.5;
        const isFlaggedForReview =
          Boolean(m.isFlaggedForReview) || confidence < 0.7;
        return {
          id: typeof m.id === "string" && m.id ? m.id : createId(`med-${index}`),
          brandName: String(m.brandName ?? ""),
          activeIngredient: String(m.activeIngredient ?? ""),
          dosage: String(m.dosage ?? ""),
          frequency: String(m.frequency ?? ""),
          confidenceScore: confidence,
          isFlaggedForReview,
        } satisfies ExtractedMedication;
      })
    : [];

  const interactionAlerts = Array.isArray(data.interactionAlerts)
    ? data.interactionAlerts.map((alert, index) => {
        const a = alert as Partial<InteractionAlert>;
        const severity =
          a.severity === "HIGH" || a.severity === "MODERATE" || a.severity === "LOW"
            ? a.severity
            : "MODERATE";
        return {
          id: typeof a.id === "string" && a.id ? a.id : createId(`alert-${index}`),
          severity,
          drugsInvolved: Array.isArray(a.drugsInvolved)
            ? a.drugsInvolved.map(String)
            : [],
          clinicalRisk: String(a.clinicalRisk ?? "Interaction flagged for review."),
          recommendedAction: String(
            a.recommendedAction ?? "Review combination clinically before prescribing.",
          ),
        } satisfies InteractionAlert;
      })
    : [];

  const requiresHumanReview =
    Boolean(data.requiresHumanReview) ||
    extractedMedications.some(
      (m) => m.isFlaggedForReview || m.confidenceScore < 0.7,
    );

  return {
    extractedMedications,
    interactionAlerts,
    requiresHumanReview,
    clinicalBriefing: String(
      data.clinicalBriefing ??
        "• Review extracted medications and interaction alerts before consultation.",
    ),
  };
}
