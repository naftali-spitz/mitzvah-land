import { describe, expect, it } from "vitest";
import { BOARD_MOVEMENT, movementTiming } from "./movement";

describe("board piece movement pacing", () => {
  it("provides enough time for a visible transition before advancing a square", () => {
    const timing = movementTiming(false);
    expect(timing.stepMs).toBeGreaterThanOrEqual(350);
    expect(timing.slideSeconds * 1000).toBeGreaterThanOrEqual(250);
    expect(timing.stepMs).toBeGreaterThan(timing.slideSeconds * 1000);
    expect(timing.landingMs).toBeGreaterThan(timing.slideSeconds * 1000);
    expect(timing.stepMs).toBe(BOARD_MOVEMENT.stepMs);
  });
  it("skips animation and landing pause for reduced motion", () => {
    expect(movementTiming(true)).toEqual({ stepMs: 25, slideSeconds: 0, landingMs: 0 });
  });
});
