import type {
  ICriticalSlotNoticeIdentity,
  ICriticalSlotEntryClassification,
  ICriticalSlotNoticeEffect,
  INoticeKindRule,
} from './criticalSlotNoticeTypes';
export type {
  ICriticalSlotNoticeIdentity,
  ICriticalSlotEntryClassification,
  ICriticalSlotNoticeEffect,
} from './criticalSlotNoticeTypes';

import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import { matchCriticalSlotNoticeIdentity } from './criticalSlotNoticeMatcher';
import {
  CriticalSlotEntryKind,
  CriticalSlotEntrySubkind,
} from './criticalSlotNoticeTypes';
export {
  CriticalSlotEntryKind,
  CriticalSlotEntrySubkind,
} from './criticalSlotNoticeTypes';

export type CriticalSlotNoticeKind = `${CriticalSlotEntryKind}`;
/** Recovery lanes; weapon-control/unassigned remain non-recovery dispositions. */
export enum CriticalSlotRecoveryResponsibility {
  O3A = 'o3a',
  O3B = 'o3b',
  O3B_SYSTEM = 'o3b-s',
  CELERITY = 'Celerity',
  PR_D = 'PR-D',
}
const evidenceFile =
  'src/services/units/unitLoaderService/__tests__/criticalSlotNoticeConsequences.test.ts';
const unestablished =
  'Critical-slot placements are lost; effect on the unit not established.';
function effect(
  id: ICriticalSlotNoticeEffect['id'],
  title: string,
  responsibility: ICriticalSlotNoticeEffect['responsibility'],
  consequence: string,
  unit: string,
  testName: string,
  pattern?: RegExp,
  excludePattern?: RegExp,
  testFile = evidenceFile,
): ICriticalSlotNoticeEffect {
  return {
    id,
    title,
    responsibility,
    consequence,
    pattern,
    excludePattern,
    evidence: { unit, testFile, testName },
  };
}

/**
 * notice-kind-v2-final: first matching kind, then first matching effect.
 * This is the single notice/census classification and recovery-attribution table.
 * It NEVER decides residual membership, admission, equipment identity or saving.
 * Consequences describe demonstrated effects in the cited real round-trip tests;
 * unmeasured effects stay explicit, including for configuration/system boundaries.
 */
