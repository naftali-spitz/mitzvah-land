export type SfxName =
  | "diceRoll"
  | "pieceMove"
  | "pieceLand"
  | "cardDraw"
  | "cardReveal"
  | "buildHouse";

export const SFX_VOLUME = 0.28;

const SFX_FILES: Record<SfxName, string> = {
  diceRoll: "/sfx/dice-roll.mp3",
  pieceMove: "/sfx/piece-move.mp3",
  pieceLand: "/sfx/piece-land.mp3",
  cardDraw: "/sfx/card-draw.mp3",
  cardReveal: "/sfx/card-reveal.mp3",
  buildHouse: "/sfx/build-house.mp3",
};

const audioCache = new Map<SfxName, HTMLAudioElement>();
const lastPlayedAt = new Map<SfxName, number>();
const REPLAY_GUARD_MS = 80;
let audioUnlocked = false;

function getAudio(name: SfxName): HTMLAudioElement | undefined {
  if (typeof Audio === "undefined") return undefined;

  let audio = audioCache.get(name);
  if (!audio) {
    try {
      audio = new Audio(SFX_FILES[name]);
      audio.preload = "auto";
      audio.volume = SFX_VOLUME;
      audioCache.set(name, audio);
    } catch {
      return undefined;
    }
  }
  return audio;
}

/** Warm the six small audio elements without starting playback. */
export function preloadSfx(): void {
  if (typeof Audio === "undefined") return;
  for (const name of Object.keys(SFX_FILES) as SfxName[]) getAudio(name);
}

/** Mark that a genuine game interaction has occurred before effects may play. */
export function unlockSfx(): void {
  audioUnlocked = true;
}

/** Play one cached effect; playback failures are intentionally non-fatal. */
export function playSfx(name: SfxName, enabled = true): void {
  if (!enabled || !audioUnlocked) return;

  const audio = getAudio(name);
  if (!audio) return;

  const now =
    typeof performance === "undefined" ? Date.now() : performance.now();
  if (now - (lastPlayedAt.get(name) ?? -Infinity) < REPLAY_GUARD_MS) return;
  lastPlayedAt.set(name, now);

  try {
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      void playback.catch(() => undefined);
    }
  } catch {
    // Audio is optional; unsupported or blocked playback must not affect the game.
  }
}

/** Stop active effects immediately when the user mutes the game. */
export function stopSfx(): void {
  for (const audio of audioCache.values()) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Ignore browser-specific media element failures.
    }
  }
}
