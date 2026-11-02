/**
 * Infantry BV Adapter
 *
 * Translates an infantry platoon store state into the well-typed
 * `InfantryBVInput` consumed by `calculateInfantryBV`. Keeps BV calculation
 * decoupled from Zustand store shape (store evolves independently of math).
 *
 * The adapter is deliberately tolerant:
 *   - Missing / unknown primary weapon IDs fall back to an inferred table entry
 *     using the human-readable name; if still unresolved, `damageDivisor`
 *     defaults to 10 (the most common personal weapon divisor).
 *   - Secondary weapon is optional — omitted when the state has no secondary.
 *   - Field-gun ammo bins are synthesized from `ammoRounds` via a conventional
 *     id pattern; concrete projects wire real ammo ids via the field-gun
 *     catalog as they expand coverage.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';
import {
  InfantryMotive,
  IPlatoonComposition,
} from '@/types/unit/InfantryInterfaces';
import { IInfantry, InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import {
  calculateInfantryBV,
  IInfantryBVBreakdown,
  InfantryBVInput,
  InfantryFieldGunMount,
  InfantryWeaponRef,
} from './infantryBV';
import { infantryBVArmorFlags } from './infantryBVFactors';
import {
  infantryCatalogFacts,
  infantryCatalogState,
  infantrySourceFieldGuns,
} from './infantrySourceMounts';
import { totalTroopers } from './platoonComposition';
import { findWeaponById, INFANTRY_WEAPON_TABLE } from './weaponTable';

// Store-shape contract

/**
 * Minimal subset of the infantry store state required to compute BV.
 *
 * We deliberately avoid importing `InfantryStore` here to keep the calculator
 * free of Zustand typing and a circular store <-> calculator dependency.
 */
export interface InfantryStateLike {
  hasArmorKit?: boolean;
  bvArmorFlags?: IInfantry['bvArmorFlags'];
  bvOffense?: IInfantry['bvOffense'];
  /** Effective incoming protection from the source boundary, when available. */
  damageDivisor?: number;
  hasPheromoneEffuser?: boolean;
  /** Granular construction motive (drives MP and composition defaults). */
  infantryMotive: InfantryMotive;
  /** Platoon composition — converted to a trooper count via `totalTroopers`. */
  platoonComposition: IPlatoonComposition;
  /** Armor kit drives per-trooper BV modifier. */
  armorKit: InfantryArmorKit;
  /** Anti-mech training flag → platoon × 1.1. */
  hasAntiMechTraining: boolean;
  /** Primary weapon display name (e.g. "Rifle"). */
  primaryWeapon: string;
  /** Primary weapon canonical equipment id (e.g. `inf-rifle`). */
  primaryWeaponId?: string;
  /** Secondary weapon display name (optional). */
  secondaryWeapon?: string;
  /** Secondary weapon canonical equipment id (optional). */
  secondaryWeaponId?: string;
  /** Number of secondary weapons in the platoon (0 when no secondary). */
  secondaryWeaponCount: number;
  /** Field guns crewed by the platoon. */
  fieldGuns: readonly IInfantryFieldGun[];
}

// Primary weapon resolution

/**
 * Resolve a trooper weapon spec by id or name.
 *
 * Priority:
 *   1. `findWeaponById(id)` — canonical table lookup.
 *   2. name-based fallback — matches the display name against the table.
 *   3. defaults — divisor 10, no secondary ratio, catalog-resolved BV.
 *
 * The returned `damageDivisor` and `secondaryRatio` come from the canonical
 * weapon table when possible — they never come from runtime store data.
 */
