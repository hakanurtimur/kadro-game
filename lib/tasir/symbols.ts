import type { TasirTile } from "./types";

export const TASIR_SYMBOLS = ["●", "▲", "◆", "★", "♥", "☀", "☾", "✿", "⚡", "✦"] as const;
if (TASIR_SYMBOLS.length !== 10) throw new Error("TAŞIR sembol seti tam 10 öğe olmalı.");

export function tasirSymbol(tile: TasirTile) {
  return tile === "joker" ? "✺" : TASIR_SYMBOLS[tile] ?? String(tile);
}
