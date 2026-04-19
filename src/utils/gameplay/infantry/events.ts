/**
 * Infantry Combat Events
 *
 * Discriminated-union event types emitted by the infantry combat pipeline.
 * Resolvers collect these into a `readonly InfantryEvent[]` on their return
 * value; the combat engine is expected to fan them out to its event bus.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-infantry-combat-behavior/specs/infantry-unit-system/spec.md
 */

// ============================================================================
// Event tag enum
// ============================================================================

export enum InfantryEventType {
  /** Casualties taken in a single damage event. */
  INFANTRY_CASUALTIES = 'InfantryCasualties',
  /** A morale check was resolved. */
  INFANTRY_MORALE_CHECK = 'InfantryMoraleCheck',
  /** The platoon was pinned (skip next phase). */
  INFANTRY_PINNED = 'InfantryPinned',
  /** The platoon routed (removed from play). */
  INFANTRY_ROUTED = 'InfantryRouted',
  /** The platoon was eliminated (0 troopers remain). */
  INFANTRY_DESTROYED = 'InfantryDestroyed',
  /** A field gun shot was resolved. */
  FIELD_GUN_FIRED = 'FieldGunFired',
  /** The field gun was destroyed (all crew lost). */
  FIELD_GUN_DESTROYED = 'FieldGunDestroyed',
  /** An anti-mech leg attack was declared + resolved. */
  ANTI_MECH_LEG_ATTACK = 'AntiMechLegAttack',
}

// ============================================================================
// Event payloads
// ============================================================================

export interface IInfantryCasualtiesEvent {
  readonly type: InfantryEventType.INFANTRY_CASUALTIES;
  readonly unitId: string;
  /** Raw inbound damage before any modifiers. */
  readonly rawDamage: number;
  /** Damage after weapon anti-infantry multiplier + flak reduction. */
  readonly effectiveDamage: number;
  /** Trooper count killed by this hit. */
  readonly casualties: number;
  /** Surviving troopers after casualties. */
  readonly survivingTroopers: number;
}

export interface IInfantryMoraleCheckEvent {
  readonly type: InfantryEventType.INFANTRY_MORALE_CHECK;
  readonly unitId: string;
  /** The target number the 2d6 roll had to meet or beat. */
  readonly targetNumber: number;
  /** The 2d6 total rolled. */
  readonly rollTotal: number;
  /** The individual dice that produced `rollTotal`. */
  readonly dice: readonly [number, number];
  /** The leader modifier applied (positive helps, negative hurts). */
  readonly leaderModifier: number;
  /** Outcome: `pass` | `pinned` | `routed`. */
  readonly outcome: 'pass' | 'pinned' | 'routed';
  /** Margin below TN (0 on pass, 1 for pinned, ≥2 for routed). */
  readonly marginBelow: number;
}

export interface IInfantryPinnedEvent {
  readonly type: InfantryEventType.INFANTRY_PINNED;
  readonly unitId: string;
}

export interface IInfantryRoutedEvent {
  readonly type: InfantryEventType.INFANTRY_ROUTED;
  readonly unitId: string;
}

export interface IInfantryDestroyedEvent {
  readonly type: InfantryEventType.INFANTRY_DESTROYED;
  readonly unitId: string;
}

export interface IFieldGunFiredEvent {
  readonly type: InfantryEventType.FIELD_GUN_FIRED;
  readonly unitId: string;
  /** Target unit-id. */
  readonly targetUnitId: string;
  /** Mech-scale damage dealt by the gun. */
  readonly damage: number;
  /** Range band the shot was fired at ('short' | 'medium' | 'long'). */
  readonly rangeBand: 'short' | 'medium' | 'long';
  /** Remaining field-gun ammo after this shot. */
  readonly ammoRemaining: number;
}

export interface IFieldGunDestroyedEvent {
  readonly type: InfantryEventType.FIELD_GUN_DESTROYED;
  readonly unitId: string;
  readonly cause: 'crew_lost' | 'platoon_destroyed';
}

export interface IAntiMechLegAttackEvent {
  readonly type: InfantryEventType.ANTI_MECH_LEG_ATTACK;
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly rollTotal: number;
  readonly targetNumber: number;
  readonly success: boolean;
  /** Damage dealt to the mech leg on success, or 0 on failure. */
  readonly damage: number;
  /** Counter-casualties taken by the platoon on failure. */
  readonly counterCasualties: number;
}

/** Union of all infantry combat events. */
export type InfantryEvent =
  | IInfantryCasualtiesEvent
  | IInfantryMoraleCheckEvent
  | IInfantryPinnedEvent
  | IInfantryRoutedEvent
  | IInfantryDestroyedEvent
  | IFieldGunFiredEvent
  | IFieldGunDestroyedEvent
  | IAntiMechLegAttackEvent;
