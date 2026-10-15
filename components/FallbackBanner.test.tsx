import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FallbackBanner } from "./FallbackBanner";

describe("FallbackBanner", () => {
  it("renders nothing when both flags are false", () => {
    const { container } = render(
      <FallbackBanner offline={false} requiresHumanReview={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows offline banner", () => {
    render(<FallbackBanner offline requiresHumanReview={false} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/Offline \/ API outage fallback active/i),
    ).toBeInTheDocument();
  });

  it("shows human review banner", () => {
    render(<FallbackBanner offline={false} requiresHumanReview />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText(/Human Review Required: Low OCR Confidence/i),
    ).toBeInTheDocument();
  });

  it("shows both banners when both flags are true", () => {
    render(<FallbackBanner offline requiresHumanReview />);
    expect(
      screen.getByText(/Offline \/ API outage fallback active/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Human Review Required: Low OCR Confidence/i),
    ).toBeInTheDocument();
  });
});
