import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

const seats = [
  { name: 'Human', token: '🍞', color: '#111', isComputer: false },
  { name: 'Computer', token: '🤖', color: '#222', isComputer: true, aiDifficulty: 'medium' as const },
];
const own = (ownerId: string) => ({ ownerId, mortgaged: false, houses: 0 });
beforeEach(() => {
  localStorage.clear();
  useGameStore.getState().resetGame();
  useGameStore.getState().newGame(seats);
});

describe('computer trading end to end', () => {
  it('human can sell cash for a bot property if the computer accepts', () => {
    useGameStore.setState({ phase: 'MANAGEMENT', ownership: { 'bnei-brak': own('p2') } });
    const result = useGameStore.getState().proposeTrade({
      targetId: 'p2', offerCash: 110, requestCash: 0, requestPropertyId: 'bnei-brak',
    });
    expect(result).toBe('accepted');
    const s = useGameStore.getState();
    expect(s.ownership['bnei-brak'].ownerId).toBe('p1');
    expect(s.players[0].money).toBe(1390);
    expect(s.players[1].money).toBe(1610);
  });
  it('computer declines a bad deal without changing ownership', () => {
    useGameStore.setState({ phase: 'MANAGEMENT', ownership: { 'bnei-brak': own('p2') } });
    const result = useGameStore.getState().proposeTrade({ targetId: 'p2', offerCash: 10, requestCash: 0, requestPropertyId: 'bnei-brak' });
    expect(result).toBe('declined');
    expect(useGameStore.getState().ownership['bnei-brak'].ownerId).toBe('p2');
  });
  it('human can accept an AI-initiated deal and the bot must wait for a response', () => {
    useGameStore.setState({ phase: 'MANAGEMENT', activePlayerIndex: 1, ownership: { 'bnei-brak': own('p1') } });
    const result = useGameStore.getState().proposeTrade({ targetId: 'p1', offerCash: 110, requestCash: 0, requestPropertyId: 'bnei-brak' });
    expect(result).toBe('pending');
    expect(useGameStore.getState().pendingTrade?.initiatorId).toBe('p2');
    useGameStore.getState().endTurn();
    expect(useGameStore.getState().activePlayerIndex).toBe(1);
    expect(useGameStore.getState().respondToTrade(true)).toBe(true);
    expect(useGameStore.getState().pendingTrade).toBeUndefined();
    expect(useGameStore.getState().ownership['bnei-brak'].ownerId).toBe('p2');
    expect(useGameStore.getState().players[1].money).toBe(1390);
  });
  it('declining a computer offer does not move property or cash', () => {
    useGameStore.setState({ phase: 'MANAGEMENT', activePlayerIndex: 1, ownership: { 'bnei-brak': own('p1') } });
    useGameStore.getState().proposeTrade({ targetId: 'p1', offerCash: 110, requestCash: 0, requestPropertyId: 'bnei-brak' });
    expect(useGameStore.getState().respondToTrade(false)).toBe(true);
    expect(useGameStore.getState().ownership['bnei-brak'].ownerId).toBe('p1');
    expect(useGameStore.getState().players[1].money).toBe(1500);
  });
  it('refuses a bot trade that transfers a property from a group with houses', () => {
    useGameStore.setState({ phase: 'MANAGEMENT', ownership: { 'bnei-brak': own('p2'), 'mea-shearim': { ...own('p2'), houses: 1 } } });
    const result = useGameStore.getState().proposeTrade({ targetId: 'p2', offerCash: 160, requestCash: 0, requestPropertyId: 'bnei-brak' });
    expect(result).toBe('invalid');
    expect(useGameStore.getState().players.map(p => p.money)).toEqual([1500, 1500]);
  });
});