export const CRITICAL_SLOT_NOTICE_RULES: readonly INoticeKindRule[] = [
  {
    kind: CriticalSlotEntryKind.AMMO,
    title: 'Ammunition',
    category: EquipmentCategory.AMMUNITION,
    pattern: /ammo|ammunition/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.AMMO,
        'Ammunition',
        CriticalSlotRecoveryResponsibility.CELERITY,
        unestablished,
        'Dig Lord RCL-4 MiningMech',
        'unestablished ammo: Dig Lord RCL-4 MiningMech',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.CASE,
    title: 'CASE / CASE II',
    pattern:
      /^(?:(?:is|cl|clan))?case(?:ii|2)?(?:registry)?$|^case(?:ii|2)?(?:is|cl|clan)(?:registry)?$/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.CASE,
        'CASE / CASE II',
        CriticalSlotRecoveryResponsibility.PR_D,
        'Ammo explosion protection is lost; BV changes.',
        'King Crab KGC-000',
        'CASE protection and BV: King Crab KGC-000',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.ARMOR_STRUCTURE,
    title: 'Armor / structure markers',
    pattern:
      /endo|ferro|reactivearmor|reflectivearmor|stealtharmor|hardenedarmor|ballisticreinforced(?:armor)?|heatdissipating(?:armor)?|impactresistant(?:armor)?|antipenetrativeablation|commercialarmor|primitivearmor|industrialarmor|reinforcedstructure|compositestructure|industrialstructure|^(?:is|cl|clan)?(?:reactive|reflective|stealth|reinforced|composite)(?:registry)?$/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.MARKERS,
        'Armor / structure markers',
        CriticalSlotRecoveryResponsibility.O3A,
        'These structure and armor placement slots are not kept when you save. Weight, BV and validity are not affected, and the record sheet does not list them before or after saving.',
        'King Crab KGC-000',
        'marker configuration retained:',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.MOBILITY,
    title: 'Mobility',
    category: EquipmentCategory.MOVEMENT,
    pattern:
      /masc|triplestrengthmyomer|tsm|supercharger|jumpjet|partialwing|umu|underwatermaneuver|mechanicaljump|jumpbooster/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.MASC,
        'MASC',
        CriticalSlotRecoveryResponsibility.O3B,
        'MASC run MP boost is lost; run MP is reduced.',
        'Celerity CLR-03-O',
        'MASC run MP: Celerity CLR-03-O',
        /masc/,
      ),
      effect(
        CriticalSlotEntrySubkind.TSM,
        'Triple-strength myomer',
        CriticalSlotRecoveryResponsibility.O3B,
        'TSM walk and run MP boosts are lost.',
        'Seraph C-SRP-O Invictus',
        'TSM walk MP: Seraph C-SRP-O Invictus',
        /triplestrengthmyomer|tsm/,
        /industrial/,
      ),
      effect(
        CriticalSlotEntrySubkind.SUPERCHARGER,
        'Supercharger',
        CriticalSlotRecoveryResponsibility.O3B,
        'Supercharger run MP boost is lost; run MP is reduced.',
        'Warwolf H',
        'Supercharger run MP: Warwolf H',
        /supercharger/,
      ),
      effect(
        CriticalSlotEntrySubkind.PARTIAL_WING,
        'Partial Wing',
        CriticalSlotRecoveryResponsibility.O3B,
        'Partial Wing jump MP and heat dissipation bonuses are lost.',
        'Butcherbird A',
        'Partial Wing jump and heat: Butcherbird A',
        /partialwing/,
      ),
      effect(
        CriticalSlotEntrySubkind.UMU,
        'Underwater maneuvering units',
        CriticalSlotRecoveryResponsibility.O3B,
        'Underwater MP from the listed UMUs is lost.',
        'Arctic Fox AF1U',
        'UMU underwater MP: Arctic Fox AF1U',
        /umu|underwatermaneuver/,
      ),
      effect(
        CriticalSlotEntrySubkind.IMPROVED_JETS,
        'Improved jump jets',
        CriticalSlotRecoveryResponsibility.O3B,
        'Improved jump-jet placement and heat reduction are lost; configured jump MP is kept.',
        'Nova Cat F',
        'improved jump heat lost: Nova Cat F',
        /improvedjumpjet|improvedjj/,
        /prototype/,
      ),
      effect(
        CriticalSlotEntrySubkind.STANDARD_JETS,
        'Standard jump jets',
        CriticalSlotRecoveryResponsibility.O3B,
        'Jet placements are lost; configured jump MP and numerical movement heat are kept.',
        'Scarecrow UCU-F4',
        'standard jump MP and heat retained: Scarecrow UCU-F4',
        /^(?:is|cl|clan)?(?:standard)?jumpjet(?:registry)?$/,
        /prototype|improved|mechanical/,
      ),
      effect(
        CriticalSlotEntrySubkind.MOBILITY_UNESTABLISHED,
        'Other mobility',
        CriticalSlotRecoveryResponsibility.O3B,
        unestablished,
        'Scarecrow UCU-F4',
        'standard jump MP and heat retained: Scarecrow UCU-F4',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.CARGO,
    title: 'Cargo',
    pattern: /cargo/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.CARGO,
        'Cargo',
        CriticalSlotRecoveryResponsibility.PR_D,
        unestablished,
        'Uni ATAE-70 ArtilleryMech',
        'unestablished cargo: Uni ATAE-70 ArtilleryMech',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.HEAT_SINKS,
    title: 'Heat sinks',
    canonicalHeatSinkIds: true,
    pattern:
      /^(?:\d+)?(?:is|cl|clan)?(?:(?:single|double|compact|laser|prototype|freezer|improved))*heatsinks?(?:prototype)?(?:registry)?$/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.HEAT_SINKS,
        'Heat sinks',
        CriticalSlotRecoveryResponsibility.CELERITY,
        unestablished,
        'Jabberwocky JAW-65A EngineerMech',
        'unestablished heat sinks: Jabberwocky JAW-65A EngineerMech',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.ELECTRONICS,
    title: 'Probes and electronics',
    category: EquipmentCategory.ELECTRONICS,
    pattern:
      /activeprobe|bloodhound|beagle|watchdog|bap|ecm|c3|tag|targetingcomputer|artemis|apollo|firecontrol|chameleon|signature|blueshield|guardian|nova|cews|sensor|radar|sonar|camera|communication|commandnetwork|satellite|nightvision|recon|drone|searchlight|spotlight|mastmount/,
    effects: [
      effect(
        CriticalSlotEntrySubkind.ELECTRONICS,
        'Probes and electronics',
        CriticalSlotRecoveryResponsibility.PR_D,
        unestablished,
        'Scarecrow UCU-F4',
        'unestablished electronics: Scarecrow UCU-F4',
      ),
    ],
  },
  {
    kind: CriticalSlotEntryKind.OTHER,
    title: 'Other',
    effects: [
      // parity-3.3-critonly/COUNT.md:39 assigns the already-supported bays to Celerity.
      // Recovery remains guarded by the real loader (MiscType.java:12413-12420,
      // MegaMek 48fcb2f64); this broad classification never grants admission.
      effect(
        CriticalSlotEntrySubkind.BOMB_BAY,
        'Bomb bays',
        CriticalSlotRecoveryResponsibility.CELERITY,
        unestablished,
        'Wasp LAM WSP-110',
        'recovers all five native Wasp bomb bays once',
        /bombbay/,
        undefined,
        'src/services/units/unitLoaderService/__tests__/lamMass.test.ts',
      ),
      effect(
        CriticalSlotEntrySubkind.TRACKS,
        'Tracks',
        CriticalSlotRecoveryResponsibility.O3B,
        'Track placements and motive identity are lost; the configured chassis type is kept. Effect on specialized movement abilities not established.',
        'Boreas A',
        'Tracks and Conversion Gear identity: Boreas A',
        /tracks/,
      ),
      effect(
        CriticalSlotEntrySubkind.CONVERSION,
        'Conversion Gear',
        CriticalSlotRecoveryResponsibility.O3B_SYSTEM,
        'Conversion Gear identity and placement are lost; generic configuration is kept. Effect on conversion abilities not established.',
        'Boreas A',
        'Tracks and Conversion Gear identity: Boreas A',
        /conversiongear/,
      ),
      effect(
        CriticalSlotEntrySubkind.SUPERCOOLED_MYOMER,
        'Supercooled Myomer',
        CriticalSlotRecoveryResponsibility.O3B,
        'Supercooled Myomer heat reduction is lost; movement heat increases.',
        'Wendigo-XR (Prime)',
        'supercooled myomer heat lost: Wendigo-XR (Prime)',
        /supercooledmyomer/,
      ),
      effect(
        CriticalSlotEntrySubkind.WHEELS,
        'QuadVee Wheels',
        CriticalSlotRecoveryResponsibility.O3B,
        'Wheel placements and motive identity are lost; generic QuadVee configuration is kept. Effect on specialized vehicle-mode abilities not established.',
        'Notos A',
        'wheel identity: Notos A',
        /quadveewheels/,
      ),
      effect(
        CriticalSlotEntrySubkind.QUAD_TURRET,
        'Quad Turret',
        CriticalSlotRecoveryResponsibility.O3B,
        'Turret identity and placement are lost; effect on turret rotation and firing arcs not established.',
        'Sarath SRTH-1O',
        'turret identity: Sarath SRTH-1O',
        /quadturret/,
      ),
      effect(
        CriticalSlotEntrySubkind.SYSTEM_BOUNDARY,
        'Configuration / system entries',
        CriticalSlotRecoveryResponsibility.O3B_SYSTEM,
        unestablished,
        'Screamer LAM SCR-1X-LAM',
        'unestablished system boundary: Screamer LAM SCR-1X-LAM',
        /avionics|landinggear/,
      ),
      effect(
        CriticalSlotEntrySubkind.HEAD_TURRET,
        'Head Turret',
        CriticalSlotRecoveryResponsibility.O3B,
        unestablished,
        'Quickdraw QKD-8X',
        'unestablished head turret: Quickdraw QKD-8X',
        /headturret/,
      ),
      {
        ...effect(
          CriticalSlotEntrySubkind.LAM_FUEL_TANK,
          'LAM Fuel Tank',
          CriticalSlotRecoveryResponsibility.O3B,
          unestablished,
          'UrbanMech LAM UM-A07',
          'unestablished LAM fuel tank: UrbanMech LAM UM-A07',
          /lamfueltank/,
        ),
        prerequisite:
          'Missing equipment definition for LAM Fuel Tank (C3/C2 metadata/resolution).',
      },
      effect(
        CriticalSlotEntrySubkind.WEAPON_CONTROL,
        'Thumper placements',
        'weapon-control',
        'Thumper critical placements are lost; the listed weapon mounts are kept. Effect on other unit abilities not established.',
        'Uni ATAE-70 ArtilleryMech',
        'weapon mounts retained: Uni ATAE-70 ArtilleryMech',
        /^(?:is)?thumper(?:registry)?$|thumpercannon/,
      ),
      effect(
        CriticalSlotEntrySubkind.MISCELLANEOUS,
        'Miscellaneous equipment',
        CriticalSlotRecoveryResponsibility.PR_D,
        unestablished,
        'Jabberwocky JAW-65A EngineerMech',
        'unestablished miscellaneous: Jabberwocky JAW-65A EngineerMech',
        /environmentalsealing|lifthoist|arrestinghoist|salvagearm|ejectionseat|mechsprayer|^(?:is)?aes$|antipersonnelpod|ppccapacitor|radicalheatsinksystem|harjel|modulararmor|collapsiblecommandmodule|liquidstorage|extendedfueltank|groundmobilehpg|laserinsulator|minedispenser|chaindrapecape|risclaserpulsemodule|^(?:is)?mass$|dumper|bridgelayer|boobytrap|riscemergencycoolant|viraljammer|ramplate|fluidsuction|paramedic/,
      ),
      effect(
        CriticalSlotEntrySubkind.UNASSIGNED,
        'Unclassified entries',
        'unassigned',
        unestablished,
        'Jabberwocky JAW-65A EngineerMech',
        'unestablished miscellaneous: Jabberwocky JAW-65A EngineerMech',
      ),
    ],
  },
];

export function classifyCriticalSlotNoticeIdentity(
  identity: ICriticalSlotNoticeIdentity,
): ICriticalSlotEntryClassification {
  return matchCriticalSlotNoticeIdentity(identity, CRITICAL_SLOT_NOTICE_RULES);
}
