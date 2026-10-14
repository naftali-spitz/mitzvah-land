import type { Lang } from "../types/game";

type Glyph = "sound" | "mute" | "rules" | "history" | "language" | "expand" | "shrink" | "new-game";

function UtilityGlyph({ name }: { name: Glyph }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...stroke}>
      {(name === "sound" || name === "mute") && <>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {name === "sound" ? <>
          <path d="M15 9a4 4 0 0 1 0 6" />
          <path d="M18 6a8 8 0 0 1 0 12" />
        </> : <path d="m16 9 5 6m0-6-5 6" />}
      </>}
      {name === "rules" && <>
        <path d="M12 7v14M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5V5.5Z" />
        <path d="M6 10h3M6 13h3M15 10h3M15 13h3" />
      </>}
      {name === "history" && <>
        <path d="M3 11a9 9 0 1 1 2.6 6.4M3 5v6h6" />
        <path d="M12 7v5l3.5 2" />
      </>}
      {name === "language" && <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18" />
      </>}
      {name === "expand" && <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />}
      {name === "shrink" && <path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5" />}
      {name === "new-game" && <>
        <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />
      </>}
    </svg>
  );
}

interface UtilityRailProps {
  lang: Lang;
  soundEnabled: boolean;
  historyOpen: boolean;
  fullscreen: boolean;
  onSound: () => void;
  onRules: () => void;
  onHistory: () => void;
  onLanguage: () => void;
  onFullscreen: () => void;
  onNewGame: () => void;
}

/** Non-gameplay controls only. All buttons remain keyboard accessible. */
export function UtilityRail({
  lang, soundEnabled, historyOpen, fullscreen,
  onSound, onRules, onHistory, onLanguage, onFullscreen, onNewGame,
}: UtilityRailProps) {
  const text = (he: string, en: string) => lang === "he" ? he : lang === "en" ? en : he + " · " + en;
  const items: { icon: Glyph; label: string; action: () => void; active?: boolean; danger?: boolean }[] = [
    { icon: soundEnabled ? "sound" : "mute", label: text(soundEnabled ? "השתק צלילים" : "הפעל צלילים", soundEnabled ? "Mute sound" : "Enable sound"), action: onSound },
    { icon: "rules", label: text("כללי המשחק", "Game rules"), action: onRules },
    { icon: "history", label: text("היסטוריית המשחק", "Game history"), action: onHistory, active: historyOpen },
    { icon: "language", label: text("שנה שפה", "Change language"), action: onLanguage },
    { icon: fullscreen ? "shrink" : "expand", label: text(fullscreen ? "צא ממסך מלא" : "מסך מלא", fullscreen ? "Exit fullscreen" : "Fullscreen"), action: onFullscreen },
    { icon: "new-game", label: text("משחק חדש", "New game"), action: onNewGame, danger: true },
  ];
  return (
    <nav className="utility-rail" aria-label={text("בקרות משחק נוספות", "Game utilities")}>
      {items.map((item, index) => (
        <button
          key={item.icon}
          type="button"
          className={"utility-button" + (item.active ? " is-active" : "") + (item.danger ? " utility-danger" : "")}
          aria-label={item.label}
          aria-pressed={item.icon === "history" ? !!item.active : undefined}
          title={item.label}
          onClick={item.action}
        >
          <UtilityGlyph name={item.icon} />
          {index === 3 && <span className="utility-language-dot" aria-hidden="true">{lang === "he" ? "ע" : lang === "en" ? "E" : "A"}</span>}
        </button>
      ))}
    </nav>
  );
}
