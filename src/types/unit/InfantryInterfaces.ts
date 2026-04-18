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
  FOOT = "Foot",
  JUMP = "Jump",
  MOTORIZED = "Motorized",
  MECHANIZED_TRACKED = "MechanizedTracked",
  MECHANIZED_WHEELED = "MechanizedWheeled",
  MECHANIZED_HOVER = "MechanizedHover",
  MECHANIZED_VTOL = "MechanizedVTOL",
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
  STANDARD = "Standard",
  FLAK = "Flak",
  CAMO = "Camo",
  SNOW_CAMO = "SnowCamo",
  ENVIRONMENTAL_SEALING = "EnvironmentalSealing",
  SNEAK_CAMO = "SneakCamo",
  SNEAK_IR = "SneakIR",
  SNEAK_ECM = "SneakECM",
  CLAN = "Clan",
  NONE = "None",
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
  /** Secondary weapon ratio denominator (1 per N troopers) */
  readonly secondaryRatio: number;
}

// ============================================================================
// Field Gun
// ============================================================================

/**
 * Field gun configuration: a mech-scale weapon crewed by platoon members.
 *
 * Crew members operating the gun do NOT fire personal weapons.
 * Field guns are not allowed for Jump or Mechanized motive platoons.
 */
export interface IInfantryFieldGun {
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
  /** Minimum crew required */
  readonly crewRequired: number;
  /** Standard ammo bin count */
  readonly defaultAmmoRounds: number;
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
 * Maximum troopers for VTOL motive per TW rules.
 */
export const VTOL_MAX_TROOPERS = 10;

/** Platoon size bounds */
export const PLATOON_MIN_TROOPERS = 5;
export const PLATOON_MAX_TROOPERS = 30;
