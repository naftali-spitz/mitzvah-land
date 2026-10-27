import { create } from "zustand";
import { persist } from "zustand/middleware";
import { board } from "../data/board";
import { goodCards, mazalCards } from "../data/cards";
import {
  calculateRent,
  canBuild,
  canMortgage,
  canSellBuilding,
  JAIL_FINE,
  START_SALARY,
} from "../engine/rules";
import type {
  AuctionState,
  Card,
  Debt,
  GamePhase,
  Lang,
  LogEntry,
  Localized,
  Ownership,
  Player,
  Space,
  Transaction,
  TradeDraft,
} from "../types/game";
import { UX, localized } from "../data/ux";
import { afterTradeOwnership, computerAcceptsTrade, tradeKey, validateTrade, type PendingTrade } from "../engine/trades";
import { movementTiming } from "../engine/movement";

interface Settings {
  freeParkingJackpot: boolean;
  auctions: boolean;
  fastMode: boolean;
  sound: boolean;
  reducedMotion: boolean;
}
interface GameState {
  started: boolean;
  lang: Lang;
  players: Player[];
  activePlayerIndex: number;
  phase: GamePhase;
  ownership: Record<string, Ownership>;
  dice: [number, number];
  pendingSteps: number;
  lastDiceTotal: number;
  consecutiveDoubles: number;
  lastRollWasDouble: boolean;
  pendingSpaceId?: string;
  currentCard?: Card;
  cardNeedsLanding: boolean;
  debt?: Debt;
  auction?: AuctionState;
  logs: LogEntry[];
  transactionQueue: Transaction[];
  winnerId?: string;
  turnNumber: number;
  freeParkingPot: number;
  pendingTrade?: PendingTrade;
  tradeAttemptedTurn: Record<string, number>;
  tradeCooldowns: Record<string, number>;
  settings: Settings;
  setupLang: (lang: Lang) => void;
  newGame: (
    players: Pick<Player, "name" | "token" | "color" | "isComputer" | "aiDifficulty">[],
    settings?: Partial<Settings>,
  ) => void;
  resetGame: () => void;
  rollDice: (forced?: [number, number]) => void;
  stepMove: (reducedMotion?: boolean) => void;
  resolveCurrentSpace: () => void;
  buyPendingProperty: () => void;
  startAuction: () => void;
  bidAuction: (playerId: string, amount: number) => void;
  passAuction: (playerId: string) => void;
  finishAuction: () => void;
  dismissCard: () => void;
  endTurn: () => void;
  payJailFine: () => void;
  useGetOutCard: () => void;
  mortgage: (spaceId: string) => void;
  unmortgage: (spaceId: string) => void;
  build: (spaceId: string) => void;
  sellBuilding: (spaceId: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  settleDebt: () => void;
  declareBankruptcy: () => void;
  executeTrade: (draft: TradeDraft) => boolean;
  proposeTrade: (draft: TradeDraft) => "accepted" | "declined" | "pending" | "invalid";
  respondToTrade: (accept: boolean) => boolean;
  addLog: (text: string | Localized) => void;
  dismissTransaction: () => void;
}

const colors = [
  "#c64c48",
  "#3575b6",
  "#4f9a66",
  "#d39d34",
  "#8c5bb5",
  "#df6b9b",
];
const defaults: Settings = {
  freeParkingJackpot: false,
  auctions: true,
  fastMode: false,
  sound: true,
  reducedMotion: false,
};
const uid = () => Math.random().toString(36).slice(2, 9);
const activePlayers = (ps: Player[]) => ps.filter((p) => !p.bankrupt);

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const recordTransaction = (details: Omit<Transaction, "id">) => {
        const state = get();
        const from =
          details.from === "BANK"
            ? UX.bank
            : localized(
                state.players.find((player) => player.id === details.from)
                  ?.name ?? details.from,
                state.players.find((player) => player.id === details.from)
                  ?.name ?? details.from,
              );
        const to =
          details.to === "BANK"
            ? UX.bank
            : localized(
                state.players.find((player) => player.id === details.to)
                  ?.name ?? details.to,
                state.players.find((player) => player.id === details.to)
                  ?.name ?? details.to,
              );
        const amount = details.amount.toLocaleString();
        const he = `${from.he} העביר ל${to.he} ${amount} זוזים — ${details.reason.he}`;
        const en = `${from.en} → ${to.en}: ${amount} Zuzim — ${details.reason.en}`;
        set((current) => ({
          transactionQueue: [
            ...current.transactionQueue,
            { ...details, id: uid() },
          ],
          logs: [{ id: uid(), text: en, he, en }, ...current.logs].slice(0, 80),
        }));
      };
      const applyTrade = (fromId: string, draft: TradeDraft): boolean => {
        const state = get();
        if (state.currentCard || state.debt || validateTrade(state, fromId, draft)) return false;
        const sender = state.players.find(p => p.id === fromId)!;
        const target = state.players.find(p => p.id === draft.targetId)!;
        set({
          ownership: afterTradeOwnership(state, fromId, draft),
          players: state.players.map(player =>
            player.id === fromId
              ? { ...player, money: player.money - draft.offerCash + draft.requestCash }
              : player.id === target.id
                ? { ...player, money: player.money + draft.offerCash - draft.requestCash }
                : player),
        });
        const offer = draft.offerPropertyId ? board.find(sp => sp.id === draft.offerPropertyId)?.name : undefined;
        const wanted = draft.requestPropertyId ? board.find(sp => sp.id === draft.requestPropertyId)?.name : undefined;
        get().addLog(localized(
          `${sender.name} ו${target.name} השלימו עסקה${offer ? ` · מסר: ${offer.he}` : ""}${wanted ? ` · קיבל: ${wanted.he}` : ""}`,
          `${sender.name} and ${target.name} completed a trade${offer ? ` · Gave: ${offer.en}` : ""}${wanted ? ` · Received: ${wanted.en}` : ""}`,
        ));
        if (draft.offerCash > 0) recordTransaction({
          from: sender.id, to: target.id, amount: draft.offerCash,
          reason: localized("מזומן בעסקה", "Trade cash"), propertyId: draft.offerPropertyId,
        });
        if (draft.requestCash > 0) recordTransaction({
          from: target.id, to: sender.id, amount: draft.requestCash,
          reason: localized("מזומן בעסקה", "Trade cash"), propertyId: draft.requestPropertyId,
        });
        return true;
      };
      return {
        started: false,
        lang: "bi",
        players: [],
        activePlayerIndex: 0,
        phase: "SETUP",
        ownership: {},
        dice: [1, 1],
        pendingSteps: 0,
        lastDiceTotal: 0,
        consecutiveDoubles: 0,
        lastRollWasDouble: false,
        cardNeedsLanding: false,
        logs: [],
        transactionQueue: [],
        turnNumber: 1,
        freeParkingPot: 0,
        tradeAttemptedTurn: {},
        tradeCooldowns: {},
        settings: defaults,
        setupLang: (lang) => set({ lang }),
        addLog: (value) =>
          set((s) => ({
            logs: [{
              id: uid(),
              text: typeof value === "string" ? value : value.en,
              ...(typeof value === "string" ? {} : { he: value.he, en: value.en }),
            }, ...s.logs].slice(0, 80),
          })),
        dismissTransaction: () =>
          set((s) => ({ transactionQueue: s.transactionQueue.slice(1) })),
        newGame: (input, settings) => {
          const ps = input.map((p, i) => ({
            id: `p${i + 1}`,
            name: p.name || `Player ${i + 1}`,
            isComputer: !!p.isComputer,
            aiDifficulty: p.isComputer ? p.aiDifficulty ?? "medium" : undefined,
            token: p.token,
            color: p.color || colors[i],
            money: 1500,
            position: 0,
            inJail: false,
            jailTurns: 0,
            bankrupt: false,
            getOutCards: 0,
          }));
          set({
            started: true,
            players: ps,
            activePlayerIndex: 0,
            phase: "WAITING_FOR_ROLL",
            ownership: {},
            dice: [1, 1],
            pendingSteps: 0,
            lastDiceTotal: 0,
            consecutiveDoubles: 0,
            lastRollWasDouble: false,
            pendingSpaceId: undefined,
            currentCard: undefined,
            debt: undefined,
            auction: undefined,
            logs: [{ id: uid(), text: "Game started", he: "המשחק התחיל", en: "Game started" }],
            transactionQueue: [],
            winnerId: undefined,
            turnNumber: 1,
            freeParkingPot: 0,
            pendingTrade: undefined,
            tradeAttemptedTurn: {},
            tradeCooldowns: {},
            settings: {
              ...defaults,
              ...settings,
              sound: settings?.sound ?? get().settings.sound,
            },
          });
        },
        resetGame: () =>
          set({
            started: false,
            players: [],
            ownership: {},
            phase: "SETUP",
            logs: [],
            transactionQueue: [],
            winnerId: undefined,
            debt: undefined,
            auction: undefined,
            currentCard: undefined,
            pendingTrade: undefined,
            tradeAttemptedTurn: {},
            tradeCooldowns: {},
          }),
        rollDice: (forced) => {
          const s = get();
          if (s.phase !== "WAITING_FOR_ROLL") return;
          const p = s.players[s.activePlayerIndex];
          if (!p || p.bankrupt) return;
          const dice =
            forced ??
            ([
              1 + Math.floor(Math.random() * 6),
              1 + Math.floor(Math.random() * 6),
            ] as [number, number]);
          const total = dice[0] + dice[1];
          const dbl = dice[0] === dice[1];
          if (p.inJail) {
            if (dbl) {
              const ps = s.players.map((x) =>
                x.id === p.id ? { ...x, inJail: false, jailTurns: 0 } : x,
              );
              set({
                players: ps,
                dice,
                lastDiceTotal: total,
                lastRollWasDouble: false,
                consecutiveDoubles: 0,
                pendingSteps: total,
                phase: "MOVING",
              });
              get().addLog(localized(`${p.name} גלגל דאבל ויצא מהפקק`, `${p.name} rolled doubles and escaped traffic`));
              return;
            }
            if (p.jailTurns >= 2) {
              if (p.money >= JAIL_FINE) {
                const ps = s.players.map((x) =>
                  x.id === p.id
                    ? {
                        ...x,
                        inJail: false,
                        jailTurns: 0,
                        money: x.money - JAIL_FINE,
                      }
                    : x,
                );
                set({
                  players: ps,
                  dice,
                  lastDiceTotal: total,
                  lastRollWasDouble: false,
                  consecutiveDoubles: 0,
                  pendingSteps: total,
                  phase: "MOVING",
                });
                recordTransaction({
                  from: p.id,
                  to: "BANK",
                  amount: JAIL_FINE,
                  reason: UX.jailFine,
                });
                get().addLog(
                  localized(`${p.name} שילם 50 זוזים לאחר שלושה תורות בפקק`, `${p.name} paid 50 Zuzim after three turns in traffic`),
                );
                return;
              }
              set({
                dice,
                lastDiceTotal: total,
                debt: { amount: JAIL_FINE, reason: "Traffic release" },
                phase: "DEBT",
              });
              return;
            }
            set({
              players: s.players.map((x) =>
                x.id === p.id ? { ...x, jailTurns: x.jailTurns + 1 } : x,
              ),
              dice,
              lastDiceTotal: total,
              lastRollWasDouble: false,
              phase: "MANAGEMENT",
            });
            get().addLog(localized(`${p.name} עדיין תקוע בפקק`, `${p.name} is still stuck in traffic`));
            return;
          }
          const cd = dbl ? s.consecutiveDoubles + 1 : 0;
          if (cd >= 3) {
            set({
              players: s.players.map((x) =>
                x.id === p.id
                  ? { ...x, position: 10, inJail: true, jailTurns: 0 }
                  : x,
              ),
              dice,
              lastDiceTotal: total,
              lastRollWasDouble: false,
              consecutiveDoubles: 0,
              phase: "MANAGEMENT",
            });
            get().addLog(
              localized(`${p.name} גלגל שלושה דאבלים ונכנס לפקק`, `${p.name} rolled three doubles and was sent to traffic`),
            );
            return;
          }
          set({
            dice,
            lastDiceTotal: total,
            lastRollWasDouble: dbl,
            consecutiveDoubles: cd,
            pendingSteps: total,
            phase: "MOVING",
          });
          get().addLog(localized(`${p.name} גלגל ${dice[0]} + ${dice[1]} = ${total}`, `${p.name} rolled ${dice[0]} + ${dice[1]} = ${total}`));
        },
        stepMove: (reducedMotion) => {
          const s = get();
          if (s.phase !== "MOVING" || s.pendingSteps <= 0) return;
          const p = s.players[s.activePlayerIndex];
          let next = (p.position + 1) % 40;
          const passed = next === 0;
          const ps = s.players.map((x) =>
            x.id === p.id
              ? {
                  ...x,
                  position: next,
                  money: x.money + (passed ? START_SALARY : 0),
                }
              : x,
          );
          const left = s.pendingSteps - 1;
          set({
            players: ps,
            pendingSteps: left,
            phase: left === 0 ? "RESOLVING" : "MOVING",
          });
          if (passed)
            recordTransaction({
              from: "BANK",
              to: p.id,
              amount: START_SALARY,
              reason: UX.goSalary,
            });
          if (left === 0) setTimeout(() => get().resolveCurrentSpace(), movementTiming(reducedMotion ?? s.settings.reducedMotion).landingMs);
        },
        resolveCurrentSpace: () => {
          const s = get();
          if (!["RESOLVING", "MANAGEMENT"].includes(s.phase)) return;
          const p = s.players[s.activePlayerIndex];
          const space = board[p.position];
          if (
            space.type === "property" ||
            space.type === "station" ||
            space.type === "utility"
          ) {
            const own = s.ownership[space.id];
            if (!own) {
              set({ pendingSpaceId: space.id, phase: "PROPERTY_DECISION" });
              return;
            }
            if (own.ownerId === p.id || own.mortgaged) {
              set({ phase: "MANAGEMENT" });
              return;
            }
            const rent = calculateRent(space, s.ownership, s.lastDiceTotal);
            const owner = s.players.find((x) => x.id === own.ownerId);
            if (rent <= 0 || !owner) {
              set({ phase: "MANAGEMENT" });
              return;
            }
            if (p.money < rent) {
              set({
                debt: {
                  amount: rent,
                  creditorId: owner.id,
                  reason: `Rent: ${space.name.en}`,
                },
                phase: "DEBT",
              });
              return;
            }
            set({
              players: s.players.map((x) =>
                x.id === p.id
                  ? { ...x, money: x.money - rent }
                  : x.id === owner.id
                    ? { ...x, money: x.money + rent }
                    : x,
              ),
              phase: "MANAGEMENT",
            });
            recordTransaction({
              from: p.id,
              to: owner.id,
              amount: rent,
              reason: localized(
                `שכירות – ${space.name.he}`,
                `Rent – ${space.name.en}`,
              ),
              propertyId: space.id,
            });
            return;
          }
          if (space.type === "tax") {
            const amt = space.tax ?? 0;
            if (p.money < amt) {
              set({
                debt: { amount: amt, reason: space.name.en },
                phase: "DEBT",
              });
              return;
            }
            set({
              players: s.players.map((x) =>
                x.id === p.id ? { ...x, money: x.money - amt } : x,
              ),
              freeParkingPot: s.settings.freeParkingJackpot
                ? s.freeParkingPot + amt
                : s.freeParkingPot,
              phase: "MANAGEMENT",
            });
            recordTransaction({
              from: p.id,
              to: "BANK",
              amount: amt,
              reason: localized(space.name.he, space.name.en),
              propertyId: space.id,
            });
            return;
          }
          if (
            space.type === "free" &&
            s.settings.freeParkingJackpot &&
            s.freeParkingPot > 0
          ) {
            const pot = s.freeParkingPot;
            set({
              players: s.players.map((x) =>
                x.id === p.id ? { ...x, money: x.money + pot } : x,
              ),
              freeParkingPot: 0,
              phase: "MANAGEMENT",
            });
            recordTransaction({
              from: "BANK",
              to: p.id,
              amount: pot,
              reason: UX.jackpot,
              propertyId: space.id,
            });
            return;
          }
          if (space.type === "go-jail") {
            set({
              players: s.players.map((x) =>
                x.id === p.id
                  ? { ...x, position: 10, inJail: true, jailTurns: 0 }
                  : x,
              ),
              lastRollWasDouble: false,
              consecutiveDoubles: 0,
              phase: "MANAGEMENT",
            });
            get().addLog(localized(`${p.name} נכנס ישר לפקק`, `${p.name} went straight into traffic`));
            return;
          }
          if (space.type === "mazal" || space.type === "good") {
            const deck = space.type === "mazal" ? mazalCards : goodCards;
            const card = deck[Math.floor(Math.random() * deck.length)];
            let ps = [...s.players];
            let ownership = { ...s.ownership };
            let needsLanding = false;
            let debt: Debt | undefined;
            const cardTransactions: Omit<Transaction, "id">[] = [];
            const e = card.effect;
            if (e.type === "money") {
              if (e.amount < 0 && p.money < Math.abs(e.amount))
                debt = { amount: Math.abs(e.amount), reason: card.text.en };
              else
                ps = ps.map((x) =>
                  x.id === p.id ? { ...x, money: x.money + e.amount } : x,
                );
              if (!debt && e.amount !== 0)
                cardTransactions.push({
                  from: e.amount > 0 ? "BANK" : p.id,
                  to: e.amount > 0 ? p.id : "BANK",
                  amount: Math.abs(e.amount),
                  reason: card.text,
                });
            } else if (e.type === "each") {
              const others = ps.filter((x) => x.id !== p.id && !x.bankrupt);
              const total = Math.abs(e.amount) * others.length;
              if (e.amount < 0) {
                if (p.money < total)
                  debt = { amount: total, reason: card.text.en };
                else {
                  ps = ps.map((x) =>
                    x.id === p.id
                      ? { ...x, money: x.money - total }
                      : x.id !== p.id && !x.bankrupt
                        ? { ...x, money: x.money + Math.abs(e.amount) }
                        : x,
                  );
                  for (const other of others)
                    cardTransactions.push({
                      from: p.id,
                      to: other.id,
                      amount: Math.abs(e.amount),
                      reason: card.text,
                    });
                }
              } else {
                const collectible = others.reduce(
                  (a, x) => a + Math.min(x.money, e.amount),
                  0,
                );
                ps = ps.map((x) =>
                  x.id === p.id
                    ? { ...x, money: x.money + collectible }
                    : x.id !== p.id && !x.bankrupt
                      ? { ...x, money: Math.max(0, x.money - e.amount) }
                      : x,
                );
                for (const other of others) {
                  const amount = Math.min(other.money, e.amount);
                  if (amount > 0)
                    cardTransactions.push({
                      from: other.id,
                      to: p.id,
                      amount,
                      reason: card.text,
                    });
                }
              }
            } else if (e.type === "move") {
              const old = p.position;
              const salary =
                e.collectStart && (e.to < old || e.to === 0) ? START_SALARY : 0;
              ps = ps.map((x) =>
                x.id === p.id
                  ? { ...x, position: e.to, money: x.money + salary }
                  : x,
              );
              needsLanding = true;
              if (salary > 0)
                cardTransactions.push({
                  from: "BANK",
                  to: p.id,
                  amount: salary,
                  reason: UX.goSalary,
                });
            } else if (e.type === "back") {
              ps = ps.map((x) =>
                x.id === p.id
                  ? { ...x, position: (x.position - e.spaces + 40) % 40 }
                  : x,
              );
              needsLanding = true;
            } else if (e.type === "jail") {
              ps = ps.map((x) =>
                x.id === p.id
                  ? { ...x, position: 10, inJail: true, jailTurns: 0 }
                  : x,
              );
            } else if (e.type === "getout") {
              ps = ps.map((x) =>
                x.id === p.id ? { ...x, getOutCards: x.getOutCards + 1 } : x,
              );
            } else if (e.type === "repairs") {
              const amount = Object.entries(ownership).reduce(
                (sum, [id, o]) =>
                  o.ownerId === p.id
                    ? sum + (o.houses >= 5 ? e.hotel : o.houses * e.house)
                    : sum,
                0,
              );
              if (p.money < amount) debt = { amount, reason: card.text.en };
              else {
                ps = ps.map((x) =>
                  x.id === p.id ? { ...x, money: x.money - amount } : x,
                );
                if (amount > 0)
                  cardTransactions.push({
                    from: p.id,
                    to: "BANK",
                    amount,
                    reason: card.text,
                  });
              }
            }
            set({
              players: ps,
              ownership,
              currentCard: card,
              cardNeedsLanding: needsLanding,
              debt,
              phase: debt ? "DEBT" : "MANAGEMENT",
            });
            get().addLog(localized(`${p.name} שלף קלף: ${card.text.he}`, `${p.name} drew a card: ${card.text.en}`));
            for (const transaction of cardTransactions)
              recordTransaction(transaction);
            return;
          }
          set({ phase: "MANAGEMENT" });
        },
        buyPendingProperty: () => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const space = board.find((x) => x.id === s.pendingSpaceId);
          if (!space || !space.price || p.money < space.price) return;
          set({
            players: s.players.map((x) =>
              x.id === p.id ? { ...x, money: x.money - space.price! } : x,
            ),
            ownership: {
              ...s.ownership,
              [space.id]: { ownerId: p.id, mortgaged: false, houses: 0 },
            },
            pendingSpaceId: undefined,
            phase: "MANAGEMENT",
          });
          recordTransaction({
            from: p.id,
            to: "BANK",
            amount: space.price,
            reason: localized(
              `רכישת נכס – ${space.name.he}`,
              `Property purchase – ${space.name.en}`,
            ),
            propertyId: space.id,
          });
        },
        startAuction: () => {
          const s = get();
          if (!s.pendingSpaceId) return;
          set({
            auction: { spaceId: s.pendingSpaceId, highestBid: 0, passed: [] },
            pendingSpaceId: undefined,
            phase: "AUCTION",
          });
        },
        bidAuction: (playerId, amount) => {
          const s = get();
          const a = s.auction;
          const p = s.players.find((x) => x.id === playerId);
          if (
            !a ||
            !p ||
            p.bankrupt ||
            a.passed.includes(playerId) ||
            amount <= a.highestBid ||
            amount > p.money
          )
            return;
          set({
            auction: { ...a, highestBid: amount, highestBidderId: playerId },
          });
        },
        passAuction: (playerId) => {
          const s = get();
          if (!s.auction) return;
          set({
            auction: {
              ...s.auction,
              passed: [...new Set([...s.auction.passed, playerId])],
            },
          });
        },
        finishAuction: () => {
          const s = get();
          const a = s.auction;
          if (!a) return;
          const sp = board.find((x) => x.id === a.spaceId);
          const w = s.players.find((x) => x.id === a.highestBidderId);
          if (sp && w && a.highestBid > 0) {
            set({
              players: s.players.map((x) =>
                x.id === w.id ? { ...x, money: x.money - a.highestBid } : x,
              ),
              ownership: {
                ...s.ownership,
                [sp.id]: { ownerId: w.id, mortgaged: false, houses: 0 },
              },
              auction: undefined,
              phase: "MANAGEMENT",
            });
            get().addLog(
              localized(`${w.name} זכה במכרז על ${sp.name.he} תמורת ${a.highestBid} זוזים`, `${w.name} won the auction for ${sp.name.en} for ${a.highestBid} Zuzim`),
            );
            recordTransaction({
              from: w.id,
              to: "BANK",
              amount: a.highestBid,
              reason: localized(
                `זכייה במכרז – ${sp.name.he}`,
                `Auction win – ${sp.name.en}`,
              ),
              propertyId: sp.id,
            });
          } else set({ auction: undefined, phase: "MANAGEMENT" });
        },
        dismissCard: () => {
          const s = get();
          const needs = s.cardNeedsLanding;
          set({ currentCard: undefined, cardNeedsLanding: false });
          if (needs && !s.debt) {
            set({ phase: "RESOLVING" });
            setTimeout(() => get().resolveCurrentSpace(), 0);
          }
        },
        payJailFine: () => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          if (!p.inJail || p.money < JAIL_FINE) return;
          set({
            players: s.players.map((x) =>
              x.id === p.id
                ? {
                    ...x,
                    money: x.money - JAIL_FINE,
                    inJail: false,
                    jailTurns: 0,
                  }
                : x,
            ),
            phase: "WAITING_FOR_ROLL",
          });
          recordTransaction({
            from: p.id,
            to: "BANK",
            amount: JAIL_FINE,
            reason: UX.jailFine,
          });
        },
        useGetOutCard: () => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          if (!p.inJail || p.getOutCards < 1) return;
          set({
            players: s.players.map((x) =>
              x.id === p.id
                ? {
                    ...x,
                    getOutCards: x.getOutCards - 1,
                    inJail: false,
                    jailTurns: 0,
                  }
                : x,
            ),
            phase: "WAITING_FOR_ROLL",
          });
        },
        mortgage: (spaceId) => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const sp = board.find((x) => x.id === spaceId);
          if (!sp || !sp.mortgage || !canMortgage(p.id, sp, s.ownership))
            return;
          set({
            ownership: {
              ...s.ownership,
              [spaceId]: { ...s.ownership[spaceId], mortgaged: true },
            },
            players: s.players.map((x) =>
              x.id === p.id ? { ...x, money: x.money + sp.mortgage! } : x,
            ),
          });
          recordTransaction({
            from: "BANK",
            to: p.id,
            amount: sp.mortgage,
            reason: localized(
              `משכון – ${sp.name.he}`,
              `Mortgage – ${sp.name.en}`,
            ),
            propertyId: sp.id,
          });
        },
        unmortgage: (spaceId) => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const sp = board.find((x) => x.id === spaceId);
          const o = s.ownership[spaceId];
          if (!sp || !o || o.ownerId !== p.id || !o.mortgaged || !sp.mortgage)
            return;
          const cost = Math.ceil(sp.mortgage * 1.1);
          if (p.money < cost) return;
          set({
            ownership: {
              ...s.ownership,
              [spaceId]: { ...o, mortgaged: false },
            },
            players: s.players.map((x) =>
              x.id === p.id ? { ...x, money: x.money - cost } : x,
            ),
          });
          recordTransaction({
            from: p.id,
            to: "BANK",
            amount: cost,
            reason: localized(
              `פדיון משכון – ${sp.name.he}`,
              `Unmortgage – ${sp.name.en}`,
            ),
            propertyId: sp.id,
          });
        },
        build: (spaceId) => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const sp = board.find((x) => x.id === spaceId);
          if (
            !sp ||
            !sp.buildingCost ||
            p.money < sp.buildingCost ||
            !canBuild(p.id, sp, s.ownership)
          )
            return;
          set({
            ownership: {
              ...s.ownership,
              [spaceId]: {
                ...s.ownership[spaceId],
                houses: s.ownership[spaceId].houses + 1,
              },
            },
            players: s.players.map((x) =>
              x.id === p.id ? { ...x, money: x.money - sp.buildingCost! } : x,
            ),
          });
          recordTransaction({
            from: p.id,
            to: "BANK",
            amount: sp.buildingCost,
            reason: localized(
              `בניית בית – ${sp.name.he}`,
              `Build house – ${sp.name.en}`,
            ),
            propertyId: sp.id,
          });
        },
        sellBuilding: (spaceId) => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const sp = board.find((x) => x.id === spaceId);
          if (
            !sp ||
            !sp.buildingCost ||
            !canSellBuilding(p.id, sp, s.ownership)
          )
            return;
          set({
            ownership: {
              ...s.ownership,
              [spaceId]: {
                ...s.ownership[spaceId],
                houses: s.ownership[spaceId].houses - 1,
              },
            },
            players: s.players.map((x) =>
              x.id === p.id
                ? { ...x, money: x.money + Math.floor(sp.buildingCost! / 2) }
                : x,
            ),
          });
          recordTransaction({
            from: "BANK",
            to: p.id,
            amount: Math.floor(sp.buildingCost / 2),
            reason: localized(
              `מכירת בית – ${sp.name.he}`,
              `Sell house – ${sp.name.en}`,
            ),
            propertyId: sp.id,
          });
        },
        setSoundEnabled: (sound) =>
          set((s) => ({ settings: { ...s.settings, sound } })),
        settleDebt: () => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const d = s.debt;
          if (!d || p.money < d.amount) return;
          set({
            players: s.players.map((x) =>
              x.id === p.id
                ? { ...x, money: x.money - d.amount }
                : x.id === d.creditorId
                  ? { ...x, money: x.money + d.amount }
                  : x,
            ),
            debt: undefined,
            phase: "MANAGEMENT",
          });
          const debtSpace = board.find(
            (space) =>
              d.reason === `Rent: ${space.name.en}` ||
              d.reason === space.name.en,
          );
          const debtCard = [...goodCards, ...mazalCards].find(
            (card) => card.text.en === d.reason,
          );
          const reason = debtSpace
            ? localized(
                `שכירות – ${debtSpace.name.he}`,
                `Rent – ${debtSpace.name.en}`,
              )
            : (debtCard?.text ??
              (d.reason === "Traffic release"
                ? UX.jailFine
                : localized(d.reason, d.reason)));
          recordTransaction({
            from: p.id,
            to: d.creditorId ?? "BANK",
            amount: d.amount,
            reason,
            propertyId: debtSpace?.id,
          });
        },
        declareBankruptcy: () => {
          const s = get();
          const p = s.players[s.activePlayerIndex];
          const d = s.debt;
          if (!d) return;
          let own = { ...s.ownership };
          for (const [id, o] of Object.entries(own)) {
            if (o.ownerId === p.id) {
              if (d.creditorId) own[id] = { ...o, ownerId: d.creditorId };
              else delete own[id];
            }
          }
          let ps = s.players.map((x) =>
            x.id === p.id
              ? { ...x, money: 0, bankrupt: true }
              : x.id === d.creditorId
                ? { ...x, money: x.money + p.money }
                : x,
          );
          if (p.money > 0)
            recordTransaction({
              from: p.id,
              to: d.creditorId ?? "BANK",
              amount: p.money,
              reason: localized(
                "יתרת כסף בעת פשיטת רגל",
                "Remaining cash in bankruptcy",
              ),
            });
          const alive = activePlayers(ps);
          if (alive.length === 1) {
            set({
              players: ps,
              ownership: own,
              debt: undefined,
              winnerId: alive[0].id,
              phase: "GAME_OVER",
            });
            return;
          }
          let idx = s.activePlayerIndex;
          do {
            idx = (idx + 1) % ps.length;
          } while (ps[idx].bankrupt);
          set({
            players: ps,
            ownership: own,
            debt: undefined,
            activePlayerIndex: idx,
            phase: "WAITING_FOR_ROLL",
            consecutiveDoubles: 0,
            lastRollWasDouble: false,
            turnNumber: s.turnNumber + 1,
          });
          get().addLog(localized(`${p.name} פשט רגל`, `${p.name} went bankrupt`));
        },
        executeTrade: (draft) => {
          const state = get();
          const player = state.players[state.activePlayerIndex];
          if (!player || player.isComputer || state.pendingTrade) return false;
          const target = state.players.find(p => p.id === draft.targetId);
          if (!target || target.isComputer) return false;
          return applyTrade(player.id, draft);
        },
        proposeTrade: (draft) => {
          const state = get();
          const from = state.players[state.activePlayerIndex];
          const to = state.players.find(p => p.id === draft.targetId);
          if (!from || !to || state.phase !== "MANAGEMENT" || state.debt || state.currentCard ||
              state.pendingTrade || validateTrade(state, from.id, draft)) return "invalid";
          if (from.isComputer) {
            if (state.tradeAttemptedTurn?.[from.id] === state.turnNumber) return "invalid";
            set({
              tradeAttemptedTurn: { ...(state.tradeAttemptedTurn ?? {}), [from.id]: state.turnNumber },
              tradeCooldowns: { ...(state.tradeCooldowns ?? {}), [tradeKey(from.id, draft)]: state.turnNumber },
            });
          }
          if (to.isComputer) {
            if (!computerAcceptsTrade(get(), from.id, draft)) {
              get().addLog(localized(`${to.name} דחה עסקה שהציע ${from.name}`, `${to.name} declined a trade offered by ${from.name}`));
              return "declined";
            }
            return applyTrade(from.id, draft) ? "accepted" : "invalid";
          }
          if (from.isComputer) {
            set({ pendingTrade: { initiatorId: from.id, draft } });
            get().addLog(localized(`${from.name} הציע עסקה ל${to.name}`, `${from.name} proposed a trade to ${to.name}`));
            return "pending";
          }
          return applyTrade(from.id, draft) ? "accepted" : "invalid";
        },
        respondToTrade: (accept) => {
          const state = get();
          const pending = state.pendingTrade;
          if (!pending) return false;
          set({ pendingTrade: undefined });
          if (!accept) {
            get().addLog(localized(`${state.players.find(p => p.id === pending.draft.targetId)?.name ?? "שחקן"} דחה את העסקה`, `${state.players.find(p => p.id === pending.draft.targetId)?.name ?? "Player"} declined a trade`));
            return true;
          }
          return applyTrade(pending.initiatorId, pending.draft);
        },
        endTurn: () => {
          const s = get();
          if (!["MANAGEMENT"].includes(s.phase) || s.currentCard || s.debt || s.pendingTrade)
            return;
          const p = s.players[s.activePlayerIndex];
          if (s.lastRollWasDouble && !p.inJail) {
            set({ phase: "WAITING_FOR_ROLL", lastRollWasDouble: false });
            return;
          }
          let idx = s.activePlayerIndex;
          do {
            idx = (idx + 1) % s.players.length;
          } while (s.players[idx].bankrupt);
          set({
            activePlayerIndex: idx,
            phase: "WAITING_FOR_ROLL",
            consecutiveDoubles: 0,
            lastRollWasDouble: false,
            turnNumber: s.turnNumber + 1,
          });
        },
      };
    },
    {
      name: "mitzvah-land-save",
      partialize: (s) => {
        const { transactionQueue: _transactionQueue, ...persisted } = s;
        return persisted as GameState;
      },
    },
  ),
);
