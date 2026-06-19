import type {
  ICombatLineOfSightBlocker,
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

export type TacticalMapHexProjectionIntent =
  | 'terrain'
  | 'selected'
  | 'path'
  | 'movement'
  | 'combat'
  | 'movement-combat'
  | 'los-blocker';

export type TacticalMapHexProjectionStatus =
  | 'neutral'
  | 'legal'
  | 'blocked'
  | 'mixed';

export type TacticalMapMovementProjectionStatus =
  | 'none'
  | 'legal'
  | 'blocked'
  | 'mixed';

export type TacticalMapMovementCostProjectionStatus =
  | 'none'
  | 'ordinary'
  | 'costly';

export type TacticalMapMovementHazardProjectionStatus =
  | 'none'
  | 'represented-minefield';

export type TacticalMapCombatProjectionStatus =
  | 'none'
  | 'range-only'
  | 'attackable'
  | 'blocked'
  | 'mixed';

export type TacticalMapProjectionSourceKind =
  | 'official-battletech'
  | 'megamek'
  | 'mekhq'
  | 'mekstation';

export type TacticalMapProjectionSourceChannel =
  | 'terrain-elevation'
  | 'movement'
  | 'combat'
  | 'los-blocker'
  | 'legacy-attack-range';

export interface ITacticalMapProjectionSourceReference {
  readonly channel: TacticalMapProjectionSourceChannel;
  readonly kind: TacticalMapProjectionSourceKind;
  readonly label: string;
  readonly detail?: string;
  readonly ruleReferences?: readonly string[];
}

export interface ITacticalMapCombatLosBlockerReference {
  readonly targetHex: IHexCoordinate;
  readonly targetUnitIds: readonly string[];
  readonly losState: ICombatRangeHex['losState'];
  readonly blocker: ICombatLineOfSightBlocker;
}

export interface ITacticalMapHexProjection {
  readonly hex: IHexCoordinate;
  readonly key: string;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly pathIndex?: number;
  readonly inAttackRange: boolean;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly movementStatus: TacticalMapMovementProjectionStatus;
  readonly movementCostStatus: TacticalMapMovementCostProjectionStatus;
  readonly movementCostReasons: readonly string[];
  readonly movementHazardStatus: TacticalMapMovementHazardProjectionStatus;
  readonly movementHazardReasons: readonly string[];
  readonly combatStatus: TacticalMapCombatProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly sourceReferences: readonly ITacticalMapProjectionSourceReference[];
  readonly explanation: string;
}

export interface BuildTacticalMapHexProjectionLookupInput {
  readonly hexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly movementRangeLookup: ReadonlyMap<string, IMovementRangeHex>;
  readonly combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>;
  readonly selectedHex?: IHexCoordinate | null;
  readonly hoveredHex?: IHexCoordinate | null;
  readonly highlightPathIndexLookup?: ReadonlyMap<string, number>;
  readonly legacyAttackRangeLookup?: ReadonlySet<string>;
}

export interface ProjectionExplanationInput {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly intent: TacticalMapHexProjectionIntent;
  readonly status: TacticalMapHexProjectionStatus;
  readonly movementStatus: TacticalMapMovementProjectionStatus;
  readonly movementCostStatus: TacticalMapMovementCostProjectionStatus;
  readonly movementCostReasons: readonly string[];
  readonly movementHazardStatus: TacticalMapMovementHazardProjectionStatus;
  readonly movementHazardReasons: readonly string[];
  readonly combatStatus: TacticalMapCombatProjectionStatus;
  readonly blockedReasons: readonly string[];
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly sourceReferences: readonly ITacticalMapProjectionSourceReference[];
  readonly legacyAttackRangeOnly: boolean;
}
