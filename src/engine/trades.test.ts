import { describe, expect, it } from 'vitest';
import { afterTradeOwnership, computerAcceptsTrade, proposeComputerTrade, tradeBenefit, tradableSpace, validateTrade } from './trades';
import type { Player } from '../types/game';
const human: Player = { id: 'p1', name: 'Human', token: '🍞', color: '#111', money: 1500, position: 0, inJail: false, jailTurns: 0, bankrupt: false, getOutCards: 0 };
const bot: Player = { ...human, id: 'p2', name: 'Bot', isComputer: true, aiDifficulty: 'medium' };
const own = (ownerId: string) => ({ ownerId, mortgaged: false, houses: 0 });
describe('AI negotiations and trade rules', () => {
  it('accepts a reasonable cash offer from a human', () => {
    const state = { players: [human, bot], ownership: { 'bnei-brak': own('p2') }, turnNumber: 3 };
    const draft = { targetId: 'p2', requestPropertyId: 'bnei-brak', offerCash: 110, requestCash: 0 };
    expect(validateTrade(state, 'p1', draft)).toBeUndefined();
    expect(computerAcceptsTrade(state, 'p1', draft)).toBe(true);
    expect(afterTradeOwnership(state, 'p1', draft)['bnei-brak'].ownerId).toBe('p1');
  });
  it('rejects unfair, negative, or unaffordable offers', () => {
    const state = { players: [human, bot], ownership: { 'bnei-brak': own('p2') }, turnNumber: 3 };
    expect(computerAcceptsTrade(state, 'p1', { targetId: 'p2', requestPropertyId: 'bnei-brak', offerCash: 1, requestCash: 0 })).toBe(false);
    expect(validateTrade(state, 'p1', { targetId: 'p2', offerCash: -30, requestCash: 0 })).toBeDefined();
    expect(validateTrade(state, 'p1', { targetId: 'p2', offerCash: 999999, requestCash: 0 })).toBeDefined();
  });
  it('blocks selling a property if any building exists in its color group', () => {
    const state = { players: [human, bot], ownership: { 'bnei-brak': own('p2'), 'mea-shearim': { ...own('p2'), houses: 1 } }, turnNumber: 3 };
    expect(tradableSpace('bnei-brak', 'p2', state.ownership)).toBeUndefined();
    expect(validateTrade(state, 'p1', { targetId: 'p2', requestPropertyId: 'bnei-brak', offerCash: 150, requestCash: 0 })).toBeDefined();
  });
  it('proposes an exchange that completes color groups for both computer players', () => {
    const rival: Player = { ...bot, id: 'p3', name: 'Rival', aiDifficulty: 'hard' };
    const state = {
      players: [bot, rival],
      ownership: {
        kinneret: own('p2'), akko: own('p2'), hebron: own('p2'),
        caesarea: own('p3'), machpela: own('p3'), 'rachels-tomb': own('p3'),
      }, turnNumber: 10,
    };
    const offer = proposeComputerTrade(state, 'p2');
    expect(offer).toBeDefined();
    expect(offer?.targetId).toBe('p3');
    expect(validateTrade(state, 'p2', offer!)).toBeUndefined();
    expect(computerAcceptsTrade(state, 'p2', offer!)).toBe(true);
    expect(tradeBenefit(state, 'p2', offer!, 'p2')).toBeGreaterThan(0);
  });
  it('respects trade cooldowns', () => {
    const state = { players: [bot, human], ownership: { kinneret: own('p2'), akko: own('p2'), caesarea: own('p1') }, turnNumber: 10 };
    const offer = proposeComputerTrade(state, 'p2');
    expect(offer).toBeDefined();
    state.turnNumber = 11;
    const key = ['p2', offer!.targetId, offer!.requestPropertyId ?? '', offer!.offerPropertyId ?? ''].join(':');
    const next = proposeComputerTrade({ ...state, tradeCooldowns: { [key]: 10 } }, 'p2');
    expect(next === undefined || next.requestPropertyId === offer?.requestPropertyId).toBe(true);
    if (next) expect(next.offerPropertyId).not.toBe(offer?.offerPropertyId);
  });
});
