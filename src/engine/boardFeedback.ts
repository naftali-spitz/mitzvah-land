import { board } from "../data/board";
import type { Lang, Ownership } from "../types/game";

export type BoardChangeKind =
  | "purchase"
  | "transfer"
  | "build"
  | "hotel"
  | "sell"
  | "mortgage"
  | "unmortgage";

export interface BoardChange {
  spaceId: string;
  kind: BoardChangeKind;
}

/**
 * Compare successive live game states, not transaction messages.
 * This covers actions from human players, computer players, auctions, and trades.
 * Callers should seed the previous state on mount so loading a saved game does
 * not replay purchase/build animations for all existing assets.
 */
export function detectBoardChange(
  previous: Record<string, Ownership>,
  current: Record<string, Ownership>,
): BoardChange | undefined {
  for (const space of board) {
    const before = previous[space.id];
    const after = current[space.id];
    if (!after) continue;
    if (!before) return { spaceId: space.id, kind: "purchase" };
    if (before.ownerId !== after.ownerId)
      return { spaceId: space.id, kind: "transfer" };
    if (!before.mortgaged && after.mortgaged)
      return { spaceId: space.id, kind: "mortgage" };
    if (before.mortgaged && !after.mortgaged)
      return { spaceId: space.id, kind: "unmortgage" };
    if (after.houses > before.houses)
      return { spaceId: space.id, kind: after.houses === 5 ? "hotel" : "build" };
    if (after.houses < before.houses)
      return { spaceId: space.id, kind: "sell" };
  }
  return undefined;
}

const labels: Record<BoardChangeKind, { he: string; en: string }> = {
  purchase: { he: "נרכש!", en: "PURCHASED!" },
  transfer: { he: "בעלים חדשים", en: "NEW OWNER" },
  build: { he: "בית חדש!", en: "NEW HOUSE!" },
  hotel: { he: "בית הארחה!", en: "GUEST HOUSE!" },
  sell: { he: "נמכר בית", en: "HOUSE SOLD" },
  mortgage: { he: "ממושכן", en: "MORTGAGED" },
  unmortgage: { he: "שוחרר ממשכון", en: "REDEEMED" },
};

export function boardChangeLabel(kind: BoardChangeKind, lang: Lang): string {
  const label = labels[kind];
  return lang === "he" ? label.he : lang === "en" ? label.en : `${label.he} · ${label.en}`;
}
