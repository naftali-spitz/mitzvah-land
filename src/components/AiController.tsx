import { useEffect } from 'react';
import { chooseAiAction } from '../engine/ai';
import { useGameStore } from '../store/gameStore';
import { playSfx } from '../audio/sfx';

/** Each computer choice uses the same validated store actions as a human choice. */
export function AiController() {
  const state = useGameStore();
  useEffect(() => {
    if (!state.started) return;
    const action = chooseAiAction(state);
    if (!action) return;
    const timer = window.setTimeout(() => {
      const current = useGameStore.getState();
      const next = chooseAiAction(current);
      if (!next) return;
      switch (next.type) {
        case 'roll':
          playSfx('diceRoll', current.settings.sound);
          current.rollDice();
          if (useGameStore.getState().phase === 'MOVING') playSfx('pieceMove', current.settings.sound);
          break;
        case 'pay-jail': current.payJailFine(); break;
        case 'use-card': current.useGetOutCard(); break;
        case 'buy': current.buyPendingProperty(); break;
        case 'auction': current.startAuction(); break;
        case 'bid': current.bidAuction(next.playerId, next.amount ?? 0); break;
        case 'pass': current.passAuction(next.playerId); break;
        case 'finish-auction': current.finishAuction(); break;
        case 'dismiss-card': current.dismissCard(); break;
        case 'settle': current.settleDebt(); break;
        case 'bankrupt': current.declareBankruptcy(); break;
        case 'mortgage': current.mortgage(next.spaceId); break;
        case 'sell-building': current.sellBuilding(next.spaceId); break;
        case 'build': current.build(next.spaceId); break;
        case 'unmortgage': current.unmortgage(next.spaceId); break;
        case 'end': current.endTurn(); break;
      }
    }, state.settings.reducedMotion ? 180 : 700);
    return () => window.clearTimeout(timer);
  }, [state]);
  return null;
}
