/**
 * Production host-review proposal timeout.
 *
 * The harden-gm-two-player-campaign-sessions specs require a timeout that
 * commits nothing (coop-campaign-sync "Proposal timeout commits nothing",
 * e2e-testing E2E-29) but they do not name a duration. Two minutes is long
 * enough for a GM to read a proposal and decide, and short enough that a
 * guest is not stuck if the host went AFK.
 */
export const PRODUCTION_PROPOSAL_TIMEOUT_MS = 120_000;

/**
 * Smallest timer injection the arbiter accepts: the same pair the
 * process already uses. Tests pass a recording pair so arm/cancel/release
 * can be asserted without depending on Jest fake timers alone.
 */
export interface ICampaignGmArbiterTimers {
  readonly setTimeout: (handler: () => void, ms: number) => unknown;
  readonly clearTimeout: (handle: unknown) => void;
}

/** Process timers; production construction omits `timers` and gets these. */
export const defaultArbiterTimers: ICampaignGmArbiterTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};
