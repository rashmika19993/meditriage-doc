import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
  Type: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
  },
}));

describe("POST /api/triage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  async function post(body: unknown) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/triage", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid JSON body",
    });
  });

  it("returns 400 when neither image nor medications provided", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Provide imageBase64 or medications for screening.",
    });
  });

  it("returns 413 when image exceeds 10MB", async () => {
    // ~10.1MB decoded payload: base64 length ≈ ceil(bytes * 4 / 3)
    const oversized = "A".repeat(Math.ceil((10.1 * 1024 * 1024 * 4) / 3));
    const response = await post({
      imageBase64: oversized,
      mimeType: "image/png",
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: "Image exceeds 10MB limit.",
    });
  });

  it("returns 503 when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post({
      medications: [
        {
          id: "1",
          brandName: "Warfarin",
          activeIngredient: "Warfarin",
          dosage: "5mg",
          frequency: "OD",
          confidenceScore: 0.9,
          isFlaggedForReview: false,
        },
      ],
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Upstream AI service unavailable",
    });
  });
});
