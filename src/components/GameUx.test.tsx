import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "../store/gameStore";
import { Board } from "./Board";
import { TransactionOverlay } from "./TransactionOverlay";

const players = [
  { name: "Naftali", token: "🍞", color: "#c64c48" },
  { name: "Michal", token: "🚌", color: "#3575b6" },
];

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().newGame(players);
});

async function render(element: React.ReactElement) {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(element));
  const html = container.innerHTML;
  await act(async () => root.unmount());
  return { container, html };
}

describe("transaction feedback", () => {
  it.each([
    {
      from: "p1",
      to: "p2",
      he: "Naftali",
      other: "Michal",
      reason: "שכירות",
      propertyId: "jerusalem",
    },
    {
      from: "p1",
      to: "BANK",
      he: "Naftali",
      other: "BANK",
      reason: "עונת החתונות",
      propertyId: "wedding-season",
    },
    {
      from: "BANK",
      to: "p2",
      he: "BANK",
      other: "Michal",
      reason: "עברת",
      propertyId: undefined,
    },
    {
      from: "p1",
      to: "BANK",
      he: "Naftali",
      other: "BANK",
      reason: "כרטיס",
      propertyId: undefined,
    },
    {
      from: "BANK",
      to: "p1",
      he: "BANK",
      other: "Naftali",
      reason: "כרטיס",
      propertyId: undefined,
    },
  ])(
    "shows $from → $to, amount and reason",
    async ({ from, to, he, other, reason, propertyId }) => {
      useGameStore.setState({
        transactionQueue: [
          {
            id: "tx-1",
            from,
            to,
            amount: 80,
            reason: { he: reason, en: "Reason" },
            propertyId,
          },
        ],
      });
      const { html } = await render(createElement(TransactionOverlay));
      expect(html).toContain(he);
      expect(html).toContain(other);
      expect(html).toContain(">80</strong>");
      expect(html).toContain(reason);
    },
  );
});

describe("board ownership and buildings", () => {
  it("shows owner tokens, mortgage labels, full group badges and SVG house/guest-house counts", async () => {
    const properties = ["bnei-brak", "mea-shearim"];
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 1 },
        "mea-shearim": { ownerId: "p1", mortgaged: false, houses: 4 },
        tiberias: { ownerId: "p2", mortgaged: true, houses: 5 },
      },
    });
    const onInspect = vi.fn();
    const { html } = await render(createElement(Board, { onInspect }));
    expect(html).toContain("full-set-marker");
    expect(html).toContain("owner-marker");
    expect(html).toContain("MORTGAGED");
    expect(html.match(/class="house-icon"/g)).toHaveLength(5);
    expect(html).toContain("guest-house-icon");
    expect(properties).toHaveLength(2);
  });

  it("opens informational inspection when clicked without changing game state", async () => {
    const onInspect = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(createElement(Board, { onInspect })));
    const before = useGameStore.getState();
    const tile = container.querySelector(".space-property");
    expect(tile).toBeTruthy();
    await act(async () => {
      (tile as HTMLElement).click();
    });
    expect(onInspect).toHaveBeenCalledWith("bnei-brak");
    expect(useGameStore.getState().phase).toBe(before.phase);
    expect(useGameStore.getState().ownership).toEqual(before.ownership);
    expect(useGameStore.getState().players).toEqual(before.players);
    await act(async () => root.unmount());
  });

  it("updates board owner indicators after purchase, trade, and bankruptcy transfer", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(createElement(Board, { onInspect: vi.fn() })),
    );
    useGameStore.setState({
      pendingSpaceId: "bnei-brak",
      phase: "PROPERTY_DECISION",
    });
    await act(async () => useGameStore.getState().buyPendingProperty());
    const tile = container.querySelector('[aria-label^="בני ברק / Bnei Brak"]');
    expect(tile?.querySelector(".owner-marker")?.textContent).toContain("🍞");

    await act(async () =>
      useGameStore
        .getState()
        .executeTrade({
          targetId: "p2",
          offerPropertyId: "bnei-brak",
          offerCash: 0,
          requestCash: 0,
        }),
    );
    expect(tile?.querySelector(".owner-marker")?.textContent).toContain("🚌");

    useGameStore.setState({
      activePlayerIndex: 1,
      debt: { amount: 2000, creditorId: "p1", reason: "unpayable" },
      phase: "DEBT",
    });
    await act(async () => useGameStore.getState().declareBankruptcy());
    expect(tile?.querySelector(".owner-marker")?.textContent).toContain("🍞");
    await act(async () => root.unmount());
  });
});
