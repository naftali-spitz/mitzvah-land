import { board } from '../data/board';
import { groupSpaces } from './rules';
import type { Ownership, Player, Space, TradeDraft } from '../types/game';

export interface TradeSnapshot {
  players: Player[];
  ownership: Record<string, Ownership>;
  turnNumber: number;
  tradeCooldowns?: Record<string, number>;
}

export interface PendingTrade {
  initiatorId: string;
  draft: TradeDraft;
}

type Difficulty = 'easy' | 'medium' | 'hard';
const level = (player: Player): Difficulty => player.aiDifficulty ?? 'medium';
const reserve = (player: Player): number => ({ easy: 450, medium: 280, hard: 140 })[level(player)];

export function tradableSpace(id: string | undefined, ownerId: string, own: Record<string, Ownership>): Space | undefined {
  if (!id) return undefined;
  const space = board.find(s => s.id === id);
  const o = own[id];
  if (!space || !space.price || !o || o.ownerId !== ownerId || o.mortgaged || o.houses > 0) return;
  // A color set cannot be traded while ANY lot in that set has buildings.
  if (space.type === 'property' && space.group &&
      groupSpaces(space.group).some(s => (own[s.id]?.houses ?? 0) > 0)) return;
  return space;
}

export function validateTrade(s: TradeSnapshot, fromId: string, d: TradeDraft): string | undefined {
  const from = s.players.find(p => p.id === fromId && !p.bankrupt);
  const to = s.players.find(p => p.id === d.targetId && !p.bankrupt);
  if (!from || !to || from.id === to.id) return 'Invalid trade partner';
  if (![d.offerCash, d.requestCash].every(n => Number.isSafeInteger(n) && n >= 0)) return 'Invalid cash amount';
  if (d.offerCash > from.money || d.requestCash > to.money) return 'Not enough cash';
  if (!d.offerPropertyId && !d.requestPropertyId && !d.offerCash && !d.requestCash) return 'Empty trade';
  if (d.offerPropertyId && !tradableSpace(d.offerPropertyId, from.id, s.ownership)) return 'Offered property cannot be traded';
  if (d.requestPropertyId && !tradableSpace(d.requestPropertyId, to.id, s.ownership)) return 'Requested property cannot be traded';
  if (d.offerPropertyId && d.offerPropertyId === d.requestPropertyId) return 'Invalid property exchange';
  return;
}

export function afterTradeOwnership(s: TradeSnapshot, fromId: string, d: TradeDraft): Record<string, Ownership> {
  const result = { ...s.ownership };
  if (d.offerPropertyId) result[d.offerPropertyId] = { ...result[d.offerPropertyId], ownerId: d.targetId };
  if (d.requestPropertyId) result[d.requestPropertyId] = { ...result[d.requestPropertyId], ownerId: fromId };
  return result;
}

function portfolio(player: Player, own: Record<string, Ownership>): number {
  let total = 0;
  for (const space of board) {
    const o = own[space.id];
    if (o?.ownerId === player.id) total += space.price ?? 0;
  }
  const groups = new Set(board.filter(s => s.group).map(s => s.group!));
  for (const group of groups) {
    const properties = groupSpaces(group);
    const count = properties.filter(s => own[s.id]?.ownerId === player.id).length;
    const price = properties.reduce((sum, sp) => sum + (sp.price ?? 0), 0);
    const strategic = ({ easy: 0.2, medium: 0.35, hard: 0.42 })[level(player)];
    if (count) total += price * strategic * (count / properties.length) ** 2;
    if (count === properties.length) total += price * ({ easy: 0.52, medium: 0.85, hard: 1.05 })[level(player)];
  }
  return total;
}

