import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ExtractedMedication } from "@/lib/types";

import { MedicationCard } from "./MedicationCard";

const baseMed: ExtractedMedication = {
  id: "med-1",
  brandName: "Coumadin",
  activeIngredient: "Warfarin",
  dosage: "5mg",
  frequency: "OD",
  confidenceScore: 0.92,
  isFlaggedForReview: false,
};

describe("MedicationCard", () => {
  it("renders confidence and fields", () => {
    render(
      <MedicationCard
        medication={baseMed}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Coumadin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Warfarin")).toBeInTheDocument();
    expect(
      screen.queryByText(/Human Review Required/i),
    ).not.toBeInTheDocument();
  });

  it("shows review badge for low confidence", () => {
    render(
      <MedicationCard
        medication={{ ...baseMed, confidenceScore: 0.55 }}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Human Review Required: Low OCR Confidence/i),
    ).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("calls onChange when brand is edited", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Harness() {
      const [medication, setMedication] = useState(baseMed);
      return (
        <MedicationCard
          medication={medication}
          onChange={(next) => {
            onChange(next);
            setMedication(next);
          }}
          onDelete={vi.fn()}
        />
      );
    }

    render(<Harness />);

    const brand = screen.getByDisplayValue("Coumadin");
    await user.clear(brand);
    await user.type(brand, "Marevan");

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0] as ExtractedMedication;
    expect(last.brandName).toBe("Marevan");
  });

  it("calls onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <MedicationCard
        medication={baseMed}
        onChange={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
