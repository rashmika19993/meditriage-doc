# MediTriage AI

Intelligent prescription extraction and clinical triage for **IT6070 – Emerging Technologies**.

Academic simulation for Dr. S.Chandrasena, an outpatient GP who reviews handwritten slips in short consultations. The app reads a prescription image, normalizes trade names to active ingredients, and screens drug–drug interactions before the visit.

**Not a medical device. Not for clinical use.**

## What it does

1. **Prescription intake.** Drag and drop or select a PNG, JPEG, or WebP prescription slip.
2. **Multimodal extraction.** `POST /api/triage` sends the image to Gemini 3.1 Flash Lite and returns structured medications: brand, active ingredient, dose, frequency, and a confidence score from 0 to 1.
3. **Interaction screening.** The same route classifies pairs as HIGH, MODERATE, or LOW and writes a 2–3 bullet pre-consultation briefing.
4. **Human review.** Cards with confidence under 0.70, or flagged handwriting, show an amber review badge. Brand, molecule, dosage, and frequency stay editable. Add or delete line items, then **Re-evaluate Interactions** to rescreen without a new image.
5. **Offline fallback.** If the key is missing, the request times out (45s), or Gemini returns 503 or 429, the client screens against `lib/offlineInteractions.json` (21 critical pairs with aliases) and shows an offline banner.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- Official Google Gen AI SDK (`@google/genai`), model `gemini-3.1-flash-lite`
- No standalone backend — server logic lives in `app/api/triage/route.ts`

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Add a Gemini API key to `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

The route initializes `new GoogleGenAI({})`, which reads `GEMINI_API_KEY` from the environment. Leave it empty to demo the offline matrix only.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |

## Demo (video recording)

1. Upload a prescription image (PNG, JPEG, or WebP).
2. Click **Extract & Screen Prescription**.
3. Confirm medication cards, interaction alerts, and the pre-consultation briefing.
4. Edit a medication name inline and click **Re-evaluate Interactions**.
5. Use **Export Clinical Briefing** to copy the summary to the clipboard.

### Offline / API outage

Without `GEMINI_API_KEY`, or when Gemini fails, the UI shows an offline banner. OCR cannot invent line items without the model — add medications manually and re-evaluate against the embedded matrix.

## Unit testing

Vitest + Testing Library. Run with `npm test` (or `npm run test:watch`).

| Area | File(s) | Covered |
| --- | --- | --- |
| Utils | `lib/utils.test.ts` | `cn` class merging; `createId` (UUID and fallback) |
| Offline screening | `lib/screenOffline.test.ts` | Alias matching (e.g. warfarin + aspirin); empty matrix message; low-confidence human review; HIGH-before-MODERATE sort; `emptyMedication`; `coerceTriageResult` defaults, confidence clamp, severity normalize |
| Triage client | `lib/triageClient.test.ts` | Online extract success; offline fallback on 503 / non-OK; re-evaluate preserves meds; offline matrix when fetch fails |
| API route | `app/api/triage/route.test.ts` | Invalid JSON → 400; missing image/meds → 400; image over 10MB → 413; missing `GEMINI_API_KEY` → 503 |
| Fallback banner | `components/FallbackBanner.test.tsx` | Hidden when idle; offline banner; human-review banner; both together |
| Medication card | `components/MedicationCard.test.tsx` | Confidence display; review badge under 0.70; edit brand via `onChange`; delete |
| Image uploader | `components/ImageUploader.test.tsx` | Dropzone copy; preview + clear; disabled controls |
| Triage summary | `components/TriageSummary.test.tsx` | Briefing bullets and alerts; re-evaluate click; clipboard export payload |

Not covered by unit tests (use manual cases): full dashboard flow, live Gemini OCR, drag-and-drop file acceptance.

## Manual testing

Step-by-step cases (upload, clear, file rejection, human-review badge, edit/re-evaluate, add/delete, export, offline) live in [`manual_testcases.txt`](manual_testcases.txt).

Prerequisites match the file header: `npm run dev` at [http://localhost:3000](http://localhost:3000); set `GEMINI_API_KEY` for online OCR tests; empty or remove the key (and restart) for offline tests.

## API

`POST /api/triage` accepts one of two JSON bodies:

```json
{ "imageBase64": "<raw or data-url base64>", "mimeType": "image/png" }
```

```json
{ "medications": [/* ExtractedMedication[] */] }
```

Images over 10MB return `413`. A missing image and empty medication list return `400`. Gemini failures return `503` so the client can fall back. Validation errors are not treated as an outage.

Successful responses match `TriageResult` in `lib/types.ts`: medications, interaction alerts, `requiresHumanReview`, and `clinicalBriefing`.

## Project structure

```text
app/
  layout.tsx                 # Metadata and dark clinical shell
  page.tsx                   # Server page that mounts the dashboard
  globals.css
  api/triage/route.ts        # Gemini OCR + interaction screening
components/
  ClinicalDashboard.tsx      # Intake / results state
  ImageUploader.tsx          # Dropzone and file picker
  MedicationCard.tsx         # Editable line items and review badge
  TriageSummary.tsx          # Alerts, briefing, export, re-evaluate
  FallbackBanner.tsx         # Offline and human-review banners
lib/
  types.ts                   # Shared interfaces
  triageClient.ts            # Fetch, timeout, and offline switch
  screenOffline.ts           # Client matrix matching and result coercion
  offlineInteractions.json   # Critical interaction pairs
  utils.ts
manual_testcases.txt         # Manual QA checklist
*.test.ts / *.test.tsx       # Vitest unit tests (lib, API, components)
vitest.config.ts
.env.local.example
```

## Disclaimer

This project is an educational prototype for multimodal OCR and contraindication-screening UX. Always rely on licensed clinicians and validated clinical references for patient care.
"# meditriage-doc" 
