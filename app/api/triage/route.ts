import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

import { coerceTriageResult } from "@/lib/screenOffline";
import type { ExtractedMedication, TriageResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SYSTEM_INSTRUCTION = `You are Dr. S.Chandrasena's clinical triage copilot.
Your tasks:
1. Transcribe handwritten or printed prescription notes from the provided image when present.
2. Resolve commercial trade names to generic pharmacological molecules (e.g., "Augmentin" -> "Amoxicillin + Clavulanic Acid").
3. Extract line-item medications with brandName, activeIngredient, dosage, frequency (e.g., BD, TDS, PRN), and confidenceScore from 0.0 to 1.0.
4. Detect drug-drug contraindications among extracted (or provided) medications. Classify each as HIGH, MODERATE, or LOW with clinicalRisk and recommendedAction.
5. If handwriting is illegible or confidenceScore < 0.70, set isFlaggedForReview: true and requiresHumanReview: true.
6. Produce clinicalBriefing as 2-3 concise bullet lines (each starting with "• ") readable in under 30 seconds before consultation.
7. Return ONLY valid JSON matching the required schema. This is an academic clinical decision-support simulation, not a substitute for professional judgment.`;

const triageSchema = {
  type: Type.OBJECT,
  properties: {
    extractedMedications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          brandName: { type: Type.STRING },
          activeIngredient: { type: Type.STRING },
          dosage: { type: Type.STRING },
          frequency: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          isFlaggedForReview: { type: Type.BOOLEAN },
        },
        required: [
          "brandName",
          "activeIngredient",
          "dosage",
          "frequency",
          "confidenceScore",
          "isFlaggedForReview",
        ],
      },
    },
    interactionAlerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["HIGH", "MODERATE", "LOW"] },
          drugsInvolved: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          clinicalRisk: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
        },
        required: [
          "severity",
          "drugsInvolved",
          "clinicalRisk",
          "recommendedAction",
        ],
      },
    },
    requiresHumanReview: { type: Type.BOOLEAN },
    clinicalBriefing: { type: Type.STRING },
  },
  required: [
    "extractedMedications",
    "interactionAlerts",
    "requiresHumanReview",
    "clinicalBriefing",
  ],
};

interface TriageRequestBody {
  imageBase64?: string;
  mimeType?: string;
  medications?: ExtractedMedication[];
}

function estimateBase64Bytes(base64: string): number {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}

function stripDataUrl(base64: string): string {
  return base64.replace(/^data:[^;]+;base64,/, "");
}

async function callGemini(parts: Array<Record<string, unknown>>): Promise<TriageResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Explicit apiKey so Next.js always uses .env.local (never relies on ambient injection).
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: triageSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty model response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned non-JSON output");
  }

  return coerceTriageResult(parsed);
}

export async function POST(request: Request) {
  let body: TriageRequestBody;

  try {
    body = (await request.json()) as TriageRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasImage =
    typeof body.imageBase64 === "string" && body.imageBase64.trim().length > 0;
  const hasMedications =
    Array.isArray(body.medications) && body.medications.length > 0;

  if (!hasImage && !hasMedications) {
    return NextResponse.json(
      { error: "Provide imageBase64 or medications for screening." },
      { status: 400 },
    );
  }

  if (hasImage) {
    const raw = body.imageBase64 as string;
    const size = estimateBase64Bytes(raw);
    if (size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 10MB limit." },
        { status: 413 },
      );
    }

    const mimeType =
      body.mimeType && body.mimeType.startsWith("image/")
        ? body.mimeType
        : "image/jpeg";

    try {
      const result = await callGemini([
        {
          text: "Extract medications from this prescription image and screen drug-drug interactions.",
        },
        {
          inlineData: {
            mimeType,
            data: stripDataUrl(raw),
          },
        },
      ]);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Gemini triage (image) failed:", error);
      return NextResponse.json(
        {
          error: "Upstream AI service unavailable",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 503 },
      );
    }
  }

  // Re-evaluate path: medications only
  try {
    const meds = body.medications as ExtractedMedication[];
    const summary = meds
      .map(
        (m, i) =>
          `${i + 1}. Brand: ${m.brandName || "n/a"}; Active: ${m.activeIngredient || "n/a"}; Dose: ${m.dosage || "n/a"}; Freq: ${m.frequency || "n/a"}`,
      )
      .join("\n");

    const result = await callGemini([
      {
        text: `Re-screen the following clinician-edited medication list for drug-drug interactions. Keep the same medications (you may lightly normalize name casing) and return updated interactionAlerts and clinicalBriefing.\n\n${summary}`,
      },
    ]);

    // Preserve clinician edits as source of truth for medications
    const merged: TriageResult = {
      ...result,
      extractedMedications: meds.map((m) => ({
        ...m,
        isFlaggedForReview: m.isFlaggedForReview || m.confidenceScore < 0.7,
      })),
      requiresHumanReview:
        result.requiresHumanReview ||
        meds.some((m) => m.isFlaggedForReview || m.confidenceScore < 0.7),
    };

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Gemini triage (re-evaluate) failed:", error);
    return NextResponse.json(
      {
        error: "Upstream AI service unavailable",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
