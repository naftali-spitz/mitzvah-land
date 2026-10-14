/**
 * Give each board hop enough time to be visually tracked.
 * The final landing pause prevents cards/modals from covering the last move.
 */
export const BOARD_MOVEMENT = {
  stepMs: 450,
  slideMs: 355,
  landingMs: 465,
} as const;

export function movementTiming(reducedMotion: boolean) {
  return reducedMotion
    ? { stepMs: 25, slideSeconds: 0, landingMs: 0 }
    : {
        stepMs: BOARD_MOVEMENT.stepMs,
        slideSeconds: BOARD_MOVEMENT.slideMs / 1000,
        landingMs: BOARD_MOVEMENT.landingMs,
      };
}
