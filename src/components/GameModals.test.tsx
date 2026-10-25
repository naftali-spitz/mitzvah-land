import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "../store/gameStore";
import { Money } from "./ui";
import { AssetInformation } from "./AssetCard";
import { board } from "../data/board";
import { DebtModal, Management } from "./GameModals";
import { ux } from "../data/ux";

const players = [
  { name: "A", token: "🍞", color: "#111" },
  { name: "B", token: "🚌", color: "#222" },
];

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().newGame(players);
});

async function renderAsset(spaceId: string) {
  const container = document.createElement("div");
  const root = createRoot(container);
  const space = board.find((candidate) => candidate.id === spaceId)!;
  await act(async () =>
    root.render(createElement(AssetInformation, { space })),
  );
  const html = container.innerHTML;
  await act(async () => root.unmount());
  return html;
}

async function renderManagement() {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(createElement(Management)));
  const html = container.innerHTML;
  await act(async () => root.unmount());
  return html;
}

describe("live asset information", () => {
  it("shows property price, mortgage, building cost, rent tiers and bank ownership", async () => {
    const html = await renderAsset("bnei-brak");
    expect(html).toContain("Base");
    expect(html).toContain("Full set");
    expect(html).toContain("BUILD COST");
    expect(html).toContain("MORTGAGE VALUE");
    expect(html).toContain("BROWN");
    expect(html).toContain("Guest house");
    expect(html).toContain("BANK");
  });

  it("shows four station rent tiers and no buildings", async () => {
    const html = await renderAsset("ben-gurion");
    expect(html).toContain("1 station owned");
    expect(html).toContain("2 תחנות בבעלות · 2 stations owned");
    expect(html).toContain("3 תחנות בבעלות · 3 stations owned");
    expect(html).toContain("4 תחנות בבעלות · 4 stations owned");
    expect(html).not.toContain("BUILDINGS");
    expect(html).not.toContain("Guest house");
  });

  it("updates transport owner, count and live rent from ownership", async () => {
    useGameStore.setState({
      ownership: {
        "ben-gurion": { ownerId: "p2", mortgaged: false, houses: 0 },
        "jerusalem-central": { ownerId: "p2", mortgaged: false, houses: 0 },
        "tel-aviv-rail": { ownerId: "p2", mortgaged: false, houses: 0 },
      },
    });
    const html = await renderAsset("ben-gurion");
    expect(html).toContain("B</b>");
    expect(html).toContain("3 / 4");
    expect(html).toContain(">100</b>");
  });

  it("shows utility counts and both dice multipliers without property rent tiers", async () => {
    const html = await renderAsset("mekorot");
    expect(html).toContain("UTILITIES OWNED");
    expect(html).toContain("1 utility · Dice × 4");
    expect(html).toContain("2 utilities · Dice × 10");
    expect(html).not.toContain("Base");
    expect(html).not.toContain("Guest house");
  });

  it("updates utility ownership counts and the current dice-based rent", async () => {
    useGameStore.setState((state) => ({
      lastDiceTotal: 9,
      ownership: {
        ...state.ownership,
        mekorot: { ownerId: "p2", mortgaged: false, houses: 0 },
        electric: { ownerId: "p2", mortgaged: false, houses: 0 },
      },
    }));
    const html = await renderAsset("mekorot");
    expect(html).toContain("B</b>");
    expect(html).toContain("2 / 2");
    expect(html).toContain(">90</b>");
  });

  it("updates owner, current rent, mortgage status and guest-house display from live state", async () => {
    useGameStore.setState((state) => ({
      ownership: {
        ...state.ownership,
        jerusalem: { ownerId: "p2", mortgaged: true, houses: 5 },
      },
    }));
    const html = await renderAsset("jerusalem");
    expect(html).toContain("B");
    expect(html).toContain("MORTGAGED");
    expect(html).toContain("Guest house");
    expect(html).toContain(">0</b>");
  });

  it("shows missing spaces and ownership counts in incomplete groups", async () => {
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
    });
    const html = await renderManagement();
    expect(html).toContain("1 / 2");
    expect(html).toContain("✓</span>");
    expect(html).toContain("—</span>");
    expect(html).toContain("Mea Shearim");
  });

  it("shows full set and build eligibility, then explains mortgage blockers", async () => {
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
        "mea-shearim": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
    });
    const buildable = await renderManagement();
    expect(buildable).toContain(ux("fullSet", "en"));
    expect(buildable).toContain(ux("canBuild", "en"));

    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: true, houses: 0 },
        "mea-shearim": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
    });
    const blocked = await renderManagement();
    expect(blocked).toContain(ux("cannotBuild", "en"));
    expect(blocked).toContain(ux("groupMortgaged", "en"));
  });

  it("explains insufficient funds on an otherwise buildable full group", async () => {
    useGameStore.setState((state) => ({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
        "mea-shearim": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, money: 0 } : player,
      ),
    }));
    const html = await renderManagement();
    expect(html).toContain(ux("cannotBuild", "en"));
    expect(html).toContain(ux("insufficientFunds", "en"));
  });

  it("renders names and labels in Hebrew, English, and bilingual modes", async () => {
    useGameStore.setState({ lang: "he" });
    expect(await renderAsset("jerusalem")).toContain("ירושלים");
    useGameStore.setState({ lang: "en" });
    expect(await renderAsset("jerusalem")).toContain("Jerusalem");
    useGameStore.setState({ lang: "bi" });
    expect(await renderAsset("jerusalem")).toContain("ירושלים");
    expect(await renderAsset("jerusalem")).toContain("Jerusalem");
  });
});


