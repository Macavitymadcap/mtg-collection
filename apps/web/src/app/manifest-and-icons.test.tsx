import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppIcon } from "@/lib/app-icon";
import { generateImageMetadata } from "./icon";
import manifest from "./manifest";

describe("home-screen install", () => {
  it("has a manifest whose icons the icon route generates", () => {
    const app = manifest();
    expect(app).toMatchObject({ name: "MTG Collection", display: "standalone", start_url: "/" });

    const generated = generateImageMetadata().map((icon) => `/icon/${icon.id}`);
    for (const icon of app.icons ?? []) expect(generated).toContain(icon.src);
    expect(app.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("draws a card with the five colours", () => {
    const { container } = render(<AppIcon size={192} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("192px");
    // The card, then one dot per colour
    expect(root.children).toHaveLength(6);
  });
});
