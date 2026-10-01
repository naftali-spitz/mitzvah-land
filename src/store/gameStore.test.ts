import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./gameStore";

const players = [
  { name: "A", token: "🍞", color: "#111" },
  { name: "B", token: "🚌", color: "#222" },
];

beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().newGame(players);
});

describe("game state machine", () => {
  it("starts with 1500 Zuzim", () => {
    expect(useGameStore.getState().players.map((p) => p.money)).toEqual([
      1500, 1500,
    ]);
  });
  it("persists the sound preference and keeps it for a new game", () => {
    useGameStore.getState().setSoundEnabled(false);

    const saved = JSON.parse(localStorage.getItem("mitzvah-land-save") ?? "{}");
    expect(saved.state.settings.sound).toBe(false);

    useGameStore.getState().newGame(players);
    expect(useGameStore.getState().settings.sound).toBe(false);
  });
  it("records rent as a player-to-player transfer with the property", () => {
    useGameStore.setState((state) => ({
      phase: "RESOLVING",
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: 1 } : player,
      ),
      ownership: {
        "bnei-brak": { ownerId: "p2", mortgaged: false, houses: 0 },
      },
    }));

    useGameStore.getState().resolveCurrentSpace();
    const state = useGameStore.getState();
    expect(state.transactionQueue[0]).toMatchObject({
      from: "p1",
      to: "p2",
      amount: 2,
      propertyId: "bnei-brak",
    });
    expect(state.logs[0].text).toContain("A → B");
    expect(state.logs[0].text).toContain("Rent – Bnei Brak");
  });
  it("records tax as a player-to-bank transaction", () => {
    useGameStore.setState((state) => ({
      phase: "RESOLVING",
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: 38 } : player,
      ),
    }));
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().transactionQueue[0]).toMatchObject({
      from: "p1",
      to: "BANK",
      amount: 100,
      propertyId: "wedding-season",
    });
  });
  it("records Start salary as a bank-to-player transaction", () => {
    vi.useFakeTimers();
    useGameStore.setState((state) => ({
      phase: "MOVING",
      pendingSteps: 1,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: 39 } : player,
      ),
    }));
    useGameStore.getState().stepMove();
    expect(useGameStore.getState().transactionQueue[0]).toMatchObject({
      from: "BANK",
      to: "p1",
      amount: 200,
    });
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
  it("records card payments and rewards with the card text as the reason", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(1 / 24);
    useGameStore.setState((state) => ({
      phase: "RESOLVING",
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: 7 } : player,
      ),
    }));
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().transactionQueue[0]).toMatchObject({
      from: "p1",
      to: "BANK",
      amount: 50,
    });
    expect(useGameStore.getState().logs[0].text).toContain(
      "Wedding season strikes",
    );

    useGameStore.setState((state) => ({
      transactionQueue: [],
      phase: "RESOLVING",
      currentCard: undefined,
      debt: undefined,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, position: 2 } : player,
      ),
    }));
    random.mockReturnValue(0);
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().transactionQueue[0]).toMatchObject({
      from: "BANK",
      to: "p1",
      amount: 20,
    });
    expect(useGameStore.getState().logs[0].text).toContain("Collect 20");
    random.mockRestore();
  });
  it("records a successful building sale and credits half the cost", () => {
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 1 },
      },
    });
    useGameStore.getState().sellBuilding("bnei-brak");
    const state = useGameStore.getState();
    expect(state.ownership["bnei-brak"].houses).toBe(0);
    expect(state.players[0].money).toBe(1525);
    expect(state.transactionQueue[0]).toMatchObject({
      from: "BANK",
      to: "p1",
      amount: 25,
      propertyId: "bnei-brak",
    });
  });
  it("collects salary when passing Start", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 39 } : p)),
      phase: "WAITING_FOR_ROLL",
    }));
    useGameStore.getState().rollDice([1, 1]);
    useGameStore.getState().stepMove();
    useGameStore.getState().stepMove();
    expect(useGameStore.getState().players[0].money).toBe(1700);
    expect(useGameStore.getState().players[0].position).toBe(1);
  });
  it("collects 200 Zuzim when landing exactly on Start", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 38 } : p)),
      phase: "MOVING",
      pendingSteps: 2,
    }));
    vi.useFakeTimers();
    useGameStore.getState().stepMove();
    useGameStore.getState().stepMove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const s = useGameStore.getState();
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].money).toBe(1700);
  });
  it("keeps the GO salary when passing Start and landing on a card space", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 39 } : p)),
      phase: "MOVING",
      pendingSteps: 3,
    }));
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) useGameStore.getState().stepMove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    random.mockRestore();
    const s = useGameStore.getState();
    expect(s.players[0].position).toBe(2);
    expect(s.players[0].money).toBe(1720);
    expect(s.currentCard).not.toBeUndefined();
  });
  it("collects one GO salary and opens the normal property decision after passing Start", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 39 } : p)),
      phase: "MOVING",
      pendingSteps: 2,
    }));
    vi.useFakeTimers();
    useGameStore.getState().stepMove();
    useGameStore.getState().stepMove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const s = useGameStore.getState();
    expect(s.players[0].money).toBe(1700);
    expect(s.phase).toBe("PROPERTY_DECISION");
    expect(s.pendingSpaceId).toBe("bnei-brak");
  });
  it("collects GO salary and opens the station decision after passing Start", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 39 } : p)),
      phase: "MOVING",
      pendingSteps: 6,
    }));
    vi.useFakeTimers();
    for (let i = 0; i < 6; i++) useGameStore.getState().stepMove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const s = useGameStore.getState();
    expect(s.players[0].money).toBe(1700);
    expect(s.phase).toBe("PROPERTY_DECISION");
    expect(s.pendingSpaceId).toBe("ben-gurion");
  });
  it("collects GO salary before resolving a utility reached after a full lap", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 38 } : p)),
      phase: "MOVING",
      pendingSteps: 14,
    }));
    vi.useFakeTimers();
    for (let i = 0; i < 14; i++) useGameStore.getState().stepMove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const s = useGameStore.getState();
    expect(s.players[0].money).toBe(1700);
    expect(s.phase).toBe("PROPERTY_DECISION");
    expect(s.pendingSpaceId).toBe("mekorot");
  });
  it.each([
    ["bnei-brak", 1640],
    ["ben-gurion", 1500],
    ["mekorot", 1550],
  ])(
    "purchases %s without changing the GO salary rules",
    (spaceId, expectedMoney) => {
      useGameStore.setState({
        pendingSpaceId: spaceId,
        phase: "PROPERTY_DECISION",
        players: useGameStore
          .getState()
          .players.map((p, i) => (i === 0 ? { ...p, money: 1700 } : p)),
      });
      useGameStore.getState().buyPendingProperty();
      expect(useGameStore.getState().ownership[spaceId].ownerId).toBe("p1");
      expect(useGameStore.getState().players[0].money).toBe(expectedMoney);
    },
  );
  it("can purchase an unowned property", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 1 } : p)),
      phase: "RESOLVING",
    }));
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().phase).toBe("PROPERTY_DECISION");
    useGameStore.getState().buyPendingProperty();
    expect(useGameStore.getState().ownership["bnei-brak"].ownerId).toBe("p1");
    expect(useGameStore.getState().players[0].money).toBe(1440);
  });
  it("mortgages an owned property and credits cash", () => {
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
      },
    });
    useGameStore.getState().mortgage("bnei-brak");
    expect(useGameStore.getState().ownership["bnei-brak"].mortgaged).toBe(true);
    expect(useGameStore.getState().players[0].money).toBe(1530);
  });
  it("supports direct hot-seat trades", () => {
    useGameStore.setState({
      ownership: {
        "bnei-brak": { ownerId: "p1", mortgaged: false, houses: 0 },
        tiberias: { ownerId: "p2", mortgaged: false, houses: 0 },
      },
    });
    useGameStore.getState().executeTrade({
      targetId: "p2",
      offerPropertyId: "bnei-brak",
      requestPropertyId: "tiberias",
      offerCash: 100,
      requestCash: 0,
    });
    const s = useGameStore.getState();
    expect(s.ownership["bnei-brak"].ownerId).toBe("p2");
    expect(s.ownership["tiberias"].ownerId).toBe("p1");
    expect(s.players[0].money).toBe(1400);
    expect(s.players[1].money).toBe(1600);
  });
  it("sends a player to traffic on the third consecutive double", () => {
    useGameStore.setState({ consecutiveDoubles: 2, phase: "WAITING_FOR_ROLL" });
    useGameStore.getState().rollDice([4, 4]);
    const p = useGameStore.getState().players[0];
    expect(p.inJail).toBe(true);
    expect(p.position).toBe(10);
  });
  it("can use a get-out card", () => {
    useGameStore.setState((s) => ({
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, inJail: true, getOutCards: 1 } : p,
      ),
      phase: "WAITING_FOR_ROLL",
    }));
    useGameStore.getState().useGetOutCard();
    expect(useGameStore.getState().players[0].inJail).toBe(false);
    expect(useGameStore.getState().players[0].getOutCards).toBe(0);
  });
  it("transfers assets on bankruptcy to a creditor", () => {
    useGameStore.setState({
      ownership: { jerusalem: { ownerId: "p1", mortgaged: false, houses: 0 } },
      debt: { amount: 2000, creditorId: "p2", reason: "rent" },
      phase: "DEBT",
    });
    useGameStore.getState().declareBankruptcy();
    const s = useGameStore.getState();
    expect(s.players[0].bankrupt).toBe(true);
    expect(s.ownership.jerusalem.ownerId).toBe("p2");
    expect(s.phase).toBe("GAME_OVER");
    expect(s.winnerId).toBe("p2");
  });
  it("puts taxes into Free Parking jackpot when enabled", () => {
    useGameStore.setState((s) => ({
      settings: { ...s.settings, freeParkingJackpot: true },
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 4 } : p)),
      phase: "RESOLVING",
    }));
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().freeParkingPot).toBe(200);
  });
  it("pays the Free Parking jackpot", () => {
    useGameStore.setState((s) => ({
      settings: { ...s.settings, freeParkingJackpot: true },
      freeParkingPot: 300,
      players: s.players.map((p, i) => (i === 0 ? { ...p, position: 20 } : p)),
      phase: "RESOLVING",
    }));
    useGameStore.getState().resolveCurrentSpace();
    expect(useGameStore.getState().players[0].money).toBe(1800);
    expect(useGameStore.getState().freeParkingPot).toBe(0);
  });
});
