You are an expert Full-Stack TypeScript Engineer and Clinical Informatics Architect. Your task is to build a complete, production-ready web application for an academic assignment (IT6070 – Emerging Technologies) using Next.js App Router, Tailwind CSS, Lucide React, and the official Google Gen AI SDK (`@google/genai`).

================================================================================
1. APPLICATION IDENTITY & REAL-WORLD CONTEXT
================================================================================
- Application Name: MediTriage AI (Intelligent Prescription Extraction & Clinical Triage System)
- Target Professional: Dr. S.Chandrasena, Outpatient General Practitioner (GP) & Clinic Director in an ambulatory private clinic.
- Clinical Problem: Dr. Chandrasena consults 35–45 patients per session (strictly 8–10 minutes per patient). Patients present crumpled handwritten prescription slips and laboratory printouts. Manually transcribing cursive medications and cross-referencing contraindications causes severe cognitive fatigue and risks fatal adverse drug interactions (ADIs).
- Architectural Rule: STRICTLY ZERO STANDALONE BACKEND (No Python, No Express, No FastAPI, No external microservices). All server execution runs through Next.js Serverless Route Handlers (`app/api/triage/route.ts`).
- Scope Boundary: Phase 1 focus is strictly Vision Multimodal OCR Extraction + Drug-Drug Interaction Screening. (Voice dictation is explicitly deferred to Phase 2 future scope).

================================================================================
2. THE TWO CONNECTED CORE FEATURES (REQUIRED BY BRIEF)
================================================================================
Feature 1: Multimodal Prescription Ingestion & Active Ingredient Normalization
- Accepts visual uploads (PNG, JPEG, WebP) via drag-and-drop or file selector, or one-click preset test samples.
- Extracts line-item medications, trade brand names, normalized generic active ingredients, dosage strengths, administration frequencies (e.g., BD, TDS, PRN), and extraction confidence scores (0.0 to 1.0).

Feature 2: Clinical Contraindication Screener & Pre-Consultation Triage Briefing
- Cross-references all extracted active ingredients against each other and against dangerous pharmacological combinations.
- Assigns color-coded risk severity:
  * HIGH (Red) - Lethal contraindication or acute toxicity risk (e.g., Warfarin + NSAID / Aspirin bleeding risk).
  * MODERATE (Amber) - Requires clinical dose adjustment or monitoring (e.g., Metformin + ACE inhibitors / Ciprofloxacin).
  * LOW (Green) - Minor interaction / safe combination.
- Synthesizes a concise, bulleted pre-consultation summary card designed to be read in under 30 seconds before patient consultation begins.

================================================================================
3. MANDATORY ERROR HANDLING & FALLBACK PROTOCOLS
================================================================================
1. Human-in-the-Loop Fallback (Confidence < 0.70 or Ambiguous Handwriting):
   - If any extracted medication has `confidenceScore < 0.70` or `isFlaggedForReview: true`, flag the card with a visible amber badge: `[⚠️ Human Review Required: Low OCR Confidence]`.
   - All medication cards MUST feature controlled, editable inline inputs (Brand Name, Active Molecule, Dosage, Frequency) so Dr. Chandrasena can manually correct handwriting ambiguities.
   - Provide a "Re-evaluate Interactions" button that recalculates interaction alerts dynamically after manual edits.
2. Offline / API Outage Fallback:
   - If the external API fails (network drop, timeout, or rate-limit error), display an offline alert banner and automatically trigger a client-side evaluation using an embedded static JSON matrix (`lib/offlineInteractions.json`) of top 20 critical drug interactions.

================================================================================
4. TECH STACK & INSTALLATION COMMANDS
================================================================================
Install required dependencies:
```bash
npm install @google/genai lucide-react clsx tailwind-merge
```
* Note: Use the official standard `@google/genai` SDK. Do NOT use deprecated `@google/generative-ai`.

================================================================================
5. REQUIRED FILE STRUCTURE
================================================================================
```text
├── app/
│   ├── api/
│   │   └── triage/
│   │       └── route.ts          # Serverless Route Handler using @google/genai
│   ├── globals.css               # Clinical dark slate styling
│   ├── layout.tsx                # App root layout with metadata
│   └── page.tsx                  # Main clinical dashboard workstation
├── components/
│   ├── ImageUploader.tsx         # Drag & drop upload zone with quick sample presets
│   ├── MedicationCard.tsx        # Editable prescription item card with confidence badge
│   ├── TriageSummary.tsx         # Drug interaction alerts + pre-consultation briefing
│   └── FallbackBanner.tsx        # Offline / review alert notification banner
├── lib/
│   ├── offlineInteractions.json  # Top 20 lethal contraindication fallback matrix
│   └── types.ts                  # Shared TypeScript interfaces
├── .env.local.example            # GEMINI_API_KEY=
└── README.md                     # Setup instructions & test sample guide
```

