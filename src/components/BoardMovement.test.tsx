import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board";
import { useGameStore } from "../store/gameStore";

const bounds = (x: number, y: number, width: number, height: number): DOMRect => ({
  x, y, left: x, top: y, width, height, right: x + width, bottom: y + height,
  toJSON: () => ({}),
} as DOMRect);

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().newGame([
    { name: "First", token: "🍞", color: "#aabbcc" },
    { name: "Second", token: "🚆", color: "#aaccbb" },
  ]);
});

afterEach(() => vi.restoreAllMocks());

describe("board piece animation", () => {
  it("preserves the same DOM token while moving across multiple squares", async () => {
    // jsdom has no layout engine; mock measured board-square positions.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.classList.contains("board-grid")) return bounds(0, 0, 1100, 1100);
      const index = this.getAttribute("data-board-index");
      if (index !== null) return bounds(100 + Number(index) * 30, 700, 60, 75);
      return bounds(0, 0, 0, 0);
    });
    const node = document.createElement("div");
    const root = createRoot(node);
    try {
      await act(async () => root.render(createElement(Board, { onInspect: vi.fn() })));
      const initialPiece = node.querySelector('[data-player-id="p1"]');
      expect(initialPiece).not.toBeNull();
      expect(initialPiece?.getAttribute("data-space-index")).toBe("0");
      for (const index of [1, 2, 3, 4]) {
        await act(async () => useGameStore.setState(state => ({
          phase: "MOVING",
          players: state.players.map(player => player.id === "p1" ? { ...player, position: index } : player),
        })));
        const piece = node.querySelector('[data-player-id="p1"]');
        expect(piece).toBe(initialPiece);
        expect(piece?.getAttribute("data-space-index")).toBe(String(index));
        expect(node.querySelectorAll('[data-player-id="p1"]')).toHaveLength(1);
      }
    } finally {
      await act(async () => root.unmount());
    }
  });
});
