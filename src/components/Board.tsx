import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { boardChangeLabel, detectBoardChange, type BoardChange } from "../engine/boardFeedback";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { movementTiming } from "../engine/movement";
import { board, groupColors } from "../data/board";
import { useGameStore } from "../store/gameStore";
import { CurrencyIcon } from "./CurrencyIcon";
import { ux } from "../data/ux";
import { HouseIcon, GuestHouseIcon } from "./AssetCard";

function gridPos(i: number) {
  if (i <= 10) return { gridRow: 11, gridColumn: 11 - i };
  if (i <= 20) return { gridRow: 21 - i, gridColumn: 1 };
  if (i <= 30) return { gridRow: 1, gridColumn: i - 19 };
  return { gridRow: i - 29, gridColumn: 11 };
}
function icon(type: string) {
  return (
    (
      {
        start: "➜",
        station: "🚆",
        utility: "⚡",
        mazal: "✦",
        good: "♥",
        tax: "◈",
        jail: "🚗",
        free: "🅿",
        "go-jail": "🚦",
      } as Record<string, string>
    )[type] ?? ""
  );
}
type TileAnchor = { x: number; y: number };

/** Keep each piece mounted in one stable layer while it travels between squares.
 * Mounting it inside each new square makes it disappear and flash during hops.
 */
