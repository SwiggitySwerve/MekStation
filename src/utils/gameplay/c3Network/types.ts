import { IHexCoordinate, RangeBracket } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

/** C3 network type */
export type C3NetworkType = 'master-slave' | 'improved';

/** Role of a unit within a C3 network */
export type C3UnitRole = 'master' | 'slave' | 'c3i';

/** A unit participating in a C3 network */
export interface IC3NetworkUnit {
  /** Unit entity ID */
  readonly entityId: string;
  /** Team/player ID */
  readonly teamId: string;
  /** Role in the network */
  readonly role: C3UnitRole;
  /** Current hex position */
  readonly position: IHexCoordinate;
  /** Whether the unit is operational (not destroyed) */
  readonly operational: boolean;
  /**
   * Whether this unit's C3 is disrupted by ECM.
   * Set via {@link updateC3UnitECMStatus} after resolving ECM status with
   * {@link resolveECMStatus} from electronicWarfare.ts, or use the convenience
   * helper {@link resolveC3ECMDisruption} to batch-update all C3 members.
   */
  readonly ecmDisrupted: boolean;
}

/** A C3 network connecting multiple units */
export interface IC3Network {
  /** Unique network ID */
  readonly networkId: string;
  /** Network type */
  readonly type: C3NetworkType;
  /** Team that owns this network */
  readonly teamId: string;
  /** Units in the network */
  readonly members: readonly IC3NetworkUnit[];
}

/** Battlefield C3 network state */
export interface IC3NetworkState {
  /** All active C3 networks on the battlefield */
  readonly networks: readonly IC3Network[];
}

/** Result of attempting to get C3 targeting benefit */
export interface IC3TargetingResult {
  /** Whether C3 benefit applies */
  readonly benefitApplied: boolean;
  /** Best range bracket found across network */
  readonly bestBracket: RangeBracket;
  /** Entity ID of the unit providing the best range */
  readonly spotterId: string | null;
  /** Distance from spotter to target */
  readonly spotterRange: number | null;
  /** Reason if benefit was denied */
  readonly denialReason: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum units in a C3 Master/Slave network */
export const C3_MASTER_SLAVE_MAX_UNITS = 4;

/** Maximum units in a C3i (Improved) network */
export const C3I_MAX_UNITS = 6;
