export interface ExtractedMedication {
  id: string;
  brandName: string;
  activeIngredient: string;
  dosage: string;
  frequency: string;
  confidenceScore: number; // 0.0 - 1.0
  isFlaggedForReview: boolean;
}

export interface InteractionAlert {
  id: string;
  severity: "HIGH" | "MODERATE" | "LOW";
  drugsInvolved: string[];
  clinicalRisk: string;
  recommendedAction: string;
}

export interface TriageResult {
  extractedMedications: ExtractedMedication[];
  interactionAlerts: InteractionAlert[];
  requiresHumanReview: boolean;
  clinicalBriefing: string;
}

export interface OfflineInteraction {
  id: string;
  drugA: string[];
  drugB: string[];
  severity: "HIGH" | "MODERATE" | "LOW";
  clinicalRisk: string;
  recommendedAction: string;
}
