import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Rotating turret kind used for turret multiplier selection.
 */
export type VehicleTurretKind = 'single' | 'dual' | 'chin' | 'sponson';

/**
 * A single weapon mount on a vehicle.
 */
export interface VehicleWeaponMount {
  /** Canonical equipment id (e.g. `ppc`, `medium-laser`). */
  id: string;
  /** Mount location — `front`, `left`, `right`, `rear`, `turret`, `body`, `rotor`. */
  location: string;
  /** Whether this mount is rear-facing on a fixed-arc chassis. */
  isRearMounted?: boolean;
  /** Whether this mount rotates on a turret (single/dual/chin). */
  isTurretMounted?: boolean;
  /** Whether this mount is a sponson pair. */
  isSponsonMounted?: boolean;
  /** Override BV — if omitted the resolver provides it. */
  bvOverride?: number;
  /** Artemis type affecting BV, if linked. */
  artemisType?: 'iv' | 'v';
}

/**
 * A single ammunition bin on a vehicle.
 */
export interface VehicleAmmoMount {
  /** Canonical ammo id. */
  id: string;
  /** Location where the ammo is stored. */
  location: string;
  /** Optional explicit BV override. */
  bvOverride?: number;
  /** Optional explicit weaponType override (for ammo mapping). */
  weaponTypeOverride?: string;
}

/**
 * A defensive equipment mount (ECM, AMS, Guardian ECM, CASE, Chaff Pod, etc.)
 */
export interface VehicleDefensiveEquipmentMount {
  id: string;
  location: string;
  /** BV override — omit to resolve via equipment catalog. */
  bvOverride?: number;
}

/**
 * An offensive equipment mount — Targeting Computer, C3, active ECM role, etc.
 */
export interface VehicleOffensiveEquipmentMount {
  id: string;
  location: string;
  /** BV override — omit to resolve via equipment catalog. */
  bvOverride?: number;
  /** Flag the item as a targeting computer — activates +25% direct-fire multiplier. */
  isTargetingComputer?: boolean;
}

/**
 * Turret configuration used for multiplier calculation.
 */
export interface VehicleBVTurret {
  /** Ordinary turrets are neutral; sponsons retain their separate modifier. */
  kind: VehicleTurretKind;
}

/**
 * Input for vehicle BV calculation.
 */
export interface VehicleBVInput {
  /** Motion type — Tracked, Wheeled, Hover, VTOL, Hydrofoil, WiGE, Naval, Submarine, Rail, Maglev. */
  motionType: GroundMotionType;
  /** Support vehicles use the motion base without chassis-equipment additions. */
  isSupportVehicle?: boolean;
  /** All mounted IDs, including zero-BV chassis modifications. */
  chassisEquipment?: readonly string[];
  /** Store flags for installed chassis modifications, when not mounted as rows. */
  hasEnvironmentalSealing?: boolean;
  hasFlotationHull?: boolean;
  /** Cruise MP (walk equivalent). */
  cruiseMP: number;
  /** Flank MP — typically `ceil(cruise × 1.5)`. */
  flankMP: number;
  /** Jump MP (0 for tracked/wheeled/naval/rail). */
  jumpMP?: number;
  /** Submarine depth MP — overrides cruise for TMM when relevant. */
  submarineMP?: number;
  /** Raw tonnage; half contributes to offensive BV before the speed factor. */
  tonnage: number;
  /** Total allocated armor points. */
  totalArmorPoints: number;
  /** Total internal structure points. */
  totalStructurePoints: number;
  /** Armor type — lowercase normalized (`standard`, `ferro-fibrous`, `hardened`, `reactive`, `reflective`, `ferro-lamellor`, …). */
  armorType?: string;
  /** Internal structure type — `standard`, `endo-steel`, `composite`, `reinforced`. */
  structureType?: string;
  /** BAR rating 1-10 for support vehicles; `null` for combat vehicles. */
  barRating?: number | null;
  /** Weapon mounts. */
  weapons: VehicleWeaponMount[];
  /** Ammo bins. */
  ammo?: VehicleAmmoMount[];
  /** Defensive equipment. */
  defensiveEquipment?: VehicleDefensiveEquipmentMount[];
  /** Offensive equipment — TC, C3, Narc, active ECM, etc. */
  offensiveEquipment?: VehicleOffensiveEquipmentMount[];
  /** Explosive ammo penalty BV — MegaMek-style, already computed upstream. */
  explosivePenalty?: number;
  /** Primary turret configuration. */
  turret?: VehicleBVTurret;
  /** Secondary turret (dual-turret vehicles). */
  secondaryTurret?: VehicleBVTurret;
  /** Pilot gunnery skill (default 4). */
  gunnery?: number;
  /** Pilot piloting skill (default 5). */
  piloting?: number;
}

/**
 * Vehicle BV breakdown — populated on unit state.
 *
 * Keys called out in the spec delta: defensive, offensive, pilotMultiplier,
 * turretModifier, final (plus supporting fields for the status-bar dialog).
 */
export interface IVehicleBVBreakdown {
  /** Defensive BV component (post-defensive-factor). */
  defensive: number;
  /** Offensive BV component (post-speed-factor). */
  offensive: number;
  /** Pilot skill multiplier (gunnery × piloting matrix). */
  pilotMultiplier: number;
  /** Turret-modifier scalar applied to turret-mounted offensive BV. */
  turretModifier: number;
  /** Final BV — rounded integer. */
  final: number;

  /** Raw armor BV (pre-defensive-factor). */
  armorBV: number;
  /** Raw structure BV (pre-defensive-factor). */
  structureBV: number;
  /** Resolved defensive equipment BV. */
  defensiveEquipmentBV: number;
  /** Defensive factor = 1 + (TMM × 0.5 / 10). */
  defensiveFactor: number;
  /** Effective TMM used for the defensive factor and speed factor. */
  tmm: number;

  /** Weapon BV (turret-adjusted, rear-adjusted, TC-adjusted). */
  weaponBV: number;
  /** Ammo BV (capped per weapon family). */
  ammoBV: number;
  /** Resolved offensive equipment BV. */
  offensiveEquipmentBV: number;
  /** Speed factor scalar. */
  speedFactor: number;
}

// =============================================================================
// Defensive BV
// =============================================================================

export interface VehicleDefensiveBVBreakdown {
  armorBV: number;
  structureBV: number;
  defensiveEquipmentBV: number;
  explosivePenalty: number;
  defensiveFactor: number;
  tmm: number;
  total: number;
}

// =============================================================================
// Offensive BV
// =============================================================================

export interface VehicleOffensiveBVBreakdown {
  weaponBV: number;
  ammoBV: number;
  offensiveEquipmentBV: number;
  speedFactor: number;
  turretModifier: number;
  total: number;
}