function BoardPieces({
  positions,
  players,
  activePlayerIndex,
  moving,
  landing,
  reduced,
}: {
  positions: Record<number, TileAnchor>;
  players: ReturnType<typeof useGameStore.getState>["players"];
  activePlayerIndex: number;
  moving: boolean;
  landing: boolean;
  reduced: boolean;
}) {
  const { slideSeconds } = movementTiming(reduced);
  return (
    <div className="board-piece-layer" aria-label="Player positions">
      {players.filter(p => !p.bankrupt).map(player => {
        const tile = positions[player.position];
        if (!tile) return null;
        const neighbors = players.filter(p => !p.bankrupt && p.position === player.position);
        const offset = neighbors.findIndex(p => p.id === player.id);
        return (
          <motion.div
            key={player.id}
            initial={false}
            className={`token board-piece ${players[activePlayerIndex]?.id === player.id ? "active-token" : ""} ${landing && !reduced && players[activePlayerIndex]?.id === player.id ? "board-piece-landing" : ""}`}
            data-player-id={player.id}
            data-space-index={player.position}
            title={player.name}
            aria-label={player.name}
            style={{ background: player.color, zIndex: 20 + offset }}
            animate={{
              x: tile.x + (offset % 3) * 14,
              y: tile.y - Math.floor(offset / 3) * 16,
            }}
            transition={{
              duration: moving && players[activePlayerIndex]?.id === player.id ? slideSeconds : 0,
              ease: "easeInOut",
            }}
          >
            <span className="board-token-face">{player.token}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function Board({ onInspect }: { onInspect: (spaceId: string) => void }) {
  const { lang, players, ownership, activePlayerIndex, phase, settings, transactionQueue } = useGameStore();
  const gridRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<number, TileAnchor>>({});
  const prefersReducedMotion = useReducedMotion();
  const reduced = settings.reducedMotion || !!prefersReducedMotion;
  const previousOwnership = useRef(ownership);
  const feedbackSequence = useRef(0);
  const [feedback, setFeedback] = useState<(BoardChange & { sequence: number }) | null>(null);
  const transaction = transactionQueue[0];
  const rentPropertyId =
    transaction?.propertyId &&
    /^Rent\b/i.test(transaction.reason.en)
      ? transaction.propertyId
      : undefined;

  useEffect(() => {
    const change = detectBoardChange(previousOwnership.current, ownership);
    previousOwnership.current = ownership;
    if (change) setFeedback({ ...change, sequence: ++feedbackSequence.current });
  }, [ownership]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1050);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const base = grid.getBoundingClientRect();
      if (!base.width || !base.height) return;
      const measured: Record<number, TileAnchor> = {};
      grid.querySelectorAll<HTMLElement>("[data-board-index]").forEach(tile => {
        const box = tile.getBoundingClientRect();
        measured[Number(tile.dataset.boardIndex)] = {
          x: box.left - base.left + 5,
          y: box.bottom - base.top - 25,
        };
      });
      setPositions(old => {
        const keys = Object.keys(measured);
        if (keys.length === Object.keys(old).length &&
          keys.every(key => measured[Number(key)].x === old[Number(key)].x &&
                            measured[Number(key)].y === old[Number(key)].y)) return old;
        return measured;
      });
    };
    measure();
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(grid);
    window.addEventListener("resize", measure);
    return () => {
      resize?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div className="board-shell">
      <div className="board-grid" ref={gridRef} dir="ltr">
        <div className="board-center">
          <div className="sun-orbit" />
          <div className="hills hill-a" />
          <div className="hills hill-b" />
          <div className="center-mark">
            <div className="badge-large">
              <CurrencyIcon size={56} />
            </div>
            <h1>ארץ המצוות</h1>
            <h2>MITZVAH LAND</h2>
            <p>
              מסע משפחתי ברחבי הארץ
              <br />A family adventure across Israel
            </p>
          </div>
          <div className="jerusalem-silhouette">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        {board.map((space) => {
          const own = ownership[space.id];
          const owner = players.find((p) => p.id === own?.ownerId);
          const groupSpaces = space.group
            ? board.filter(
                (candidate) =>
                  candidate.type === "property" &&
                  candidate.group === space.group,
              )
            : [];
          const fullSet = Boolean(
            owner &&
            groupSpaces.length &&
            groupSpaces.every(
              (candidate) => ownership[candidate.id]?.ownerId === owner.id,
            ),
          );
          const tileFeedback = feedback?.spaceId === space.id ? feedback : undefined;
          const rentHighlight = rentPropertyId === space.id;
          const inspectable =
            space.type === "property" ||
            space.type === "station" ||
            space.type === "utility";
          return (
            <div
              key={space.id}
              data-board-index={space.index}
              role={inspectable ? "button" : undefined}
              tabIndex={inspectable ? 0 : undefined}
              onClick={inspectable ? () => onInspect(space.id) : undefined}
              onKeyDown={
                inspectable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onInspect(space.id);
                      }
                    }
                  : undefined
              }
              aria-label={
                inspectable
                  ? `${space.name.he} / ${space.name.en}, ${owner ? `${owner.name}` : ux("bank", lang)}`
                  : undefined
              }
              dir={lang === "en" ? "ltr" : "rtl"}
              className={`space space-${space.type} ${space.group ? `group-${space.group}` : ""} ${owner ? "owned-space" : ""} ${fullSet ? "full-set-tile" : ""} ${own?.mortgaged ? "tile-mortgaged" : ""} ${inspectable ? "inspectable-space" : ""} ${tileFeedback ? `board-event board-event--${tileFeedback.kind}` : ""} ${rentHighlight ? "board-rent-highlight" : ""}`}
              style={{ ...gridPos(space.index), "--owner-color": owner?.color ?? "transparent" } as React.CSSProperties}
            >
              {space.group && (
                <div
                  className="group-strip"
                  style={{ background: groupColors[space.group] }}
                />
              )}
              {owner && (
                <div
                  className="owner-marker"
                  title={`${ux("owner", lang)}: ${owner.name}`}
                >
                  <span style={{ background: owner.color }} />
                  {owner.token}
                </div>
              )}
              {fullSet && (
                <div
                  className="full-set-marker"
                  aria-label={ux("fullSet", lang)}
                  title={ux("fullSet", lang)}
                >
                  ✓
                </div>
              )}
              <div className="space-icon">{icon(space.type)}</div>
              <div className="space-name">
                {lang === "he"
                  ? space.name.he
                  : lang === "en"
                    ? space.name.en
                    : `${space.name.he} · ${space.name.en}`}
              </div>
              {space.price && (
                <div className="space-price">
                  <CurrencyIcon size={10} />
                  {space.price}
                </div>
              )}
              {space.type === "property" && (
                <div
                  className={`buildings ${own?.houses ? "" : "empty"}`}
                  aria-label={
                    own?.houses
                      ? own.houses >= 5
                        ? ux("guestHouse", lang)
                        : `${own.houses} ${ux("houses", lang)}`
                      : undefined
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {own?.houses && own.houses >= 5 ? (
                      <motion.span
                        key="guest-house"
                        className="building-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 20,
                        }}
                      >
                        <GuestHouseIcon />
                      </motion.span>
                    ) : (
                      Array.from({ length: own?.houses ?? 0 }, (_, index) => (
                        <motion.span
                          key={`house-${index}`}
                          className="building-icon"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 20,
                          }}
                        >
                          <HouseIcon />
                        </motion.span>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              )}
              {own?.mortgaged && (
                <div className="mortgaged" title={ux("mortgage", lang)}>
                  {ux("mortgage", lang)}
                </div>
              )}
              {tileFeedback && (
                <span
                  key={tileFeedback.sequence}
                  className="board-event-caption"
                  data-board-feedback={tileFeedback.kind}
                  aria-hidden="true"
                >
                  {boardChangeLabel(tileFeedback.kind, lang)}
                </span>
              )}
              {rentHighlight && transaction && (
                <span className="board-rent-caption" aria-hidden="true">
                  {lang === "en" ? "RENT" : "שכירות"} · {transaction.amount}
                </span>
              )}
            </div>
          );
        })}
        {Object.keys(positions).length > 0 && (
          <BoardPieces
            positions={positions}
            players={players}
            activePlayerIndex={activePlayerIndex}
            moving={phase === "MOVING" || phase === "RESOLVING"}
            landing={phase === "RESOLVING"}
            reduced={reduced}
          />
        )}
      </div>
    </div>
  );
}
