import type { JSX } from "react";

// Magic's colour wheel, clockwise from the top: white, blue, black, red, green
const wheel = ["#F2D06B", "#1F6FB2", "#3B3540", "#C7372F", "#2E7D4F"];

/**
 * The app icon: a card in the brand purple with the five colours around it.
 * Drawn with flexbox and absolute positioning only, for next/og's renderer.
 * Full-bleed background, so it also works as a "maskable" icon (cropped to a
 * circle or squircle by the phone).
 */
export function AppIcon({ size }: { size: number }): JSX.Element {
  const card = { width: size * 0.42, height: size * 0.588 };
  const dot = size * 0.085;
  // Small enough that every dot stays inside the card
  const radius = size * 0.14;
  const centre = size / 2;

  return (
    <div style={{ width: size, height: size, display: "flex", position: "relative", background: "#4A3B8F" }}>
      <div
        style={{
          position: "absolute",
          left: centre - card.width / 2,
          top: centre - card.height / 2,
          width: card.width,
          height: card.height,
          borderRadius: size * 0.04,
          background: "#F4ECD8",
          border: `${Math.max(1, size * 0.018)}px solid #B5862B`,
          display: "flex",
        }}
      />
      {wheel.map((colour, i) => {
        const angle = (-90 + i * 72) * (Math.PI / 180);
        return (
          <div
            key={colour}
            style={{
              position: "absolute",
              left: centre + radius * Math.cos(angle) - dot / 2,
              top: centre + radius * Math.sin(angle) - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot,
              background: colour,
              display: "flex",
            }}
          />
        );
      })}
    </div>
  );
}
