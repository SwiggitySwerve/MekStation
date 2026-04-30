/**
 * Infantry Unit Interfaces
 *
 * Canonical types for infantry platoon construction per TechManual rules.
 * Discriminated unions are used for motive type and specialization.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

// ============================================================================
// Motive Type (infantry-specific, more granular than SquadMotionType)
// ============================================================================

/**
 * Infantry motive type per TW platoon rules.
 *
 * Foot and Jump are leg-powered. Motorized uses trucks/APCs shared by platoon.
 * Mechanized subtypes each correspond to a vehicle hull class.
 */
export enum InfantryMotive {
  FOOT = 'Foot',
  JUMP = 'Jump',
  MOTORIZED = 'Motorized',
  MECHANIZED_TRACKED = 'MechanizedTracked',
  MECHANIZED_WHEELED = 'MechanizedWheeled',
  MECHANIZED_HOVER = 'MechanizedHover',
  MECHANIZED_VTOL = 'MechanizedVTOL',
}

// ============================================================================
// Movement Points by Motive
// ============================================================================

/** Ground and jump MP pair for a platoon */
export interface IInfantryMP {
  /** Hexes moved on the ground per turn */
  readonly groundMP: number;
  /** Hexes moved via jump per turn (0 if no jump capability) */
  readonly jumpMP: number;
}

/**
 * Movement mode descriptor used by construction summaries.
 *
 * `vertical` is used for Mechanized VTOL platoons so UI/record-sheet consumers
 * can distinguish VTOL movement from ground MP that merely happens to be 6.
 */
export type InfantryMovementMode = 'ground' | 'jump' | 'vertical';

// ============================================================================
// Platoon Composition
// ============================================================================

/**
 * Platoon composition: squad count × troopers per squad.
 *
 * total troopers = squads × troopersPerSquad, capped at 30.
 */
export interface IPlatoonComposition {
  /** Number of squads (1–10) */
  readonly squads: number;
  /** Troopers per squad (1–10) */
  readonly troopersPerSquad: number;
}

// ============================================================================
// Armor Kit
// ============================================================================

/**
 * Armor kit applied to a platoon.
 * Sneak variants require Foot motive.
 * EnvironmentalSealing enables vacuum / underwater deployment.
 */
export enum InfantryArmorKitType {
  STANDARD = 'Standard',
  FLAK = 'Flak',
  CAMO = 'Camo',
  SNOW_CAMO = 'SnowCamo',
  ENVIRONMENTAL_SEALING = 'EnvironmentalSealing',
  SNEAK_CAMO = 'SneakCamo',
  SNEAK_IR = 'SneakIR',
  SNEAK_ECM = 'SneakECM',
  CLAN = 'Clan',
  NONE = 'None',
}

// ============================================================================
// Weapon Table Entry
// ============================================================================

/**
 * A single entry from the infantry weapon table.
 * damage/divisor and range info are consumed by combat calculations.
 */
export interface IInfantryWeaponEntry {
  /** Stable catalog ID matching equipment database keys */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Whether this is a heavy support weapon (Mechanized/Motorized only) */
  readonly isHeavy: boolean;
  /** Damage divisor applied to trooper count per TW rules */
  readonly damageDivisor: number;
  /** Short-range bracket (hexes) */
  readonly rangeShort: number;
  /** Medium-range bracket (hexes) */
  readonly rangeMedium: number;
  /** Long-range bracket (hexes) */
  readonly rangeLong: number;
  /** Heat generated per volley (for fusion weapons) */
  readonly heat: number;
  /** Ammo type identifier (empty string if no ammo required) */
  readonly ammoType: string;
  /** Special rule tags consumed by combat/record-sheet callers */
  readonly special: readonly string[];
  /** Secondary weapon ratio denominator (1 per N troopers) */
  readonly secondaryRatio: number;
}

// ============================================================================
// Field Gun
// ============================================================================

/**
 * Spec-name field gun shape.
 *
 * This is the construction-facing name requested by the OpenSpec delta. Runtime
 * store objects use `IInfantryFieldGun`, which extends this shape with the
 * legacy `equipmentId/name/crew` fields already consumed by the UI and BV
 * adapter.
 */
