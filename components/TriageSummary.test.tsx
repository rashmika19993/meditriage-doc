import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { InteractionAlert } from "@/lib/types";

import { TriageSummary } from "./TriageSummary";

const alerts: InteractionAlert[] = [
  {
    id: "a1",
    severity: "HIGH",
    drugsInvolved: ["Warfarin", "Aspirin"],
    clinicalRisk: "Bleeding risk",
    recommendedAction: "Avoid combination",
  },
];

describe("TriageSummary", () => {
  it("renders briefing bullets and alerts", () => {
    render(
      <TriageSummary
        clinicalBriefing={"• First point\n• Second point"}
        interactionAlerts={alerts}
        onReevaluate={vi.fn()}
        reevaluating={false}
      />,
    );

    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("Second point")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText(/Bleeding risk/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /check with your doctor.*ai-generated.*could be wrong/i,
    );
  });

  it("invokes re-evaluate", async () => {
    const user = userEvent.setup();
    const onReevaluate = vi.fn();

    render(
      <TriageSummary
        clinicalBriefing="• Ok"
        interactionAlerts={[]}
        onReevaluate={onReevaluate}
        reevaluating={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /re-evaluate interactions/i }),
    );
    expect(onReevaluate).toHaveBeenCalledTimes(1);
  });

  it("copies clinical briefing to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <TriageSummary
        clinicalBriefing="• Export me"
        interactionAlerts={[]}
        onReevaluate={vi.fn()}
        reevaluating={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^Export Clinical Briefing$/i }),
    );
    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = writeText.mock.calls[0][0] as string;
    expect(payload).toContain("MediTriage AI — Clinical Briefing");
    expect(payload).toContain("• Export me");
    expect(payload).toContain("Academic simulation only");
  });
});
