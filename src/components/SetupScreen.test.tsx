import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { SetupScreen } from "./SetupScreen";
import { useGameStore } from "../store/gameStore";

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().setupLang("en");
});

async function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  await act(async () => root.render(createElement(SetupScreen)));
  return {
    container,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find(candidate =>
    candidate.textContent?.trim() === label,
  );
  if (!found) throw new Error("No button labelled " + label);
  return found;
}

function select(container: HTMLElement, label: string): HTMLSelectElement {
  const found = Array.from(container.querySelectorAll("select")).find(candidate =>
    candidate.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error("No select labelled " + label);
  return found;
}

describe("illustrated game setup lobby", () => {
  it("shows the background, four editable player cards and changes between two and six seats", async () => {
    const view = await mount();
    try {
      expect(view.container.querySelector(".setup-landscape")).toBeTruthy();
      expect(view.container.querySelectorAll(".player-setup")).toHaveLength(4);
      expect(view.container.textContent).toContain("MITZVAH LAND");
      await act(async () => button(view.container, "6").click());
      expect(view.container.querySelectorAll(".player-setup")).toHaveLength(6);
      await act(async () => button(view.container, "2").click());
      expect(view.container.querySelectorAll(".player-setup")).toHaveLength(2);
    } finally {
      await view.unmount();
    }
  });

  it("preserves a custom human name when changing the seat to a computer", async () => {
    const view = await mount();
    try {
      const first = view.container.querySelector<HTMLInputElement>('input[aria-label="Player name 1"]')!;
      const initial = first.value;
      const kind = select(view.container, "Player type 1");
      await act(async () => {
        kind.value = "computer";
        kind.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(first.value).toBe(initial);
      expect(view.container.querySelectorAll(".computer-seat")).toHaveLength(1);
      const difficulty = select(view.container, "Difficulty 1");
      await act(async () => {
        difficulty.value = "hard";
        difficulty.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(select(view.container, "Difficulty 1").value).toBe("hard");
      await act(async () => button(view.container, "START GAME").click());
      expect(useGameStore.getState().started).toBe(true);
      expect(useGameStore.getState().players[0]).toMatchObject({
        name: initial,
        isComputer: true,
        aiDifficulty: "hard",
      });
    } finally {
      await view.unmount();
    }
  });

  it("shows all tokens at once and prevents choosing another player's token", async () => {
    const view = await mount();
    try {
      const launch = view.container.querySelector<HTMLButtonElement>('button[aria-label="Choose token 1"]')!;
      await act(async () => launch.click());
      const picker = view.container.querySelector('[role="dialog"]');
      expect(picker).toBeTruthy();
      expect(picker?.querySelectorAll(".setup-token-grid button")).toHaveLength(10);
      const taken = picker?.querySelector<HTMLButtonElement>('button[aria-label="Token 🍷"]');
      expect(taken?.disabled).toBe(true);
      const available = picker?.querySelector<HTMLButtonElement>('button[aria-label="Token 🎒"]');
      expect(available?.disabled).toBe(false); // Hidden seats are swappable.
      const newToken = picker?.querySelector<HTMLButtonElement>('button[aria-label="Token 🥾"]');
      expect(newToken?.disabled).toBe(false); // Hidden seats are swappable.
      await act(async () => newToken!.click());
      expect(view.container.querySelector('[role="dialog"]')).toBeNull();
      await act(async () => button(view.container, "START GAME").click());
      expect(useGameStore.getState().players[0].token).toBe("🥾");
      const gameTokens = useGameStore.getState().players.map(player => player.token);
      expect(new Set(gameTokens).size).toBe(gameTokens.length);
    } finally {
      await view.unmount();
    }
  });

  it("keeps player count and options when revisiting the local setup screen", async () => {
    const view = await mount();
    try {
      await act(async () => button(view.container, "3").click());
      await act(async () => view.container.querySelector<HTMLButtonElement>(".setup-options-toggle")!.click());
      const freeParking = view.container.querySelector<HTMLInputElement>(".setup-options-content input")!;
      await act(async () => freeParking.click());
    } finally {
      await view.unmount();
    }
    const rerender = await mount();
    try {
      expect(rerender.container.querySelectorAll(".player-setup")).toHaveLength(3);
      await act(async () => rerender.container.querySelector<HTMLButtonElement>(".setup-options-toggle")!.click());
      expect(rerender.container.querySelector<HTMLInputElement>(".setup-options-content input")!.checked).toBe(true);
    } finally {
      await rerender.unmount();
    }
  });
});