export interface IFieldGun {
  /** Weapon catalog ID matching the approved field-gun list */
  readonly weaponId: string;
  /** Ammo rounds allocated to this field gun */
  readonly ammoRounds: number;
  /** Number of troopers required to operate the gun */
  readonly crewCount: number;
}

/**
 * Field gun configuration: a mech-scale weapon crewed by platoon members.
 *
 * Crew members operating the gun do NOT fire personal weapons.
 * Field guns are not allowed for Jump or Mechanized motive platoons.
 */
export interface IInfantryFieldGun extends IFieldGun {
  /** Equipment ID matching the weapon catalog */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Number of troopers required to operate the gun */
  readonly crew: number;
  /** Ammo rounds allocated to this field gun */
  readonly ammoRounds: number;
}

// ============================================================================
// Field Gun Catalog Entry
// ============================================================================

/**
 * An entry in the approved field-gun list.
 */
export interface IFieldGunCatalogEntry {
  /** Stable equipment ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Deployed weapon tonnage for transport/reference display */
  readonly tonnage: number;
  /** Minimum crew required */
  readonly crewRequired: number;
  /** Standard ammo bin count */
  readonly defaultAmmoRounds: number;
}

// ============================================================================
// Spec-name infantry construction shape
// ============================================================================

/**
 * Spec-name construction shape for conventional infantry.
 *
 * Existing runtime state keeps backwards-compatible names such as
 * `infantryMotive`, `fieldGuns`, and `hasAntiMechTraining`. This interface
 * gives spec consumers the requested names without replacing those established
 * store fields.
 */
export interface IInfantryUnit {
  /** Construction motive type; maps to store `infantryMotive` */
  readonly motiveType: InfantryMotive;
  /** Platoon composition: squads x troopers per squad */
  readonly platoonComposition: IPlatoonComposition;
  /** Construction armor kit */
  readonly armorKit: InfantryArmorKitType;
  /** Primary weapon table ID or display name */
  readonly primaryWeapon: string;
  /** Optional secondary weapon table ID or display name */
  readonly secondaryWeapon?: string;
  /** Optional single field gun; store state keeps this as `fieldGuns[0]` */
  readonly fieldGun?: IFieldGun;
  /** Anti-mech training flag; maps to store `hasAntiMechTraining` */
  readonly antiMechTraining: boolean;
}

// ============================================================================
// Anti-Mech Training
// ============================================================================

/**
 * Motives that are eligible for anti-mech training.
 * Motorized is explicitly excluded per TW rules.
 */
export const ANTI_MECH_ELIGIBLE_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.FOOT,
  InfantryMotive.JUMP,
  InfantryMotive.MECHANIZED_TRACKED,
  InfantryMotive.MECHANIZED_WHEELED,
  InfantryMotive.MECHANIZED_HOVER,
  InfantryMotive.MECHANIZED_VTOL,
]);

// ============================================================================
// Sneak-suit eligible motives
// ============================================================================

/** Only Foot platoons may use sneak armor suits */
export const SNEAK_ELIGIBLE_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.FOOT,
]);

/** Sneak armor kit variants */
export const SNEAK_ARMOR_KITS = new Set<InfantryArmorKitType>([
  InfantryArmorKitType.SNEAK_CAMO,
  InfantryArmorKitType.SNEAK_IR,
  InfantryArmorKitType.SNEAK_ECM,
]);

// ============================================================================
// Platoon Defaults per Motive
// ============================================================================

/**
 * Default platoon composition per TechManual tables for each motive type.
 */
export const PLATOON_DEFAULTS: Record<InfantryMotive, IPlatoonComposition> = {
  [InfantryMotive.FOOT]: { squads: 7, troopersPerSquad: 4 },
  [InfantryMotive.JUMP]: { squads: 5, troopersPerSquad: 5 },
  [InfantryMotive.MOTORIZED]: { squads: 7, troopersPerSquad: 4 },
  [InfantryMotive.MECHANIZED_TRACKED]: { squads: 4, troopersPerSquad: 5 },
  [InfantryMotive.MECHANIZED_WHEELED]: { squads: 4, troopersPerSquad: 5 },
  [InfantryMotive.MECHANIZED_HOVER]: { squads: 4, troopersPerSquad: 5 },
  [InfantryMotive.MECHANIZED_VTOL]: { squads: 2, troopersPerSquad: 5 },
};