async function renderDebtModal() {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(createElement(DebtModal)));
  return {
    container,
    cleanup: async () => act(async () => root.unmount()),
  };
}

function findButton(scope: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(scope.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

function findPropertyRow(scope: ParentNode, name: string): Element {
  const row = Array.from(scope.querySelectorAll(".property-group-space")).find(
    (candidate) => candidate.textContent?.includes(name),
  );
  if (!row) throw new Error(`Missing owned property: ${name}`);
  return row;
}

describe("human debt management", () => {
  it("allows mortgaging an owned colored property and settling the debt", async () => {
    const mortgageValue = board.find((space) => space.id === "bnei-brak")!.mortgage!;
    useGameStore.setState((state) => ({
      lang: "en",
      debt: { amount: 10 + mortgageValue, reason: "Rent" },
      phase: "DEBT",
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, money: 10 } : player,
      ),
    }));

    const { container, cleanup } = await renderDebtModal();
    try {
      expect(findButton(container, "PAY NOW").disabled).toBe(true);
      expect(container.textContent).not.toContain("Mea Shearim");
      const mortgageButton = findButton(findPropertyRow(container, "Bnei Brak"), "MORTGAGE");
      expect(mortgageButton.disabled).toBe(false);

      await act(async () => mortgageButton.click());
      expect(useGameStore.getState().ownership["bnei-brak"].mortgaged).toBe(true);
      expect(useGameStore.getState().players[0].money).toBe(10 + mortgageValue);
      expect(findButton(container, "PAY NOW").disabled).toBe(false);

      await act(async () => findButton(container, "PAY NOW").click());
      expect(useGameStore.getState().debt).toBeUndefined();
      expect(useGameStore.getState().phase).toBe("MANAGEMENT");
      expect(useGameStore.getState().players[0].money).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("lets a human sell buildings evenly before mortgaging a color group", async () => {
    const first = board.find((space) => space.id === "bnei-brak")!;
    const second = board.find((space) => space.id === "mea-shearim")!;
    const saleProceeds =
      Math.floor(first.buildingCost! / 2) + Math.floor(second.buildingCost! / 2);
    const debtAmount = saleProceeds + first.mortgage!;
    useGameStore.setState((state) => ({
      lang: "en",
      debt: { amount: debtAmount, reason: "Rent" },
      phase: "DEBT",
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 1 },
        "mea-shearim": { ownerId: "p1", mortgaged: false, houses: 1 },
      },
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, money: 0 } : player,
      ),
    }));

    const { container, cleanup } = await renderDebtModal();
    try {
      expect(container.textContent).not.toContain("＋⌂");
      expect(findButton(findPropertyRow(container, "Bnei Brak"), "MORTGAGE").disabled).toBe(true);

      await act(async () =>
        findButton(findPropertyRow(container, "Bnei Brak"), "−⌂").click(),
      );
      expect(findButton(findPropertyRow(container, "Bnei Brak"), "MORTGAGE").disabled).toBe(true);
      await act(async () =>
        findButton(findPropertyRow(container, "Mea Shearim"), "−⌂").click(),
      );

      expect(useGameStore.getState().players[0].money).toBe(saleProceeds);
      const mortgageButton = findButton(findPropertyRow(container, "Bnei Brak"), "MORTGAGE");
      expect(mortgageButton.disabled).toBe(false);
      await act(async () => mortgageButton.click());

      expect(useGameStore.getState().players[0].money).toBe(debtAmount);
      expect(findButton(container, "PAY NOW").disabled).toBe(false);
      await act(async () => findButton(container, "PAY NOW").click());
      expect(useGameStore.getState().debt).toBeUndefined();
      expect(useGameStore.getState().players[0].money).toBe(0);
    } finally {
      await cleanup();
    }
  });
});

describe("Money", () => {
  it("renders zero and warns rather than crashing for an invalid value", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = Money({ value: undefined });
    expect(html.props.children[1].props.children).toBe("0");
    expect(warning).toHaveBeenCalledWith(
      "Money received invalid value:",
      undefined,
    );
    warning.mockRestore();
  });
});
