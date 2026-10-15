import { describe, expect, it, vi } from "vitest";

import { cn, createId } from "./utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4", "text-sm")).toBe("px-4 text-sm");
  });

  it("ignores falsy values", () => {
    expect(cn("block", false && "hidden", null, undefined, "mt-2")).toBe(
      "block mt-2",
    );
  });
});

describe("createId", () => {
  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "fixed-uuid",
    });

    expect(createId("med")).toBe("med-fixed-uuid");
    vi.unstubAllGlobals();
  });

  it("falls back without randomUUID", () => {
    vi.stubGlobal("crypto", {});
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const id = createId("alert");
    expect(id).toMatch(/^alert-1700000000000-[a-z0-9]+$/);

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
