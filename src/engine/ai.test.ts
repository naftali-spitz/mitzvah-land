import { describe, expect, it } from 'vitest';
import { chooseAiAction, type AiSnapshot } from './ai';
import type { Player } from '../types/game';

const bot = (level: 'easy' | 'medium' | 'hard', money = 1500): Player => ({
  id: 'p1', name: 'Bot', token: '🤖', color: '#333', money, position: 0,
  inJail: false, jailTurns: 0, bankrupt: false, getOutCards: 0,
  isComputer: true, aiDifficulty: level,
});
const human: Player = { ...bot('medium'), id: 'p2', name: 'Human', isComputer: false };
const snapshot = (level: 'easy' | 'medium' | 'hard', phase: AiSnapshot['phase']): AiSnapshot => ({
  phase, players: [bot(level), human], activePlayerIndex: 0, ownership: {},
});

describe('computer opponents', () => {
  it('does not play a human turn', () => {
    const game = snapshot('hard', 'WAITING_FOR_ROLL');
    game.activePlayerIndex = 1;
    expect(chooseAiAction(game)).toBeNull();
  });
  it('rolls on its turn', () => {
    expect(chooseAiAction(snapshot('medium', 'WAITING_FOR_ROLL'))).toEqual({ type: 'roll' });
  });
  it('avoids purchases that would leave an easy bot without reserves', () => {
    const game = snapshot('easy', 'PROPERTY_DECISION');
    game.players[0].money = 400;
    game.pendingSpaceId = 'bnei-brak';
    expect(chooseAiAction(game)).toEqual({ type: 'auction' });
  });
  it('can exit an auction when nobody bids', () => {
    const game = snapshot('medium', 'AUCTION');
    game.auction = { spaceId: 'bnei-brak', highestBid: 0, passed: ['p1', 'p2'] };
    expect(chooseAiAction(game)).toEqual({ type: 'finish-auction' });
  });
  it('raises money by mortgaging a free asset before going bankrupt', () => {
    const game = snapshot('medium', 'DEBT');
    game.players[0].money = 20;
    game.debt = { amount: 200, reason: 'Rent' };
    game.ownership = { 'bnei-brak': { ownerId: 'p1', houses: 0, mortgaged: false } };
    expect(chooseAiAction(game)).toEqual({ type: 'mortgage', spaceId: 'bnei-brak' });
  });
});