================================================================================
6. DETAILED FILE SPECIFICATIONS
================================================================================

### A. `lib/types.ts`
```typescript
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
  severity: 'HIGH' | 'MODERATE' | 'LOW';
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
```

### B. `lib/offlineInteractions.json`
Populate with at least 6 common high-risk pairs:
1. Warfarin + Aspirin (High Bleeding Risk)
2. Warfarin + Ibuprofen (Severe GI Bleeding Risk)
3. Ciprofloxacin + Theophylline (Theophylline Toxicity)
4. Metformin + Contrast Media / NSAIDs (Lactic Acidosis / Renal Impairment)
5. ACE Inhibitors (e.g., Lisinopril) + Potassium Supplements (Severe Hyperkalemia)
6. Clopidogrel + Omeprazole (Reduced Antiplatelet Efficacy)

### C. `app/api/triage/route.ts`
- Use `@google/genai` to initialize: `const ai = new GoogleGenAI({});`
- Target Model: `'gemini-3.1-flash-lite'`
- Accept `POST` request with JSON: `{ imageBase64: string, mimeType: string }`.
- Validate payload size (< 10MB) and presence of image data.
- Construct multimodal part using `inlineData`.
- Use structured JSON output enforcement (`responseMimeType: 'application/json'` and `responseSchema` or strictly typed system instruction) matching `TriageResult`.
- System instruction to model:
  1. Act as Dr. S.Chandrasena's clinical triage copilot.
  2. Transcribe handwritten prescription notes and resolve commercial trade names to generic pharmacological molecules (e.g., "Augmentin" -> "Amoxicillin + Clavulanic Acid").
  3. Detect all drug-drug contraindications and classify severity into HIGH, MODERATE, or LOW with actionable recommendations.
  4. If handwriting is illegible or confidence < 0.70, set `isFlaggedForReview: true` and `requiresHumanReview: true`.

### D. `components/ImageUploader.tsx`
- Dropzone supporting drag & drop, file selection, and image preview.
- Include 2 quick-load preset sample buttons for immediate demonstration during video recording:
  * Sample 1 (High Risk): "Warfarin 5mg daily + Aspirin 100mg daily + Ibuprofen 400mg PRN"
  * Sample 2 (Moderate Risk): "Metformin 500mg BD + Ciprofloxacin 500mg BD"
- Provide clear preview thumbnail and "Clear Image" button.

### E. `components/MedicationCard.tsx`
- Renders extracted medication in a clean card.
- If `isFlaggedForReview` is true or `confidenceScore < 0.70`, render an alert banner: `[⚠️ Human Review Required: Low OCR Confidence]`.
- Provide controlled input fields for `brandName`, `activeIngredient`, `dosage`, and `frequency` so the doctor can make immediate manual inline edits.
- Include a "Delete Medication" button and an "Add New Medication" button at the list bottom.

### F. `components/TriageSummary.tsx`
- Render Pre-Consultation Briefing Box summarizing patient triage status in 2-3 concise bullets.
- Render color-coded Interaction Alert cards:
  * Red outline / red background tint for HIGH severity.
  * Amber outline / amber background tint for MODERATE severity.
  * Emerald outline / emerald background tint for LOW severity.
- Include "Export Clinical Briefing" button (copies summary text to clipboard for doctor's electronic records).
- Include "Re-evaluate Interactions" button to trigger re-screening if the clinician edited any drug name or dosage.

### G. `app/page.tsx` & `globals.css` (UI Design & Layout)
- Aesthetic: Modern, high-density clinical dashboard.
- Dark theme palette: Deep slate background (`#090D16`), card surface (`#131C2E`), clean borders (`#1E293B`), text primary (`#F8FAFC`), text secondary (`#94A3B8`).
- Accent colors: Electric cyan (`#06B6D4`) for primary actions, crimson (`#EF4444`) for High alerts, amber (`#F59E0B`) for review warnings, emerald (`#10B981`) for safe items.
- Layout: 2-column responsive layout:
  * Left Column: Prescription Intake (Image Upload Dropzone + Sample Presets + "Extract & Screen Prescription" Action Button with loading spinner).
  * Right Column: Extraction & Clinical Triage Results (Extracted editable medication cards + Interaction alert badges + Pre-consultation summary card).

================================================================================
7. IMPLEMENTATION RULES
================================================================================
- Strictly TypeScript. No `any` types where interfaces can be defined.
- Complete, non-truncated code for all files. Do not use placeholders like `// TODO: add code here`.
- Ensure zero hydration errors and clean client/server component boundaries (`"use client"` where state or browser APIs are used).
