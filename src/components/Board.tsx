import { AnimatePresence, motion } from "framer-motion";
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
export function Board({ onInspect }: { onInspect: (spaceId: string) => void }) {
  const { lang, players, ownership, activePlayerIndex } = useGameStore();
  return (
    <div className="board-shell">
      <div className="board-grid">
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
          const here = players.filter(
            (p) => !p.bankrupt && p.position === space.index,
          );
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
          const inspectable =
            space.type === "property" ||
            space.type === "station" ||
            space.type === "utility";
          return (
            <div
              key={space.id}
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
              className={`space space-${space.type} ${space.group ? `group-${space.group}` : ""} ${fullSet ? "full-set-tile" : ""} ${own?.mortgaged ? "tile-mortgaged" : ""} ${inspectable ? "inspectable-space" : ""}`}
              style={gridPos(space.index)}
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
              <div className="tokens">
                {here.map((p, n) => (
                  <motion.div
                    layoutId={`token-${p.id}`}
                    key={p.id}
                    className={`token ${players[activePlayerIndex]?.id === p.id ? "active-token" : ""}`}
                    style={{ background: p.color, zIndex: 10 + n }}
                    title={p.name}
                  >
                    {p.token}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
