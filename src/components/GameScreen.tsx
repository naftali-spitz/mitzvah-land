import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { movementTiming } from "../engine/movement";
import { useGameStore } from "../store/gameStore";
import { Board } from "./Board";
import { Dice } from "./Dice";
import {
  AuctionModal,
  CardModal,
  DebtModal,
  Management,
  PropertyDecision,
  TradeModal,
  ComputerTradeOfferModal,
} from "./GameModals";
import { Modal, Money, ui } from "./ui";
import { CurrencyIcon } from "./CurrencyIcon";
import { board } from "../data/board";
import { netWorth, ownedSpaces } from "../engine/rules";
import { playSfx, preloadSfx, stopSfx, unlockSfx } from "../audio/sfx";
import { AssetCardModal } from "./AssetCard";
import { TransactionOverlay } from "./TransactionOverlay";
import { AiController } from "./AiController";

export function GameScreen() {
  const s = useGameStore();
  const p = s.players[s.activePlayerIndex];
  const [manageOpen, setManageOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [inspectedAssetId, setInspectedAssetId] = useState<string>();
  const movementSfxActive = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const useReducedMovement = s.settings.reducedMotion || !!prefersReducedMotion;
  const previousCardId = useRef(s.currentCard?.id);
  useEffect(() => {
    preloadSfx();
  }, []);
  useEffect(() => {
    if (s.phase !== "MOVING" || s.pendingSteps <= 0) return;
    const t = setTimeout(
      () => s.stepMove(),
      movementTiming(useReducedMovement).stepMs,
    );
    return () => clearTimeout(t);
  }, [s.phase, s.pendingSteps, useReducedMovement, s.stepMove]);
  useEffect(() => {
    if (s.phase === "RESOLVING" && movementSfxActive.current) {
      movementSfxActive.current = false;
      playSfx("pieceLand", s.settings.sound);
    } else if (s.phase !== "MOVING" && s.phase !== "RESOLVING")
      movementSfxActive.current = false;
  }, [s.phase, s.settings.sound]);
  useEffect(() => {
    const cardId = s.currentCard?.id;
    if (cardId && cardId !== previousCardId.current)
      playSfx("cardDraw", s.settings.sound);
    previousCardId.current = cardId;
  }, [s.currentCard?.id, s.settings.sound]);
  const rolling = s.phase === "MOVING" && s.pendingSteps === s.lastDiceTotal;
  const label = (he: string, en: string) => ui(he, en, s.lang);
  if (!p) return null;
  return (
    <main className="game-screen" dir={s.lang === "he" ? "rtl" : "ltr"}>
      <AiController />
      <header className="topbar">
        <div className="mini-logo">
          <CurrencyIcon size={28} />
          <span>
            <b>ארץ המצוות</b>
            <small>MITZVAH LAND</small>
          </span>
        </div>
        <div className="turn-title">
          <span>{label("תור", "TURN")}</span>
          <b style={{ color: p.color }}>
            {p.token} {p.name} {p.isComputer ? "🤖" : ""}
          </b>
          <small>
            {label("סיבוב", "Turn")} {s.turnNumber}
          </small>
        </div>
        <div className="top-actions">
          <button
            className="sound-toggle"
            aria-label={
              s.settings.sound
                ? label("השתק צלילים", "Mute sound effects")
                : label("הפעל צלילים", "Enable sound effects")
            }
            title={
              s.settings.sound
                ? label("השתק צלילים", "Mute sound effects")
                : label("הפעל צלילים", "Enable sound effects")
            }
            onClick={() => {
              const enabled = !s.settings.sound;
              s.setSoundEnabled(enabled);
              if (enabled) unlockSfx();
              else stopSfx();
            }}
          >
            {s.settings.sound ? "🔊" : "🔇"}
          </button>
          <button onClick={() => setRulesOpen(true)}>?</button>
          <button onClick={() => setLogOpen((v) => !v)}>☷</button>
          <button onClick={() => setConfirmQuit(true)}>⌂</button>
        </div>
      </header>
      <div className="game-layout">
        <section className="board-column">
          <Board onInspect={setInspectedAssetId} />
        </section>
        <aside className="side-panel">
          <div className="players-list">
            {s.players.map((pl, i) => {
              const props = ownedSpaces(pl.id, s.ownership);
              return (
                <div
                  className={`player-card ${i === s.activePlayerIndex ? "current" : ""} ${pl.bankrupt ? "bankrupt" : ""} ${s.transactionQueue[0]?.from === pl.id ? "transaction-payer" : ""} ${s.transactionQueue[0]?.to === pl.id ? "transaction-receiver" : ""}`}
                  style={{ "--player": pl.color } as React.CSSProperties}
                  key={pl.id}
                >
                  <div className="player-main">
                    <span
                      className="player-token"
                      style={{ background: pl.color }}
                    >
                      {pl.token}
                    </span>
                    <div>
                      <b>{pl.name} {pl.isComputer && <span className="bot-tag">🤖 {label("מחשב", "BOT")}</span>}</b>
                      <Money value={pl.money} />
                    </div>
                    {pl.inJail && (
                      <span className="traffic-chip">
                        🚗 {label("פקק", "TRAFFIC")}
                      </span>
                    )}
                  </div>
                  <div className="property-dots">
                    {props.map((sp) => (
                      <span
                        title={sp.name.en}
                        key={sp.id}
                        style={{ background: sp.group ? undefined : "#8f9793" }}
                        className={sp.group ? `dot group-${sp.group}` : "dot"}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="turn-console">
            <Dice
              values={s.dice}
              rolling={rolling}
              reduced={s.settings.reducedMotion}
            />
            {p.inJail && s.phase === "WAITING_FOR_ROLL" && (
              <div className="jail-actions">
                <p>
                  {label(
                    `תור ${p.jailTurns + 1} בפקק`,
                    `Traffic turn ${p.jailTurns + 1}`,
                  )}
                </p>
                <button disabled={!!p.isComputer || p.money < 50} onClick={s.payJailFine}>
                  {label("שלם 50 וצא", "PAY 50 & LEAVE")}
                </button>
                {p.getOutCards > 0 && (
                  <button disabled={!!p.isComputer} onClick={s.useGetOutCard}>
                    {label("השתמש בכרטיס יציאה", "USE GET-OUT CARD")}
                  </button>
                )}
              </div>
            )}
            <button
              className="roll-button"
              disabled={!!p.isComputer || s.phase !== "WAITING_FOR_ROLL"}
              onClick={() => {
                const current = useGameStore.getState();
                if (current.phase !== "WAITING_FOR_ROLL") return;
                unlockSfx();
                playSfx("diceRoll", current.settings.sound);
                s.rollDice();
                const afterRoll = useGameStore.getState();
                if (afterRoll.phase === "MOVING") {
                  movementSfxActive.current = true;
                  playSfx("pieceMove", afterRoll.settings.sound);
                }
              }}
            >
              <span>⚄</span>
              {p.isComputer ? label("המחשב משחק...", "COMPUTER PLAYING...") : label("גלגל קוביות", "ROLL DICE")}
            </button>
            <div className="phase-note">{phaseText(s.phase, s.lang)}</div>
            {s.settings.freeParkingJackpot && s.freeParkingPot > 0 && (
              <div className="jackpot">
                🅿 {label("קופה", "JACKPOT")} <Money value={s.freeParkingPot} />
              </div>
            )}
          </div>
          <div className="action-grid">
            <button disabled={!!p.isComputer} onClick={() => setManageOpen(true)}>
              {label("🏠 נכסים", "🏠 PROPERTIES")}
            </button>
            <button
              disabled={!!p.isComputer || s.phase !== "MANAGEMENT" || !s.players.some(pl => pl.id !== p.id && !pl.bankrupt)}
              onClick={() => setTradeOpen(true)}
            >
              {label("⇄ עסקה", "⇄ TRADE")}
            </button>
            <button
              disabled={!!p.isComputer || s.phase !== "MANAGEMENT" || !!s.currentCard || !!s.debt}
              className="end-turn"
              onClick={s.endTurn}
            >
              {label("סיים תור", "END TURN")} ➜
            </button>
          </div>
        </aside>
      </div>
      <AnimatePresence>
        {logOpen && (
          <motion.div
            className="activity-log"
            initial={{ x: s.lang === "he" ? -320 : 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: s.lang === "he" ? -320 : 320, opacity: 0 }}
          >
            <div className="log-head">
              <b>{label("מה קרה במשחק", "GAME HISTORY")}</b>
              <button onClick={() => setLogOpen(false)}>×</button>
            </div>
            {s.logs.map((l) => (
              <div className="log-line" key={l.id}>
                {l.text}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {s.phase === "PROPERTY_DECISION" && (
        <PropertyDecision onInspect={setInspectedAssetId} />
      )}
      {s.phase === "AUCTION" && (
        <AuctionModal onInspect={setInspectedAssetId} />
      )}
      {s.currentCard && <CardModal />}
      {s.debt && !s.currentCard && <DebtModal />}
      {manageOpen && (
        <Modal onClose={() => setManageOpen(false)}>
          <div className="panel-modal">
            <h2>{label("ניהול נכסים", "PROPERTY MANAGEMENT")}</h2>
            <Management onInspect={setInspectedAssetId} />
            <button
              className="secondary full"
              onClick={() => setManageOpen(false)}
            >
              {label("סגור", "CLOSE")}
            </button>
          </div>
        </Modal>
      )}
      {tradeOpen && <TradeModal onClose={() => setTradeOpen(false)} />}
      {s.pendingTrade && <ComputerTradeOfferModal />}
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {confirmQuit && (
        <Modal onClose={() => setConfirmQuit(false)}>
          <div className="confirm">
            <h2>{label("משחק חדש?", "Start a new game?")}</h2>
            <p>
              {label(
                "המשחק הנוכחי יימחק מהמכשיר.",
                "The current local game will be deleted.",
              )}
            </p>
            <div className="modal-actions">
              <button
                className="danger"
                onClick={() => {
                  s.resetGame();
                  setConfirmQuit(false);
                }}
              >
                {label("כן, משחק חדש", "YES, NEW GAME")}
              </button>
              <button
                className="secondary"
                onClick={() => setConfirmQuit(false)}
              >
                {label("ביטול", "CANCEL")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {s.phase === "GAME_OVER" && <WinnerModal />}
      {inspectedAssetId && (
        <AssetCardModal
          spaceId={inspectedAssetId}
          onClose={() => setInspectedAssetId(undefined)}
        />
      )}
      <TransactionOverlay />
      {import.meta.env.DEV &&
        new URLSearchParams(location.search).has("debug") && <DebugPanel />}
    </main>
  );
}

function phaseText(phase: string, lang: "he" | "en" | "bi") {
  const m: Record<string, [string, string]> = {
    WAITING_FOR_ROLL: ["מוכן לגלגול", "Ready to roll"],
    MOVING: ["מתקדמים...", "Moving..."],
    RESOLVING: ["בודקים את המשבצת...", "Resolving space..."],
    PROPERTY_DECISION: ["נכס פנוי!", "Property available!"],
    AUCTION: ["המכרז פתוח", "Auction in progress"],
    DEBT: ["צריך להסדיר חוב", "Debt must be settled"],
    MANAGEMENT: ["אפשר לנהל נכסים או לסיים תור", "Manage assets or end turn"],
    GAME_OVER: ["המשחק הסתיים", "Game over"],
  };
  const x = m[phase] ?? ["", ""];
  return ui(x[0], x[1], lang);
}
function RulesModal({ onClose }: { onClose: () => void }) {
  const s = useGameStore();
  const l = (he: string, en: string) => ui(he, en, s.lang);
  return (
    <Modal onClose={onClose}>
      <div className="rules">
        <h2>{l("איך משחקים", "HOW TO PLAY")}</h2>
        <div className="rules-grid">
          <article>
            <b>1. {l("מטרה", "OBJECTIVE")}</b>
            <p>
              {l(
                "קנה נכסים, בנה בתים ובתי הארחה, וגבה שכירות עד שנשאר שחקן אחד שאינו בפשיטת רגל.",
                "Buy properties, build homes and guest houses, and collect rent until only one solvent player remains.",
              )}
            </p>
          </article>
          <article>
            <b>2. {l("תור", "TURN")}</b>
            <p>
              {l(
                "גלגל קוביות, זוז, בצע את הפעולה במשבצת ואז נהל נכסים או סיים תור. דאבל נותן גלגול נוסף.",
                "Roll, move, resolve the space, then manage assets or end your turn. Doubles give another roll.",
              )}
            </p>
          </article>
          <article>
            <b>3. {l("קנייה ומכרז", "BUYING & AUCTIONS")}</b>
            <p>
              {l(
                "נכס פנוי ניתן לקנות. אם לא קונים, הוא יוצא למכרז בין כל השחקנים הפעילים.",
                "An unowned property can be bought. If declined, it goes to auction among active players.",
              )}
            </p>
          </article>
          <article>
            <b>4. {l("בנייה", "BUILDING")}</b>
            <p>
              {l(
                "צריך את כל קבוצת הצבע. בונים בצורה מאוזנת. חמישה שלבי בנייה נחשבים לבית הארחה.",
                "Own the full color group and build evenly. Five building levels represent a guest house.",
              )}
            </p>
          </article>
          <article>
            <b>5. {l("משכון", "MORTGAGE")}</b>
            <p>
              {l(
                "אפשר למשכן נכס שאין עליו בניינים. פדיון משכון עולה 110% מערך המשכון.",
                "Mortgage properties with no buildings. Unmortgaging costs 110% of mortgage value.",
              )}
            </p>
          </article>
          <article>
            <b>6. {l("פקק", "TRAFFIC")}</b>
            <p>
              {l(
                "יוצאים בדאבל, בתשלום 50 זוזים או עם כרטיס יציאה. אחרי שלושה תורים משלמים ויוצאים.",
                "Escape with doubles, 50 Zuzim, or a get-out card. After three turns you must pay and leave.",
              )}
            </p>
          </article>
        </div>
        <button className="primary full" onClick={onClose}>
          {l("הבנתי", "GOT IT")}
        </button>
      </div>
    </Modal>
  );
}

function DebugPanel() {
  const s = useGameStore();
  const [open, setOpen] = useState(false);
  const p = s.players[s.activePlayerIndex];
  if (!p) return null;
  const patchPlayer = (fn: (x: typeof p) => typeof p) =>
    useGameStore.setState((st) => ({
      players: st.players.map((x) => (x.id === p.id ? fn(x) : x)),
    }));
  return (
    <>
      <button className="debug-fab" onClick={() => setOpen(true)}>
        DEV
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="debug-panel">
            <h2>Development tools</h2>
            <p>
              Active: <b>{p.name}</b>
            </p>
            <div className="debug-grid">
              <button
                onClick={() =>
                  patchPlayer((x) => ({ ...x, money: x.money + 500 }))
                }
              >
                +500 Zuzim
              </button>
              <button
                onClick={() =>
                  patchPlayer((x) => ({
                    ...x,
                    position: 10,
                    inJail: true,
                    jailTurns: 0,
                  }))
                }
              >
                Send to traffic
              </button>
              <button
                onClick={() => {
                  useGameStore.setState({ phase: "WAITING_FOR_ROLL" });
                  s.rollDice([6, 6]);
                }}
              >
                Force double 6
              </button>
              <select
                value={p.position}
                onChange={(e) =>
                  patchPlayer((x) => ({ ...x, position: +e.target.value }))
                }
              >
                {board.map((sp) => (
                  <option value={sp.index} key={sp.id}>
                    {sp.index}. {sp.name.en}
                  </option>
                ))}
              </select>
            </div>
            <button className="secondary full" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function WinnerModal() {
  const s = useGameStore();
  const w = s.players.find((p) => p.id === s.winnerId);
  const stats = useMemo(
    () =>
      w
        ? {
            worth: netWorth(w, s.ownership),
            props: ownedSpaces(w.id, s.ownership).length,
          }
        : null,
    [w, s.ownership],
  );
  if (!w) return null;
  return (
    <Modal>
      <motion.div
        className="winner"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="confetti">✦ · ✧ · ✦ · ✧ · ✦</div>
        <div className="winner-token" style={{ background: w.color }}>
          {w.token}
        </div>
        <h1>מזל טוב!</h1>
        <h2>MAZAL TOV!</h2>
        <h3>
          {w.name} {ui("ניצח!", "WINS!", s.lang)}
        </h3>
        {stats && (
          <div className="winner-stats">
            <span>
              {ui("שווי כולל", "Net worth", s.lang)}{" "}
              <Money value={stats.worth} />
            </span>
            <span>
              {ui("נכסים", "Properties", s.lang)} <b>{stats.props}</b>
            </span>
            <span>
              {ui("תורות", "Turns", s.lang)} <b>{s.turnNumber}</b>
            </span>
          </div>
        )}
        <button className="primary huge" onClick={s.resetGame}>
          {ui("משחק חדש", "NEW GAME", s.lang)}
        </button>
      </motion.div>
    </Modal>
  );
}
