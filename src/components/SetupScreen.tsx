import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import type { Lang, Player } from "../types/game";
import { CurrencyIcon } from "./CurrencyIcon";

const TOKENS = ["🍞", "🍷", "🍎", "🫒", "🚌", "🎒", "🥾", "🏠", "✡", "📚"];
const COLORS = ["#c64c48", "#3575b6", "#4f9a66", "#d39d34", "#8c5bb5", "#df6b9b"];
const STORAGE_KEY = "mitzvah-land-setup-v1";
type SeatType = "human" | "computer";
type Difficulty = NonNullable<Player["aiDifficulty"]>;

interface SetupPreferences {
  count: number;
  names: string[];
  chosen: string[];
  seatTypes: SeatType[];
  difficulties: Difficulty[];
  freeParking: boolean;
  fast: boolean;
}

const defaultSetup: SetupPreferences = {
  count: 4,
  names: ["נפתלי", "מיכל", "דוד", "שרה", "", ""],
  chosen: TOKENS.slice(0, 6),
  seatTypes: Array(6).fill("human"),
  difficulties: Array(6).fill("medium"),
  freeParking: false,
  fast: false,
};

function savedPreferences(): SetupPreferences {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return defaultSetup;
    const saved: Partial<SetupPreferences> = JSON.parse(value);
    if (!saved || !Number.isInteger(saved.count) || saved.count! < 2 || saved.count! > 6 ||
        !Array.isArray(saved.names) || saved.names.length !== 6 ||
        !Array.isArray(saved.chosen) || saved.chosen.length !== 6 ||
        !Array.isArray(saved.seatTypes) || saved.seatTypes.length !== 6 ||
        !Array.isArray(saved.difficulties) || saved.difficulties.length !== 6) return defaultSetup;
    if (!saved.names.every(value => typeof value === "string") ||
        !saved.chosen.every(value => TOKENS.includes(value)) ||
        new Set(saved.chosen).size !== 6 ||
        !saved.seatTypes.every(value => value === "human" || value === "computer") ||
        !saved.difficulties.every(value => value === "easy" || value === "medium" || value === "hard")) return defaultSetup;
    return {
      count: saved.count,
      names: saved.names,
      chosen: saved.chosen,
      seatTypes: saved.seatTypes,
      difficulties: saved.difficulties,
      freeParking: !!saved.freeParking,
      fast: !!saved.fast,
    };
  } catch {
    return defaultSetup;
  }
}