function resolveTrooperWeapon(
  id: string | undefined,
  displayName: string | undefined,
): { damageDivisor: number; secondaryRatio: number; resolvedId: string } {
  const entryById = id ? findWeaponById(id) : undefined;
  if (entryById) {
    return {
      damageDivisor: entryById.damageDivisor,
      secondaryRatio: entryById.secondaryRatio,
      resolvedId: entryById.id,
    };
  }

  if (displayName) {
    const normalized = displayName.trim().toLowerCase();
    const byName = findWeaponTableEntryByName(normalized);
    if (byName) {
      return {
        damageDivisor: byName.damageDivisor,
        secondaryRatio: byName.secondaryRatio,
        resolvedId: byName.id,
      };
    }
  }

  return {
    damageDivisor: 10,
    secondaryRatio: 4,
    resolvedId: id ?? displayName ?? 'inf-rifle',
  };
}

/**
 * Name-based lookup helper — local to the adapter.
 * The canonical `findWeaponById` is the public API; name-fallback is a
 * robustness measure for stores that only carry a display string.
 */
function findWeaponTableEntryByName(
  normalized: string,
): ReturnType<typeof findWeaponById> | undefined {
  return INFANTRY_WEAPON_TABLE.find(
    (w) =>
      w.name.toLowerCase() === normalized ||
      w.id.toLowerCase() === normalized ||
      w.name.toLowerCase().replace(/\s+/g, '-') === normalized,
  );
}

// Field gun ammo synthesis

/**
 * Infer the ammo id for a field gun.
 *
 * The field-gun catalog uses canonical weapon ids (`ac5`, `lrm15`, `mg`).
 * Mech-scale ammo uses the `is-ammo-<weapon>` family — we map the gun id to
 * the conventional IS ammo id so the equipment catalog resolver can supply
 * a BV. When the resolver fails, the adapter gracefully emits a 0-BV entry.
 */
const FIELD_GUN_AMMO_IDS = {
  mg: 'isammomg',
  ac2: 'isammoac2',
  ac5: 'isammoac5',
  ac10: 'isammoac10',
  ac20: 'isammoac20',
  srm2: 'isammosrm2',
  srm4: 'isammosrm4',
  srm6: 'isammosrm6',
  lrm5: 'isammolrm5',
  lrm10: 'isammolrm10',
  lrm15: 'isammolrm15',
  lrm20: 'isammolrm20',
  flamer: 'isammoflamer',
} as const satisfies Readonly<Record<string, string>>;

type FieldGunAmmoWeaponId = keyof typeof FIELD_GUN_AMMO_IDS;

function isKnownFieldGunAmmoWeaponId(
  gunId: string,
): gunId is FieldGunAmmoWeaponId {
  return Object.prototype.hasOwnProperty.call(FIELD_GUN_AMMO_IDS, gunId);
}

function ammoIdForFieldGun(gunId: string): string {
  if (isKnownFieldGunAmmoWeaponId(gunId)) {
    return FIELD_GUN_AMMO_IDS[gunId];
  }
  return `isammo${gunId.replace(/[^a-z0-9]/gi, '')}`;
}

/**
 * Build `InfantryFieldGunMount[]` from store-shape field guns.
 *
 * Each field gun gets a single ammo bin (the standard 1-ton bin). The ammo
 * excessive-cap in `calculateAmmoBVWithExcessiveCap` already handles scaling
 * when multiple guns of the same family share ammo.
 */
function adaptFieldGuns(
  guns: readonly IInfantryFieldGun[],
): InfantryFieldGunMount[] {
  return guns.map((gun) => {
    const ammoBins: InfantryFieldGunMount['ammo'] =
      gun.ammoRounds && gun.ammoRounds > 0
        ? [
            {
              id: ammoIdForFieldGun(gun.weaponId),
              weaponTypeOverride: gun.weaponId,
            },
          ]
        : [];
    return {
      id: gun.weaponId,
      ammo: ammoBins,
    };
  });
}

// Main adapter

/**
 * Compute the infantry BV breakdown from a store-shaped state.
 *
 * Extra options allow callers (tests, fixtures, parity harness) to pass a
 * gunnery / piloting skill pair. Defaults: 4 / 5 (baseline pilot).
 */
