/**
 * Producer-rules version, independent of event/schema/projector/source versions.
 * A version number never gains a new rule after shipped code has written it.
 * Each semantic release increments the writer exactly once and gates its new
 * rules on the LOG's version, never on the current writer constant.
 *
 * Absent/1 retains historical rules. R11a 2 is stamp-only: NO exactness
 * guarantee. C-1c 2b next writes 3 and gates its counter rule at >=3;
 * there is no separate 2a release. Certification is independent.
 * @spec openspec/changes/stamp-replay-fidelity-version/specs/game-state-management/spec.md
 */
export const CURRENT_REPLAY_FIDELITY_VERSION = 2;
export const LEGACY_REPLAY_FIDELITY_VERSION = 1;
export type ReplayFidelityVersion = 1 | 2;

export const REPLAY_FIDELITY_RELOAD_REASON =
  'reload-required: Reload this tab to join this match.';

export class ReplayFidelityVersionError extends Error {
  readonly name = 'ReplayFidelityVersionError';
  constructor(readonly code: 'invalid-fidelity-version' | 'reload-required') {
    super(code === 'reload-required'
      ? REPLAY_FIDELITY_RELOAD_REASON
      : 'Invalid replay producer-rules version');
  }
}

export function validateReplayFidelityVersion(value: unknown): ReplayFidelityVersion {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < LEGACY_REPLAY_FIDELITY_VERSION)
    throw new ReplayFidelityVersionError('invalid-fidelity-version');
  if (value > CURRENT_REPLAY_FIDELITY_VERSION)
    throw new ReplayFidelityVersionError('reload-required');
  return value as ReplayFidelityVersion;
}

/** Read only. Never backfill, mutate, upcast or admit an unvalidated source. */
export function readReplayFidelityVersion(payload: unknown): ReplayFidelityVersion {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
    throw new ReplayFidelityVersionError('invalid-fidelity-version');
  if (!Object.hasOwn(payload, 'replayFidelityVersion')) return LEGACY_REPLAY_FIDELITY_VERSION;
  return validateReplayFidelityVersion(Reflect.get(payload, 'replayFidelityVersion'));
}

/** A newer reader may advertise a maximum above this host's writer. */
export function canReadReplayFidelityVersion(version: ReplayFidelityVersion, readerMaximum: number | undefined): boolean {
  const maximum = readerMaximum ?? LEGACY_REPLAY_FIDELITY_VERSION;
  return Number.isSafeInteger(maximum) && maximum >= version;
}

export function isReplayFidelityReloadRequired(error: { readonly reason?: string }): boolean {
  return error.reason?.startsWith('reload-required:') === true;
}

export interface IReplayFidelityRule {
  readonly introducedIn: number;
  /** Immutable description of the introduced semantics. */
  readonly definition: string;
}
export interface IReplayFidelityRelease {
  readonly writer: number;
  readonly rules: Readonly<Record<string, IReplayFidelityRule>>;
}

/** Append named introductions when their semantic PR raises the writer. */
export const REPLAY_FIDELITY_RULES: Readonly<Record<string, IReplayFidelityRule>> = Object.freeze({});
export const REPLAY_FIDELITY_RELEASES: readonly IReplayFidelityRelease[] = Object.freeze([
  Object.freeze({ writer: 1, rules: Object.freeze({}) }),
  Object.freeze({ writer: 2, rules: REPLAY_FIDELITY_RULES }),
]);

/** Consumers use the named registry entry instead of ad-hoc numeric guards. */
export function isReplayFidelityRuleEnabled(version: number, rule: IReplayFidelityRule): boolean {
  return version >= rule.introducedIn;
}

/** Compare against frozen published-release fixtures and behavior witnesses. */
export function assertReplayFidelityRuleRelease(previous: IReplayFidelityRelease, next: IReplayFidelityRelease): void {
  let introduced = false;
  for (const [name, rule] of Object.entries(previous.rules)) {
    const retained = next.rules[name];
    if (!retained || retained.introducedIn !== rule.introducedIn || retained.definition !== rule.definition)
      throw new Error(`Published replay rule changed: ${name}`);
  }
  for (const [name, rule] of Object.entries(next.rules)) {
    if (Object.hasOwn(previous.rules, name)) continue;
    introduced = true;
    if (rule.introducedIn !== previous.writer + 1 || rule.introducedIn !== next.writer)
      throw new Error(`Replay rule reuses a published version: ${name}`);
  }
  if (introduced && next.writer !== previous.writer + 1)
    throw new Error('A semantic release must increment the writer exactly once');
}