export function tradeBenefit(s: TradeSnapshot, fromId: string, d: TradeDraft, playerId: string): number {
  const player = s.players.find(p => p.id === playerId);
  if (!player) return -Infinity;
  const after = afterTradeOwnership(s, fromId, d);
  const cash = playerId === fromId
    ? d.requestCash - d.offerCash
    : d.offerCash - d.requestCash;
  let benefit = portfolio(player, after) - portfolio(player, s.ownership) + cash;
  const otherId = playerId === fromId ? d.targetId : fromId;
  const other = s.players.find(p => p.id === otherId);
  // Difficult opponents account for the threat of creating a rival monopoly.
  if (other) {
    const groups = new Set(board.filter(sp => sp.group).map(sp => sp.group!));
    for (const group of groups) {
      const spaces = groupSpaces(group);
      const before = spaces.every(sp => s.ownership[sp.id]?.ownerId === otherId);
      const now = spaces.every(sp => after[sp.id]?.ownerId === otherId);
      if (!before && now) {
        const price = spaces.reduce((sum, sp) => sum + (sp.price ?? 0), 0);
        benefit -= price * ({ easy: 0.05, medium: 0.12, hard: 0.22 })[level(player)];
      }
    }
  }
  return benefit;
}

export function computerAcceptsTrade(s: TradeSnapshot, fromId: string, d: TradeDraft): boolean {
  if (validateTrade(s, fromId, d)) return false;
  const computer = s.players.find(p => p.id === d.targetId);
  if (!computer?.isComputer) return false;
  const benefit = tradeBenefit(s, fromId, d, computer.id);
  const tolerance = ({ easy: -35, medium: 0, hard: 15 })[level(computer)];
  return benefit >= tolerance && computer.money - d.requestCash + d.offerCash >= 0;
}

export function tradeKey(fromId: string, d: TradeDraft): string {
  return [fromId, d.targetId, d.requestPropertyId ?? '', d.offerPropertyId ?? ''].join(':');
}

export function proposeComputerTrade(s: TradeSnapshot, botId: string): TradeDraft | undefined {
  const bot = s.players.find(p => p.id === botId && p.isComputer && !p.bankrupt);
  if (!bot) return;
  const ownProperties = board.filter(sp => tradableSpace(sp.id, botId, s.ownership));
  const groups = new Set(ownProperties.filter(sp => sp.group).map(sp => sp.group!));
  const candidates: { draft: TradeDraft; score: number }[] = [];
  const cooldown = s.tradeCooldowns ?? {};
  const otherPlayers = s.players.filter(p => !p.bankrupt && p.id !== botId);
  for (const group of groups) {
    const spaces = groupSpaces(group);
    const ownedCount = spaces.filter(sp => s.ownership[sp.id]?.ownerId === botId).length;
    if (!ownedCount || ownedCount === spaces.length) continue;
    for (const requested of spaces) {
      const target = otherPlayers.find(p => s.ownership[requested.id]?.ownerId === p.id);
      if (!target || !tradableSpace(requested.id, target.id, s.ownership)) continue;
      const choices: (Space | undefined)[] = [undefined, ...ownProperties.filter(sp => sp.id !== requested.id && sp.group !== group)];
      for (const offer of choices) {
        // Cash offers and exchanges are both considered; preserve money for building.
        const price = requested.price ?? 0;
        const cashAmounts = offer ? [0, Math.round(price * .3), Math.round(price * .65)]
          : [Math.round(price * 1.05), Math.round(price * 1.25), Math.round(price * 1.55), Math.round(price * 1.85)];
        for (const rawCash of cashAmounts) {
          const cash = Math.ceil(rawCash / 10) * 10;
          if (cash + reserve(bot) > bot.money) continue;
          const draft: TradeDraft = { targetId: target.id, offerPropertyId: offer?.id, requestPropertyId: requested.id, offerCash: cash, requestCash: 0 };
          if (validateTrade(s, botId, draft)) continue;
          if (s.turnNumber - (cooldown[tradeKey(botId, draft)] ?? -1000) < otherPlayers.length * 3) continue;
          const benefit = tradeBenefit(s, botId, draft, bot.id);
          if (benefit < (level(bot) === 'easy' ? 5 : 20)) continue;
          if (target.isComputer && !computerAcceptsTrade(s, botId, draft)) continue;
          // Prefer deals that complete a set, then smaller payments, while still helping the seller.
          const finishesSet = ownedCount === spaces.length - 1 ? 110 : 0;
          const score = benefit + finishesSet + (target.isComputer ? 35 : 0) - cash * 0.02;
          candidates.push({ draft, score });
        }
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.draft;
}