export function SetupScreen() {
  const { lang, setupLang, newGame } = useGameStore();
  const soundEnabled = useGameStore(state => state.settings.sound);
  const reducedMotion = useGameStore(state => state.settings.reducedMotion);
  const motionPreference = useReducedMotion();
  const [setup, setSetup] = useState(savedPreferences);
  const [tokenPicker, setTokenPicker] = useState<number | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const label = (he: string, en: string) =>
    lang === "he" ? he : lang === "en" ? en : he + " · " + en;
  const patch = (next: Partial<SetupPreferences>) => setSetup(prev => ({ ...prev, ...next }));
  const setAt = <T,>(values: T[], i: number, value: T) =>
    values.map((current, index) => index === i ? value : current);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(setup)); } catch { /* Private mode: keep settings in memory. */ }
  }, [setup]);

  useEffect(() => {
    if (tokenPicker === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTokenPicker(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tokenPicker]);

  const players = useMemo(
    () => Array.from({ length: setup.count }, (_, i) => ({
      name: setup.names[i].trim() || label(
        setup.seatTypes[i] === "computer" ? "מחשב " : "שחקן ",
        setup.seatTypes[i] === "computer" ? "Computer " : "Player ",
      ) + (i + 1),
      token: setup.chosen[i],
      color: COLORS[i],
      isComputer: setup.seatTypes[i] === "computer",
      aiDifficulty: setup.seatTypes[i] === "computer" ? setup.difficulties[i] : undefined,
    })),
    [setup, lang],
  );
  const computerCount = players.filter(player => player.isComputer).length;

  return (
    <main className="home-screen setup-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="setup-landscape" aria-hidden="true" />
      <div className="setup-sunlight" aria-hidden="true" />
      <motion.div
        className="setup-stage"
        initial={motionPreference || reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <header className="setup-hero">
          <div className="setup-emblem"><CurrencyIcon size={38} /></div>
          <h1>ארץ המצוות</h1>
          <div className="setup-english">MITZVAH LAND</div>
          <p>{label("הרפתקה משפחתית בארץ המצוות", "A Family Adventure in Mitzvah Land")}</p>
        </header>

        <section className="setup-card" aria-label={label("הגדרות המשחק", "Game setup")}>
          <div className="setup-controls">
            <div>
              <h2 className="setup-label">{label("שפה", "Language")}</h2>
              <div className="segmented setup-language" role="group" aria-label={label("שפה", "Language")}>
                {([["he", "עברית"], ["en", "English"], ["bi", "עברית + English"]] as [Lang, string][]).map(([value, text]) =>
                  <button type="button" key={value} aria-pressed={lang === value}
                    className={lang === value ? "selected" : ""} onClick={() => setupLang(value)}>
                    {text}
                  </button>,
                )}
              </div>
            </div>
            <div>
              <h2 className="setup-label">{label("מספר שחקנים", "Number of Players")}</h2>
              <div className="count-picker" role="group" aria-label={label("מספר שחקנים", "Number of Players")}>
                {[2, 3, 4, 5, 6].map(value =>
                  <button key={value} type="button" aria-pressed={setup.count === value}
                    className={setup.count === value ? "selected" : ""}
                    onClick={() => patch({ count: value })}>{value}</button>,
                )}
              </div>
            </div>
          </div>

          <div className="setup-player-heading">
            <h2>{label("בחרו שחקנים", "Choose Your Players")}</h2>
            <span>{setup.count - computerCount} {label("אנושיים", "human")} · {computerCount} {label("מחשבים", "computer")}</span>
          </div>
          <div className={"players-setup setup-count-" + setup.count}>
            {players.map((player, i) => (
              <div
                key={i}
                className={"player-setup " + (player.isComputer ? "computer-seat" : "")}
                style={{ "--seat-color": player.color } as React.CSSProperties}
              >
                <div className="setup-seat-header">
                  <span className="setup-meeple" aria-hidden="true">{player.token}</span>
                  <span className="setup-seat-label">{label("שחקן", "Player")} {i + 1}</span>
                  <span className="setup-seat-type">{player.isComputer ? "🤖" : "●"}</span>
                </div>
                <div className="player-setup-fields">
                  <input
                    value={setup.names[i]}
                    onChange={event => patch({ names: setAt(setup.names, i, event.target.value) })}
                    aria-label={label("שם שחקן", "Player name") + " " + (i + 1)}
                    placeholder={label("שם שחקן", "Player name")}
                    maxLength={32}
                  />
                  <div className="seat-options">
                    <select
                      aria-label={label("סוג שחקן", "Player type") + " " + (i + 1)}
                      value={setup.seatTypes[i]}
                      onChange={event => patch({
                        seatTypes: setAt(setup.seatTypes, i, event.target.value as SeatType),
                      })}
                    >
                      <option value="human">{label("👤 אדם", "👤 Human")}</option>
                      <option value="computer">{label("🤖 מחשב", "🤖 Computer")}</option>
                    </select>
                    {player.isComputer && (
                      <select
                        aria-label={label("רמת קושי", "Difficulty") + " " + (i + 1)}
                        value={setup.difficulties[i]}
                        onChange={event => patch({
                          difficulties: setAt(setup.difficulties, i, event.target.value as Difficulty),
                        })}
                      >
                        <option value="easy">{label("קל", "Easy")}</option>
                        <option value="medium">{label("בינוני", "Medium")}</option>
                        <option value="hard">{label("קשה", "Hard")}</option>
                      </select>
                    )}
                  </div>
                  <button
                    className="setup-token-button" type="button"
                    aria-label={label("בחרו כלי", "Choose token") + " " + (i + 1)}
                    onClick={() => setTokenPicker(i)}
                  >
                    <span className="setup-token-medallion">{player.token}</span>
                    <span>{label("החלפת כלי", "Change token")}</span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="setup-options">
            <button type="button" className="setup-options-toggle" aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen(open => !open)}>
              <span>⚙ {label("אפשרויות משחק", "Game Options")}</span>
              <span aria-hidden="true">{optionsOpen ? "⌃" : "⌄"}</span>
            </button>
            {optionsOpen && (
              <div className="setup-options-content">
                <label className="check">
                  <input type="checkbox" checked={setup.freeParking}
                    onChange={event => patch({ freeParking: event.target.checked })} />
                  {label("קופת חניה חופשית", "Free Parking jackpot")}
                </label>
                <label className="check">
                  <input type="checkbox" checked={setup.fast}
                    onChange={event => patch({ fast: event.target.checked })} />
                  {label("מצב מהיר", "Fast mode")}
                </label>
                <label className="check">
                  <input type="checkbox" checked={soundEnabled}
                    onChange={event => useGameStore.getState().setSoundEnabled(event.target.checked)} />
                  {label("צלילים", "Sound effects")}
                </label>
                <label className="check">
                  <input type="checkbox" checked={reducedMotion}
                    onChange={event => useGameStore.setState(state => ({
                      settings: { ...state.settings, reducedMotion: event.target.checked },
                    }))} />
                  {label("הפחתת אנימציות", "Reduced motion")}
                </label>
              </div>
            )}
          </div>

          <button
            type="button" className="primary huge setup-start"
            onClick={() => newGame(players, {
              freeParkingJackpot: setup.freeParking,
              fastMode: setup.fast,
              sound: soundEnabled,
              reducedMotion,
            })}
          >
            <span aria-hidden="true">▶</span>
            {label("מתחילים לשחק", "START GAME")}
          </button>
          <div className="setup-foot">
            <CurrencyIcon size={16} /> <strong>זוזים · ZUZIM</strong>
            <span>•</span> {label("משחק משפחתי ללא חשבון", "Local family game · no account")}
          </div>
        </section>
      </motion.div>
      {tokenPicker !== null && (
        <div className="setup-picker-backdrop" onClick={() => setTokenPicker(null)}>
          <div role="dialog" aria-modal="true" className="setup-picker"
            aria-label={label("בחירת כלי משחק", "Choose a token")}
            onClick={event => event.stopPropagation()}>
            <div className="setup-picker-top">
              <h2>{label("בחרו כלי משחק", "Choose a token")}</h2>
              <button type="button" onClick={() => setTokenPicker(null)}
                aria-label={label("סגור", "Close")}>✕</button>
            </div>
            <div className="setup-token-grid">
              {TOKENS.map(token => {
                const taken = setup.chosen.some((picked, index) =>
                  index !== tokenPicker && index < setup.count && picked === token,
                );
                return (
                  <button
                    key={token} type="button"
                    disabled={taken}
                    className={setup.chosen[tokenPicker] === token ? "selected" : ""}
                    aria-label={label("כלי", "Token") + " " + token}
                    aria-pressed={setup.chosen[tokenPicker] === token}
                    title={taken ? label("כלי תפוס", "Already chosen") : undefined}
                    onClick={() => {
                      // Swap with an inactive seat if needed to maintain all six unique tokens.
                      const owner = setup.chosen.findIndex((picked, index) =>
                        index !== tokenPicker && picked === token,
                      );
                      const updated = setup.chosen.slice();
                      if (owner >= 0) updated[owner] = updated[tokenPicker];
                      updated[tokenPicker] = token;
                      patch({ chosen: updated });
                      setTokenPicker(null);
                    }}
                  >{token}</button>
                );
              })}
            </div>
            <p>{label("לכל שחקן כלי משחק ייחודי", "Each player gets a unique token")}</p>
          </div>
        </div>
      )}
    </main>
  );
}