export function computeInfantryBVFromState(
  state: InfantryStateLike,
  options: { gunnery?: number; piloting?: number } = {},
): IInfantryBVBreakdown {
  const troopers = totalTroopers(state.platoonComposition);

  const primaryResolved = resolveTrooperWeapon(
    state.primaryWeaponId,
    state.primaryWeapon,
  );
  const primary: InfantryWeaponRef = {
    id: primaryResolved.resolvedId,
    damageDivisor: primaryResolved.damageDivisor,
  };

  const hasSecondary =
    !!state.secondaryWeapon && state.secondaryWeaponCount > 0;
  let secondary: InfantryWeaponRef | undefined;
  if (hasSecondary) {
    const resolved = resolveTrooperWeapon(
      state.secondaryWeaponId,
      state.secondaryWeapon,
    );
    secondary = {
      id: resolved.resolvedId,
      damageDivisor: resolved.damageDivisor,
      secondaryRatio: resolved.secondaryRatio,
    };
  }

  const input: InfantryBVInput = {
    armorFlags: state.bvArmorFlags,
    hasArmorKit: state.hasArmorKit,
    sourceOffense: state.bvOffense,
    damageDivisor: state.damageDivisor,
    hasPheromoneEffuser: state.hasPheromoneEffuser,
    motive: state.infantryMotive,
    totalTroopers: troopers,
    primaryWeapon: primary,
    secondaryWeapon: secondary,
    armorKit: state.armorKit,
    hasAntiMechTraining: state.hasAntiMechTraining,
    fieldGuns: state.bvOffense?.fieldGunEquipment
      ? infantrySourceFieldGuns(state.bvOffense.fieldGunEquipment)
      : adaptFieldGuns(state.fieldGuns),
    gunnery: options.gunnery,
    piloting: options.piloting,
  };

  if (state.bvOffense) {
    primary.id = state.primaryWeapon;
    if (secondary) secondary.id = state.secondaryWeapon ?? secondary.id;
  }
  return calculateInfantryBV(input);
}

// IInfantry (handler-shape) adapter

/**
 * Map a handler-layer `SquadMotionType` to the BV-layer `InfantryMotive`.
 *
 * The handler uses the coarser `SquadMotionType` enum (Foot / Jump / Motorized /
 * Mechanized / Wheeled / Tracked / Hover / VTOL / Beast), while the BV
 * calculator needs the more granular `InfantryMotive` (which distinguishes the
 * four Mechanized sub-types used by the multiplier table).
 *
 * When the handler carries the plain `MECHANIZED` value (BLK files that did not
 * specify a hull sub-type), we fall back to `MECHANIZED_TRACKED` — all four
 * mechanized multipliers are 1.15, so the exact sub-type does not change the
 * numeric result. `WHEELED`/`TRACKED`/`HOVER`/`VTOL` map to their granular
 * mechanized counterparts. `UMU` and `BEAST` have no BV-layer equivalent and
 * map to `FOOT` (1.0×) — the safest baseline.
 */
const SQUAD_MOTION_TO_INFANTRY_MOTIVE = {
  [SquadMotionType.FOOT]: InfantryMotive.FOOT,
  [SquadMotionType.JUMP]: InfantryMotive.JUMP,
  [SquadMotionType.MOTORIZED]: InfantryMotive.MOTORIZED,
  [SquadMotionType.MECHANIZED]: InfantryMotive.MECHANIZED_TRACKED,
  [SquadMotionType.TRACKED]: InfantryMotive.MECHANIZED_TRACKED,
  [SquadMotionType.WHEELED]: InfantryMotive.MECHANIZED_WHEELED,
  [SquadMotionType.HOVER]: InfantryMotive.MECHANIZED_HOVER,
  [SquadMotionType.VTOL]: InfantryMotive.MECHANIZED_VTOL,
  [SquadMotionType.UMU]: InfantryMotive.FOOT,
  [SquadMotionType.BEAST]: InfantryMotive.FOOT,
} as const satisfies Readonly<Record<SquadMotionType, InfantryMotive>>;

