/**
 * MissionStatus - Campaign mission status enumeration
 * Defines the outcome status of a mission, the transitions between
 * statuses, and what each status is worth when a contract pays out.
 *
 * Mirrors MekHQ's `MissionStatus` (ACTIVE, SUCCESS, PARTIAL, FAILED,
 * BREACH) plus PENDING for offers and missions not yet accepted.
 */

/**
 * Mission outcome status
 */
export enum MissionStatus {
  /** Mission currently active/in progress */
  ACTIVE = 'Active',

  /** Mission completed successfully */
  SUCCESS = 'Success',

  /** Mission partially completed */
  PARTIAL = 'Partial Success',

  /** Mission failed */
  FAILED = 'Failed',

  /**
   * Contract breach. Reserved: MekHQ writes it (complete-mission dialog,
   * early end) and turnover and the missions page read it, but MekStation
   * has no writer yet. It stays so a MekHQ-shaped result can be stored.
   */
  BREACH = 'Breach',

  /** Mission pending start */
  PENDING = 'Pending',
}

/**
 * Array of all valid MissionStatus values for iteration
 */
export const ALL_MISSION_STATUSES: readonly MissionStatus[] = Object.freeze([
  MissionStatus.ACTIVE,
  MissionStatus.SUCCESS,
  MissionStatus.PARTIAL,
  MissionStatus.FAILED,
  MissionStatus.BREACH,
  MissionStatus.PENDING,
]);

/**
 * The one transition table every status writer goes through (post-battle,
 * expiry, accept, store merge). A status with no outgoing edge is terminal:
 * nothing may reopen or re-settle it, so a settled contract cannot be paid
 * twice.
 *
 * PENDING reaching a terminal status directly exists only for
 * compatibility: post-battle has always been able to settle a contract
 * that was never marked ACTIVE. No current writer produces that, and the
 * edges are not an invitation to.
 */
export const MISSION_TRANSITIONS: Readonly<
  Record<MissionStatus, readonly MissionStatus[]>
> = Object.freeze({
  [MissionStatus.PENDING]: Object.freeze([
    MissionStatus.ACTIVE,
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
  ]),
  [MissionStatus.ACTIVE]: Object.freeze([
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
  ]),
  [MissionStatus.SUCCESS]: Object.freeze([]),
  [MissionStatus.PARTIAL]: Object.freeze([]),
  [MissionStatus.FAILED]: Object.freeze([]),
  [MissionStatus.BREACH]: Object.freeze([]),
});

/**
 * Whether the table has an edge from `from` to `to`. A `from` outside the
 * table (a hand-built object; persisted values are normalized at load)
 * has no edges.
 */
export function canTransitionMissionStatus(
  from: MissionStatus,
  to: MissionStatus,
): boolean {
  const next = MISSION_TRANSITIONS[from] as
    | readonly MissionStatus[]
    | undefined;
  return next?.includes(to) === true;
}

/**
 * Whether a mission has reached a final outcome: it has no outgoing edge.
 *
 * Persisted values are normalized to the union at load
 * (`parseMissionStatus`), so a value outside the table only reaches here
 * from a hand-built object; it stays non-terminal, as it always has.
 */
export function isTerminalMissionStatus(status: MissionStatus): boolean {
  const next = MISSION_TRANSITIONS[status] as
    | readonly MissionStatus[]
    | undefined;
  return next !== undefined && next.length === 0;
}

/**
 * The payout column a status selects in `IPaymentTerms`. Only SUCCESS and
 * PARTIAL pay their own column; every other status pays the failure
 * amount.
 */
export function missionPayoutOutcome(
  status: MissionStatus,
): 'success' | 'partial' | 'failure' {
  switch (status) {
    case MissionStatus.SUCCESS:
      return 'success';
    case MissionStatus.PARTIAL:
      return 'partial';
    case MissionStatus.ACTIVE:
    case MissionStatus.PENDING:
    case MissionStatus.FAILED:
    case MissionStatus.BREACH:
      return 'failure';
    default: {
      // Compile-time exhaustiveness; a stray runtime value keeps the
      // failure payout it always got.
      const unreachable: never = status;
      void unreachable;
      return 'failure';
    }
  }
}

/**
 * Check if a value is a valid MissionStatus
 */
export function isValidMissionStatus(value: unknown): value is MissionStatus {
  return Object.values(MissionStatus).includes(value as MissionStatus);
}

/**
 * Read a persisted status string back into the union.
 *
 * - A live value passes through.
 * - 'Cancelled' and 'Aborted' were never written but were terminal with the
 *   failure payout, so they load as FAILED and behave as they did.
 * - Anything else returns `undefined`; the loader decides what to do.
 */
export function parseMissionStatus(value: unknown): MissionStatus | undefined {
  if (isValidMissionStatus(value)) return value;
  switch (value) {
    case 'Cancelled':
    case 'Aborted':
      return MissionStatus.FAILED;
    default:
      return undefined;
  }
}

/**
 * Display name for MissionStatus
 */
export function displayMissionStatus(status: MissionStatus): string {
  return status;
}
