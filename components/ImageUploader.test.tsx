import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImageUploader } from "./ImageUploader";

describe("ImageUploader", () => {
  it("shows dropzone copy without preview", () => {
    render(
      <ImageUploader
        previewUrl={null}
        onImageReady={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText(/Drop prescription image here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select image/i })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /clear image/i }),
    ).not.toBeInTheDocument();
  });

  it("shows preview and clear when previewUrl is set", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <ImageUploader
        previewUrl="blob:preview"
        onImageReady={vi.fn()}
        onClear={onClear}
      />,
    );

    expect(screen.getByAltText("Prescription preview")).toHaveAttribute(
      "src",
      "blob:preview",
    );
    await user.click(screen.getByRole("button", { name: /clear image/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("disables actions when disabled", () => {
    render(
      <ImageUploader
        previewUrl="blob:preview"
        onImageReady={vi.fn()}
        onClear={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("button", { name: /select image/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear image/i })).toBeDisabled();
  });
});