function mapSquadMotionToInfantryMotive(
  motion: SquadMotionType,
): InfantryMotive {
  return SQUAD_MOTION_TO_INFANTRY_MOTIVE[motion] ?? InfantryMotive.FOOT;
}

/**
 * Compute the infantry BV breakdown from the handler-shape `IInfantry` unit.
 *
 * The handler populates `IInfantry` from parsed BLK documents; this adapter
 * bridges that shape into the store-shape consumed by `computeInfantryBVFromState`.
 *
 * Source facts retain actual weapon and ammo mounts. Older records keep
 * the editor-compatible one-bin-per-gun projection.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 */
export function calculateInfantryBVFromUnit(
  unit: IInfantry,
  options: { gunnery?: number; piloting?: number } = {},
): IInfantryBVBreakdown {
  const catalog = infantryCatalogFacts(unit);
  if (catalog)
    return computeInfantryBVFromState(
      infantryCatalogState(catalog, resolveInfantryProtection(catalog.tags)),
      options,
    );
  const motive = mapSquadMotionToInfantryMotive(unit.motionType);
  const platoonComposition: IPlatoonComposition = {
    squads: unit.numberOfSquads,
    troopersPerSquad: unit.squadSize,
  };

  // Synthesize handler-level field guns into store-shape guns with one ammo
  // bin each — the BV layer only needs equipmentId + a non-zero ammoRounds
  // flag to emit an ammo entry.
  const fieldGuns: readonly IInfantryFieldGun[] = unit.fieldGuns.map((gun) => ({
    weaponId: gun.equipmentId,
    crewCount: gun.crew,
    equipmentId: gun.equipmentId,
    name: gun.name,
    crew: gun.crew,
    ammoRounds: 1,
  }));

  const state: InfantryStateLike = {
    bvArmorFlags: unit.bvArmorFlags,
    hasArmorKit: unit.hasArmorKit,
    bvOffense: unit.bvOffense,
    damageDivisor: unit.damageDivisor,
    hasPheromoneEffuser: unit.hasPheromoneEffuser,
    infantryMotive: motive,
    platoonComposition,
    armorKit: unit.armorKit,
    hasAntiMechTraining: unit.hasAntiMechTraining,
    primaryWeapon: unit.primaryWeapon,
    primaryWeaponId: unit.primaryWeaponId,
    secondaryWeapon: unit.secondaryWeapon,
    secondaryWeaponId: unit.secondaryWeaponId,
    secondaryWeaponCount: unit.secondaryWeaponCount,
    fieldGuns,
  };

  return computeInfantryBVFromState(state, options);
}

/** Incoming protection for the defensive structure term only.
 * MegaMek 48fcb2f64: ConvInfantry.java:1297-1334; InfantryBVCalculator.java:65-80.
 * Kit facts: MiscType.create*InfArmor; mount facts: InfantryMount.sampleMounts.
 * Separate from weapon damage divisors and from the remaining BV modifiers.
 */
type SourceTags = Readonly<Record<string, string | string[]>>;

