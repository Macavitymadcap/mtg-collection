/** The five colours of Magic, in WUBRG order. Colourless is an empty string. */
export const colors = ["W", "U", "B", "R", "G"] as const;
export type Color = (typeof colors)[number];

/** How a physical card is printed. */
export const finishes = ["nonfoil", "foil", "etched"] as const;
export type Finish = (typeof finishes)[number];

/** Card condition, best to worst. */
export const conditions = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type Condition = (typeof conditions)[number];

/** Which part of a deck a card belongs to. "maybe" doesn't count towards allocation. */
export const boards = ["commander", "main", "side", "maybe"] as const;
export type Board = (typeof boards)[number];

export const formats = ["commander", "standard", "pioneer", "modern", "legacy", "pauper", "casual"] as const;
export type Format = (typeof formats)[number];

export const rarities = ["common", "uncommon", "rare", "mythic", "special", "bonus"] as const;
export type Rarity = (typeof rarities)[number];

/** Human-readable labels for the UI. */
export const labels = {
  finish: { nonfoil: "Non-foil", foil: "Foil", etched: "Etched" },
  condition: { NM: "Near mint", LP: "Lightly played", MP: "Moderately played", HP: "Heavily played", DMG: "Damaged" },
  board: { commander: "Commander", main: "Main deck", side: "Sideboard", maybe: "Maybe" },
  format: {
    commander: "Commander",
    standard: "Standard",
    pioneer: "Pioneer",
    modern: "Modern",
    legacy: "Legacy",
    pauper: "Pauper",
    casual: "Casual",
  },
} as const satisfies {
  finish: Record<Finish, string>;
  condition: Record<Condition, string>;
  board: Record<Board, string>;
  format: Record<Format, string>;
};
