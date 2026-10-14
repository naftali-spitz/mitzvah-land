import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { UtilityRail } from "./UtilityRail";

describe("compact left utility rail", () => {
  it("renders six accessible square icon controls in a top-down rail", async () => {
    const callbacks = {
      onSound: vi.fn(),
      onRules: vi.fn(),
      onHistory: vi.fn(),
      onLanguage: vi.fn(),
      onFullscreen: vi.fn(),
      onNewGame: vi.fn(),
    };
    const host = document.createElement("div");
    const root = createRoot(host);
    try {
      await act(async () => root.render(createElement(UtilityRail, {
        lang: "en",
        soundEnabled: true,
        historyOpen: false,
        fullscreen: false,
        ...callbacks,
      })));
      const nav = host.querySelector("nav.utility-rail");
      expect(nav?.getAttribute("aria-label")).toBe("Game utilities");
      const buttons = [...(nav?.querySelectorAll("button.utility-button") ?? [])];
      expect(buttons).toHaveLength(6);
      expect(buttons.map(b => b.getAttribute("aria-label"))).toEqual([
        "Mute sound", "Game rules", "Game history", "Change language", "Fullscreen", "New game",
      ]);
      expect(buttons.every(b => b.querySelector("svg") && !b.textContent?.trim().includes("Game"))).toBe(true);
      await act(async () => buttons[0].click());
      await act(async () => buttons[1].click());
      await act(async () => buttons[2].click());
      await act(async () => buttons[3].click());
      await act(async () => buttons[4].click());
      await act(async () => buttons[5].click());
      for (const fn of Object.values(callbacks)) expect(fn).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("reflects toggle state and provides Hebrew accessibility labels", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    try {
      await act(async () => root.render(createElement(UtilityRail, {
        lang: "he",
        soundEnabled: false,
        historyOpen: true,
        fullscreen: true,
        onSound: () => {},
        onRules: () => {},
        onHistory: () => {},
        onLanguage: () => {},
        onFullscreen: () => {},
        onNewGame: () => {},
      })));
      const buttons = [...host.querySelectorAll("button.utility-button")];
      expect(buttons[0].getAttribute("aria-label")).toBe("הפעל צלילים");
      expect(buttons[2].getAttribute("aria-pressed")).toBe("true");
      expect(buttons[4].getAttribute("aria-label")).toBe("צא ממסך מלא");
    } finally {
      await act(async () => root.unmount());
    }
  });
});