// Runtime stopgap until the equipment catalog exposes infantry kit divisors.
// Python conversion owns its independent offline boundary; aliases match that pin.
const KIT_DIVISORS = new Map<string, number>();
for (const alias of (
  'Ablative, Standard|ISAblativeStandard|Ablative, Concealed|ISAblativeConcealed|Ablative/Flak, Standard|' +
  'ISAblativeFlakStandard|CLAblativeFlakStandard|Ablative/Flak, Concealed|ISAblativeFlakConcealed|' +
  'CLAblativeFlakConcealed|Ballistic Plate, Concealed|BallisticPlateConcealed|' +
  'Clothing, Fatigues/Civilian/Non-Armored|Fatigues|Clothing, Leather/Synthetic Hide|ClothingLeather|' +
  'Engineering Suit|ISEngineeringSuit|CLEngineeringSuit|Environment Suit, Light|ISEnvironmentSuitLight|' +
  'CLEnvironmentSuitLight|Flak, Standard|ISFlakStandard|Flak, Concealed|ISFlakConcealed|Heat Suit|HeatSuit|' +
  'MechWarrior Combat Suit|ISMechWarriorCombatSuit|MekWarrior Kit (Advanced)|MekWarriorKitAdvanced|' +
  'MekWarrior Kit (Clan)|MekWarriorKitClan|Aerospace Fighter Pilot Kit|AerospacePilotKit|' +
  'MechWarrior Cooling Suit|ISMechWarriorCoolingSuit|Neo-Chainmail|NeoChainmail|Parka|Snowsuit|SnowSuit|' +
  'Spacesuit|Spacesuit, Combat|SpacesuitCombat|Capellan Confederation Armor Kit (3050)|LiaoKit|' +
  'Draconis Combine Infantry Kit|KuritaKit|Federated Suns Infantry Kit|DavionKit|' +
  'Free Rasalhague Republic Infantry Kit|FRRKit|Free Worlds League Infantry Kit|MarikKit|' +
  'Lyran Commonwealth Infantry Kit|SteinerKit|Magistracy of Canopus Infantry Kit|CanopianKit|' +
  'Taurian Concordat/Calderon Infantry Kit|TaurianKit|Generic Infantry Kit|GenericKit|' +
  'Vintage Bulletproof Vest|BulletproofVest|Vintage Bomb Suit|BombSuit|DEST Infiltration Suit|DESTSuit|' +
  'Sneak Suit (Camo)|ISSneakSuitCamo|Sneak Suit (IR)|ISSneakSuitIR|Sneak Suit (ECM)|ISSneakSuitECM|' +
  'Sneak Suit (Camo/IR)|ISSneakSuitCamoIR|Sneak Suit (Camo/ECM)|ISSneakSuitCamoECM|Sneak Suit (IR/ECM)|' +
  'ISSneakSuitIRECM|Sneak Suit (Camo/IR/ECM)|ISSneakSuitCamoIRECM'
).split('|'))
  KIT_DIVISORS.set(alias.toLowerCase(), 1.0);

for (const alias of (
  'Ballistic Plate, Standard|ISBallisticPlateStandard|CLBallisticPlateStandard|Environment Suit, Hostile|' +
  'ISEnvironmentSuitHostile|CLEnvironmentSuitHostile|Environment Suit, Marine|ISEnvironmentSuitMarine|' +
  "CLEnvironmentSuitMarine|Tanker's Smock|TankersSmock|Myomer, Suit|MyomerSuit|Myomer, Vest|MyomerVest|" +
  'Clan Armor Kit (All)|ClanKit|ComStar Infantry Kit|CSInfKit|ComstarKit|' +
  'Fed Suns/Fed Commonwealth Infantry Kit (3030-3066)|Fed Suns/Fed Commonweath Infantry Kit (3030-3066)|' +
  'DavionKit3030|EarlyFedComKit|Fed Suns Infantry Kit (3067+)|DavionKit3067|LateDavionKit|' +
  'Free Worlds League Infantry Kit (3035+)|MarikKit3035|LateMarikKit|' +
  'Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit|SteinerKit3060|Marian Hegemony Infantry Kit|' +
  'MarianKit|SLDF Infantry Kit|SLDFKit|Word of Blake Infantry Kit|WoBKit'
).split('|'))
  KIT_DIVISORS.set(alias.toLowerCase(), 2.0);

for (const alias of (
  'Clothing, Light (e.g. Summer Wear/None)|ClothingLightNone|MekWarrior Kit (Basic)|MekWarriorKitBasic|' +
  'MechWarrior Cooling Vest (Only)|MechWarriorCoolingVest'
).split('|'))
  KIT_DIVISORS.set(alias.toLowerCase(), 0.5);

function values(tags: SourceTags, key: string): string[] {
  const raw = tags[key];
  return (
    Array.isArray(raw) ? raw : raw === undefined ? [] : raw.split('\n')
  ).map((value) => value.trim());
}

