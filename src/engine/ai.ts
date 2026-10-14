import { board } from '../data/board';
import { canBuild, canMortgage, canSellBuilding, groupSpaces, ownsGroup } from './rules';
import type { AuctionState, Card, Debt, GamePhase, Ownership, Player, Space } from '../types/game';

export type AiAction =
  | { type: 'roll' | 'pay-jail' | 'use-card' | 'buy' | 'auction' | 'dismiss-card' | 'settle' | 'bankrupt' | 'end' | 'finish-auction' }
  | { type: 'bid' | 'pass'; playerId: string; amount?: number }
  | { type: 'mortgage' | 'sell-building' | 'build' | 'unmortgage'; spaceId: string };

export interface AiSnapshot {
  phase: GamePhase;
  activePlayerIndex: number;
  players: Player[];
  ownership: Record<string, Ownership>;
  pendingSpaceId?: string;
  currentCard?: Card;
  debt?: Debt;
  auction?: AuctionState;
}

type Difficulty = NonNullable<Player['aiDifficulty']>;
const difficultyOf = (p: Player): Difficulty => p.aiDifficulty ?? 'medium';
const reserves: Record<Difficulty, number> = { easy: 500, medium: 290, hard: 140 };

function groupImportance(space: Space, player: Player, state: AiSnapshot): number {
  if (space.type !== 'property' || !space.group) return 1;
  const set = groupSpaces(space.group);
  const ours = set.filter(s => state.ownership[s.id]?.ownerId === player.id).length;
  const rivals = set.filter(s => state.ownership[s.id] && state.ownership[s.id].ownerId !== player.id).length;
  if (ours === set.length - 1 && rivals === 0) return 1.65;
  if (rivals === 0 && ours > 0) return 1.2;
  if (rivals > 0 && difficultyOf(player) === 'hard') return 0.87;
  return 1;
}

function maximumBid(player: Player, space: Space, state: AiSnapshot): number {
  const level = difficultyOf(player);
  const factor = { easy: 0.55, medium: 0.9, hard: 1.1 }[level];
  const strategic = level === 'easy' ? 1 : groupImportance(space, player, state);
  const value = Math.round((space.price ?? 100) * factor * strategic);
  return Math.max(0, Math.min(player.money - reserves[level], value));
}

function chooseAuctionAction(state: AiSnapshot): AiAction | null {
  const auction = state.auction;
  if (!auction) return null;
  const alive = state.players.filter(p => !p.bankrupt);
  const lot = board.find(space => space.id === auction.spaceId);
  const nextBot = alive.find(p => p.isComputer && p.id !== auction.highestBidderId && !auction.passed.includes(p.id));
  if (nextBot) {
    const minimum = auction.highestBid + 10;
    const cap = lot ? maximumBid(nextBot, lot, state) : 0;
    if (cap >= minimum) {
      const step = difficultyOf(nextBot) === 'hard' && cap >= minimum + 40 ? 50 : 10;
      return { type: 'bid', playerId: nextBot.id, amount: Math.min(cap, auction.highestBid + step) };
    }
    return { type: 'pass', playerId: nextBot.id };
  }
  const resolved = auction.highestBidderId
    ? alive.every(p => p.id === auction.highestBidderId || auction.passed.includes(p.id))
    : alive.every(p => auction.passed.includes(p.id));
  return resolved ? { type: 'finish-auction' } : null;
}

export function chooseAiAction(state: AiSnapshot): AiAction | null {
  if (state.phase === 'AUCTION') return chooseAuctionAction(state);
  const player = state.players[state.activePlayerIndex];
  if (!player?.isComputer || player.bankrupt || state.phase === 'GAME_OVER') return null;
  const level = difficultyOf(player);
  const reserve = reserves[level];

  if (state.currentCard) return { type: 'dismiss-card' };

  if (state.phase === 'DEBT' && state.debt) {
    if (player.money >= state.debt.amount) return { type: 'settle' };
    const available = board.filter(sp => canMortgage(player.id, sp, state.ownership));
    available.sort((a, b) => {
      const aScore = (a.mortgage ?? 0) - (ownsGroup(player.id, a.group, state.ownership) ? 1000 : 0);
      const bScore = (b.mortgage ?? 0) - (ownsGroup(player.id, b.group, state.ownership) ? 1000 : 0);
      return bScore - aScore;
    });
    if (available.length) return { type: 'mortgage', spaceId: available[0].id };
    const buildings = board.filter(sp => canSellBuilding(player.id, sp, state.ownership));
    buildings.sort((a, b) => (b.buildingCost ?? 0) - (a.buildingCost ?? 0));
    if (buildings.length) return { type: 'sell-building', spaceId: buildings[0].id };
    return { type: 'bankrupt' };
  }

  if (state.phase === 'WAITING_FOR_ROLL') {
    if (player.inJail) {
      if (player.getOutCards > 0) return { type: 'use-card' };
      if (level !== 'easy' && player.money >= reserve + 50) return { type: 'pay-jail' };
    }
    return { type: 'roll' };
  }

  if (state.phase === 'PROPERTY_DECISION') {
    const space = board.find(sp => sp.id === state.pendingSpaceId);
    if (!space?.price) return { type: 'auction' };
    const bonus = level === 'hard' ? groupImportance(space, player, state) : 1;
    const affordable = player.money >= space.price + (bonus > 1 ? Math.floor(reserve / 2) : reserve);
    return affordable ? { type: 'buy' } : { type: 'auction' };
  }

  if (state.phase === 'MANAGEMENT') {
    if (level !== 'easy') {
      const eligible = board.filter(sp => sp.buildingCost && canBuild(player.id, sp, state.ownership)
        && player.money >= sp.buildingCost + reserve + (level === 'medium' ? 100 : 0));
      eligible.sort((a, b) => {
        const yieldOf = (sp: Space) => {
          const h = state.ownership[sp.id]?.houses ?? 0;
          return ((sp.rents?.[h + 1] ?? 0) - (sp.rents?.[h] ?? 0)) / (sp.buildingCost ?? 1);
        };
        return yieldOf(b) - yieldOf(a);
      });
      if (eligible.length) return { type: 'build', spaceId: eligible[0].id };
      const mortgaged = board.find(sp => state.ownership[sp.id]?.ownerId === player.id
        && state.ownership[sp.id].mortgaged && sp.mortgage
        && player.money > Math.ceil(sp.mortgage * 1.1) + reserve);
      if (mortgaged) return { type: 'unmortgage', spaceId: mortgaged.id };
    }
    return { type: 'end' };
  }
  return null;
}
