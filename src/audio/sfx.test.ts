import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockAudio {
  static instances: MockAudio[] = [];
  currentTime = 0;
  preload = "";
  volume = 1;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(readonly src: string) {
    MockAudio.instances.push(this);
  }
}

beforeEach(() => {
  vi.resetModules();
  MockAudio.instances = [];
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SFX playback", () => {
  it("preloads cached effects without autoplay and ignores muted/rapid repeats", async () => {
    const { playSfx, preloadSfx, unlockSfx } = await import("./sfx");

    preloadSfx();
    expect(MockAudio.instances).toHaveLength(6);
    expect(MockAudio.instances.every((audio) => audio.preload === "auto")).toBe(
      true,
    );
    expect(
      MockAudio.instances.every((audio) => audio.play.mock.calls.length === 0),
    ).toBe(true);

    playSfx("diceRoll");
    expect(MockAudio.instances[0].play).not.toHaveBeenCalled();

    unlockSfx();
    playSfx("diceRoll", false);
    playSfx("diceRoll");
    playSfx("diceRoll");
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(MockAudio.instances).toHaveLength(6);
  });

  it("stops cached effects when muted", async () => {
    const { preloadSfx, stopSfx } = await import("./sfx");

    preloadSfx();
    stopSfx();

    expect(MockAudio.instances).toHaveLength(6);
    expect(
      MockAudio.instances.every((audio) => audio.pause.mock.calls.length === 1),
    ).toBe(true);
    expect(MockAudio.instances.every((audio) => audio.currentTime === 0)).toBe(
      true,
    );
  });
});
