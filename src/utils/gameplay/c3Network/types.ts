import { IHexCoordinate, RangeBracket } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

/** C3 network type */
export type C3NetworkType = 'master-slave' | 'improved' | 'nova';

/** Role of a unit within a C3 network */
export type C3UnitRole = 'master' | 'slave' | 'c3i' | 'nova';

export type C3EquipmentNetworkFormationDenialReason =
  | 'ambiguous-unit-equipment'
  | 'mixed-network-families'
  | 'multiple-master-units'
  | 'oversized-master-slave-network'
  | 'incomplete-master-slave-network'
  | 'oversized-c3i-network'
  | 'insufficient-c3i-members'
  | 'oversized-nova-network'
  | 'insufficient-nova-members';

/** Source-backed mounted C3 equipment projected into combat state. */
export interface IC3EquipmentMountState {
  /** Network role implied by the mounted C3 equipment. */
  readonly role: C3UnitRole;
  /** Original catalog/full-unit equipment id or critical-slot label. */
  readonly sourceEquipmentId: string;
  /** Mount location when the catalog source provides one. */
  readonly sourceLocation?: string;
  /** Boosted C3 variants retain their explicit equipment distinction. */
  readonly boosted?: boolean;
}

export interface IC3EquipmentNetworkFormationDenial {
  readonly teamId: string;
  readonly reason: C3EquipmentNetworkFormationDenialReason;
  readonly unitIds: readonly string[];
  readonly roles: readonly C3UnitRole[];
  readonly message: string;
}

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

export interface IC3EquipmentNetworkFormationResult {
  readonly state?: IC3NetworkState;
  readonly denials: readonly IC3EquipmentNetworkFormationDenial[];
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

/** Optional rule hooks that constrain C3 target data sharing. */
export interface IC3TargetingOptions {
  /**
   * When true, non-attacker C3 spotters must have target line of sight before
   * their range bracket can improve the attack.
   */
  readonly requireSpotterTargetLineOfSight?: boolean;
  /** Caller-provided LOS predicate for the candidate C3 spotter. */
  readonly spotterHasTargetLineOfSight?: (spotter: IC3NetworkUnit) => boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum units in a C3 Master/Slave network */
export const C3_MASTER_SLAVE_MAX_UNITS = 4;

/** Maximum units in a C3i (Improved) network */
export const C3I_MAX_UNITS = 6;

/** Maximum units in a Nova CEWS network */
export const C3_NOVA_MAX_UNITS = 3;
