/**
 * Generic interface for entities that track status changes.
 *
 * @template TStatus - The status enum or union type
 *
 * @example
 * interface IPilot extends IStatusTrackable<PilotStatus> {
 *   name: string;
 *   skills: IPilotSkills;
 * }
 *
 * @example
 * interface ICampaignUnit extends IStatusTrackable<CampaignUnitStatus> {
 *   unitId: string;
 *   armorPoints: number;
 * }
 */
export interface IStatusTrackable<TStatus extends string = string> {
  /** Current status of this entity */
  readonly status: TStatus;

  /** Timestamp when status was last changed (ISO 8601) */
  readonly statusChangedAt?: string;

  /** History of status changes for audit trail */
  readonly statusHistory?: IStatusHistoryEntry<TStatus>[];
}

/**
 * Entry in status history for audit tracking
 */
export interface IStatusHistoryEntry<TStatus extends string = string> {
  /** Previous status */
  readonly previousStatus: TStatus;
  /** New status */
  readonly newStatus: TStatus;
  /** When the change occurred */
  readonly changedAt: string;
  /** Optional reason for the change */
  readonly reason?: string;
}