/**
 * Movement points per motive type per TechManual.
 */
export const MOTIVE_MP: Record<InfantryMotive, IInfantryMP> = {
  [InfantryMotive.FOOT]: { groundMP: 1, jumpMP: 0 },
  [InfantryMotive.JUMP]: { groundMP: 3, jumpMP: 3 },
  [InfantryMotive.MOTORIZED]: { groundMP: 3, jumpMP: 0 },
  [InfantryMotive.MECHANIZED_TRACKED]: { groundMP: 3, jumpMP: 0 },
  [InfantryMotive.MECHANIZED_WHEELED]: { groundMP: 4, jumpMP: 0 },
  [InfantryMotive.MECHANIZED_HOVER]: { groundMP: 5, jumpMP: 0 },
  [InfantryMotive.MECHANIZED_VTOL]: { groundMP: 6, jumpMP: 0 },
};

/**
 * Full construction profile for each motive.
 */
export interface IInfantryMotiveProfile {
  readonly motive: InfantryMotive;
  readonly defaultComposition: IPlatoonComposition;
  readonly movement: IInfantryMP;
  readonly movementMode: InfantryMovementMode;
  /** Mechanized transport adds platoon-scale protection without mech armor */
  readonly hasMechanizedArmor: boolean;
}

/** Motive defaults, movement, and construction flags in one table. */
export const INFANTRY_MOTIVE_PROFILES: Record<
  InfantryMotive,
  IInfantryMotiveProfile
> = {
  [InfantryMotive.FOOT]: {
    motive: InfantryMotive.FOOT,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.FOOT],
    movement: MOTIVE_MP[InfantryMotive.FOOT],
    movementMode: 'ground',
    hasMechanizedArmor: false,
  },
  [InfantryMotive.JUMP]: {
    motive: InfantryMotive.JUMP,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.JUMP],
    movement: MOTIVE_MP[InfantryMotive.JUMP],
    movementMode: 'jump',
    hasMechanizedArmor: false,
  },
  [InfantryMotive.MOTORIZED]: {
    motive: InfantryMotive.MOTORIZED,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.MOTORIZED],
    movement: MOTIVE_MP[InfantryMotive.MOTORIZED],
    movementMode: 'ground',
    hasMechanizedArmor: false,
  },
  [InfantryMotive.MECHANIZED_TRACKED]: {
    motive: InfantryMotive.MECHANIZED_TRACKED,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.MECHANIZED_TRACKED],
    movement: MOTIVE_MP[InfantryMotive.MECHANIZED_TRACKED],
    movementMode: 'ground',
    hasMechanizedArmor: true,
  },
  [InfantryMotive.MECHANIZED_WHEELED]: {
    motive: InfantryMotive.MECHANIZED_WHEELED,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.MECHANIZED_WHEELED],
    movement: MOTIVE_MP[InfantryMotive.MECHANIZED_WHEELED],
    movementMode: 'ground',
    hasMechanizedArmor: true,
  },
  [InfantryMotive.MECHANIZED_HOVER]: {
    motive: InfantryMotive.MECHANIZED_HOVER,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.MECHANIZED_HOVER],
    movement: MOTIVE_MP[InfantryMotive.MECHANIZED_HOVER],
    movementMode: 'ground',
    hasMechanizedArmor: true,
  },
  [InfantryMotive.MECHANIZED_VTOL]: {
    motive: InfantryMotive.MECHANIZED_VTOL,
    defaultComposition: PLATOON_DEFAULTS[InfantryMotive.MECHANIZED_VTOL],
    movement: MOTIVE_MP[InfantryMotive.MECHANIZED_VTOL],
    movementMode: 'vertical',
    hasMechanizedArmor: true,
  },
};

/**
 * Maximum troopers for VTOL motive per TW rules.
 */
export const VTOL_MAX_TROOPERS = 10;

/** Platoon size bounds */
export const PLATOON_MIN_TROOPERS = 5;
export const PLATOON_MAX_TROOPERS = 30;