export function resolveInfantryProtection(tags: SourceTags): {
  damageDivisor: number;
  hasPheromoneEffuser: boolean;
  isArmorEncumbering: boolean;
  hasArmorKit: boolean;
  armorKitCount: number;
  bvArmorFlags: readonly string[];
} {
  const custom = Number(tags.armordivisor ?? tags.InfantryArmor ?? 1);
  if (!Number.isFinite(custom) || custom <= 0)
    throw new Error('Invalid infantry damage divisor');
  // BLKInfantryFile equips the legacy kit before Troopers Equipment.
  const kitNames = [
    ...values(tags, 'armorKit'),
    ...values(tags, 'Troopers Equipment'),
  ].filter((name) => KIT_DIVISORS.has(name.toLowerCase()));
  const kitName = kitNames[0];
  const kit = kitName ? KIT_DIVISORS.get(kitName.toLowerCase()) : undefined;
  let divisor = kit ?? custom;
  const augmentations = values(tags, 'augmentation');
  const hasArmor =
    kit !== undefined ||
    custom !== 1 ||
    values(tags, 'armor_name').some(Boolean) ||
    [
      'encumberingarmor',
      'spacesuit',
      'dest',
      'sneakcamo',
      'sneakir',
      'sneakecm',
    ].some((flag) => flag in tags);
  if (!hasArmor && augmentations.includes('tsm_implant')) divisor = 0.5;
  if (divisor === 0.5 && augmentations.includes('dermal_camo_armor'))
    divisor = 1;
  if (augmentations.includes('dermal_armor')) divisor += 1;
  const motion = values(tags, 'motion_type')[0] ?? '';
  if (motion.startsWith('Beast:')) {
    const mount = motion.slice(6);
    const multiplier = mount.startsWith('Custom:')
      ? Number(mount.slice(7).split(',')[7])
      : mount === 'Hipposaur'
        ? 4
        : ['Elephant', 'Orca'].includes(mount)
          ? 2
          : [
                'Donkey',
                'Coventry Kangaroo',
                'Horse',
                'Camel',
                'Branth',
                'Odessan Raxx',
                'Tabiranth',
                'Tariq',
              ].includes(mount)
            ? 1
            : NaN;
    if (!Number.isFinite(multiplier) || multiplier <= 0)
      throw new Error('Invalid infantry mount divisor');
    divisor *= multiplier;
  }
  return {
    damageDivisor: divisor,
    hasArmorKit: kitName !== undefined,
    armorKitCount: kitNames.length,
    bvArmorFlags: infantryBVArmorFlags(tags, kitName),
    hasPheromoneEffuser: augmentations.includes('gas_effuser_pheromone'),
    isArmorEncumbering: kitName
      ? ENCUMBERING_KITS.has(kitName.toLowerCase())
      : 'encumberingarmor' in tags,
  };
}

// MiscType.create*InfArmor at 48fcb2f64: kit S_ENCUMBERING flag.
const ENCUMBERING_KITS = new Set(
  (
    'ablative, standard|isablativestandard|ballistic plate, standard|isballisticplatestandard|clballisticplatestandard|engineering suit|' +
    'isengineeringsuit|clengineeringsuit|environment suit, light|isenvironmentsuitlight|clenvironmentsuitlight|' +
    'environment suit, hostile|isenvironmentsuithostile|clenvironmentsuithostile|mekwarrior kit (basic)|mekwarriorkitbasic|' +
    'mekwarrior kit (advanced)|mekwarriorkitadvanced|myomer, suit|myomersuit|snowsuit|snowsuit|spacesuit|spacesuit, combat|' +
    'spacesuitcombat|fed suns infantry kit (3067+)|davionkit3067|latedavionkit|free worlds league infantry kit (3035+)|marikkit3035|' +
    'latemarikkit|vintage bomb suit|bombsuit'
  ).split('|'),
);
