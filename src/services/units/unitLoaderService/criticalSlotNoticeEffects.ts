import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';

export type CriticalSlotNoticeKind =
  | 'ammo'
  | 'case'
  | 'armor_structure'
  | 'mobility'
  | 'cargo'
  | 'heat_sinks'
  | 'electronics'
  | 'other';
export type CriticalSlotRecoveryResponsibility =
  | 'PR-D'
  | 'o3'
  | 'Celerity'
  | 'system-boundary'
  | 'weapon-control'
  | 'unassigned';
export interface ICriticalSlotNoticeIdentity {
  readonly lookupToken: string;
  readonly resolvedId?: string | null;
  readonly equipmentId?: string | null;
  readonly equipmentName?: string | null;
  readonly equipmentCategory?: EquipmentCategory | null;
  readonly registryId?: string | null;
  readonly registryName?: string | null;
}
export interface ICriticalSlotNoticeEffect {
  readonly id: string;
  readonly title: string;
  readonly responsibility: CriticalSlotRecoveryResponsibility;
  readonly consequence: string;
  readonly pattern?: RegExp;
  readonly excludePattern?: RegExp;
  readonly evidence: {
    readonly unit: string;
    readonly testFile: string;
    readonly testName: string;
  };
}
interface INoticeKindRule {
  readonly kind: CriticalSlotNoticeKind;
  readonly title: string;
  readonly pattern?: RegExp;
  readonly category?: EquipmentCategory;
  readonly canonicalHeatSinkIds?: boolean;
  readonly effects: readonly ICriticalSlotNoticeEffect[];
}

const evidenceFile =
  'src/services/units/unitLoaderService/__tests__/criticalSlotNoticeConsequences.test.ts';
const unestablished =
  'Critical-slot placements are lost; effect on the unit not established.';
function effect(
  id: string,
  title: string,
  responsibility: CriticalSlotRecoveryResponsibility,
  consequence: string,
  unit: string,
  testName: string,
  pattern?: RegExp,
  excludePattern?: RegExp,
): ICriticalSlotNoticeEffect {
  return {
    id,
    title,
    responsibility,
    consequence,
    pattern,
    excludePattern,
    evidence: { unit, testFile: evidenceFile, testName },
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
    kind: 'ammo',
    title: 'Ammunition',
    category: EquipmentCategory.AMMUNITION,
    pattern: /ammo|ammunition/,
    effects: [
      effect(
        'ammo',
        'Ammunition',
        'Celerity',
        unestablished,
        'Dig Lord RCL-4 MiningMech',
        'unestablished ammo: Dig Lord RCL-4 MiningMech',
      ),
    ],
  },
  {
    kind: 'case',
    title: 'CASE / CASE II',
    pattern:
      /^(?:(?:is|cl|clan))?case(?:ii|2)?(?:registry)?$|^case(?:ii|2)?(?:is|cl|clan)(?:registry)?$/,
    effects: [
      effect(
        'case',
        'CASE / CASE II',
        'PR-D',
        'Ammo explosion protection is lost; BV changes.',
        'King Crab KGC-000',
        'CASE protection and BV: King Crab KGC-000',
      ),
    ],
  },
  {
    kind: 'armor_structure',
    title: 'Armor / structure markers',
    pattern:
      /endo|ferro|reactivearmor|reflectivearmor|stealtharmor|hardenedarmor|ballisticreinforced(?:armor)?|heatdissipating(?:armor)?|impactresistant(?:armor)?|antipenetrativeablation|commercialarmor|primitivearmor|industrialarmor|reinforcedstructure|compositestructure|industrialstructure|^(?:is|cl|clan)?(?:reactive|reflective|stealth|reinforced|composite)(?:registry)?$/,
    effects: [
      effect(
        'markers',
        'Armor / structure markers',
        'o3',
        'Marker placements are lost; configured armor and structure types, armor points and tonnage are kept. Effect on legality not established.',
        'King Crab KGC-000',
        'marker configuration retained:',
      ),
    ],
  },
  {
    kind: 'mobility',
    title: 'Mobility',
    category: EquipmentCategory.MOVEMENT,
    pattern:
      /masc|triplestrengthmyomer|tsm|supercharger|jumpjet|partialwing|umu|underwatermaneuver|mechanicaljump|jumpbooster/,
    effects: [
      effect(
        'masc',
        'MASC',
        'o3',
        'MASC run MP boost is lost; run MP is reduced.',
        'Celerity CLR-03-O',
        'MASC run MP: Celerity CLR-03-O',
        /masc/,
      ),
      effect(
        'tsm',
        'Triple-strength myomer',
        'o3',
        'TSM walk and run MP boosts are lost.',
        'Seraph C-SRP-O Invictus',
        'TSM walk MP: Seraph C-SRP-O Invictus',
        /triplestrengthmyomer|tsm/,
        /industrial/,
      ),
      effect(
        'supercharger',
        'Supercharger',
        'o3',
        'Supercharger run MP boost is lost; run MP is reduced.',
        'Warwolf H',
        'Supercharger run MP: Warwolf H',
        /supercharger/,
      ),
      effect(
        'partial-wing',
        'Partial Wing',
        'o3',
        'Partial Wing jump MP and heat dissipation bonuses are lost.',
        'Butcherbird A',
        'Partial Wing jump and heat: Butcherbird A',
        /partialwing/,
      ),
      effect(
        'umu',
        'Underwater maneuvering units',
        'o3',
        'Underwater MP from the listed UMUs is lost.',
        'Arctic Fox AF1U',
        'UMU underwater MP: Arctic Fox AF1U',
        /umu|underwatermaneuver/,
      ),
      effect(
        'improved-jets',
        'Improved jump jets',
        'o3',
        'Improved jump-jet placement and heat reduction are lost; configured jump MP is kept.',
        'Nova Cat F',
        'improved jump heat lost: Nova Cat F',
        /improvedjumpjet|improvedjj/,
        /prototype/,
      ),
      effect(
        'standard-jets',
        'Standard jump jets',
        'o3',
        'Jet placements are lost; configured jump MP and numerical movement heat are kept.',
        'Scarecrow UCU-F4',
        'standard jump MP and heat retained: Scarecrow UCU-F4',
        /^(?:is|cl|clan)?(?:standard)?jumpjet(?:registry)?$/,
        /prototype|improved|mechanical/,
      ),
      effect(
        'mobility-unestablished',
        'Other mobility',
        'o3',
        unestablished,
        'Scarecrow UCU-F4',
        'standard jump MP and heat retained: Scarecrow UCU-F4',
      ),
    ],
  },
  {
    kind: 'cargo',
    title: 'Cargo',
    pattern: /cargo/,
    effects: [
      effect(
        'cargo',
        'Cargo',
        'PR-D',
        unestablished,
        'Uni ATAE-70 ArtilleryMech',
        'unestablished cargo: Uni ATAE-70 ArtilleryMech',
      ),
    ],
  },
  {
    kind: 'heat_sinks',
    title: 'Heat sinks',
    canonicalHeatSinkIds: true,
    pattern:
      /^(?:\d+)?(?:is|cl|clan)?(?:(?:single|double|compact|laser|prototype|freezer|improved))*heatsinks?(?:prototype)?(?:registry)?$/,
    effects: [
      effect(
        'heat-sinks',
        'Heat sinks',
        'Celerity',
        unestablished,
        'Jabberwocky JAW-65A EngineerMech',
        'unestablished heat sinks: Jabberwocky JAW-65A EngineerMech',
      ),
    ],
  },
  {
    kind: 'electronics',
    title: 'Probes and electronics',
    category: EquipmentCategory.ELECTRONICS,
    pattern:
      /activeprobe|bloodhound|beagle|watchdog|bap|ecm|c3|tag|targetingcomputer|artemis|apollo|firecontrol|chameleon|signature|blueshield|guardian|nova|cews|sensor|radar|sonar|camera|communication|commandnetwork|satellite|nightvision|recon|drone|searchlight|spotlight|mastmount/,
    effects: [
      effect(
        'electronics',
        'Probes and electronics',
        'PR-D',
        unestablished,
        'Scarecrow UCU-F4',
        'unestablished electronics: Scarecrow UCU-F4',
      ),
    ],
  },
  {
    kind: 'other',
    title: 'Other',
    effects: [
      effect(
        'tracks',
        'Tracks',
        'o3',
        'Track placements and motive identity are lost; the configured chassis type is kept. Effect on specialized movement abilities not established.',
        'Boreas A',
        'Tracks and Conversion Gear identity: Boreas A',
        /tracks/,
      ),
      effect(
        'conversion',
        'Conversion Gear',
        'o3',
        'Conversion Gear identity and placement are lost; generic configuration is kept. Effect on conversion abilities not established.',
        'Boreas A',
        'Tracks and Conversion Gear identity: Boreas A',
        /conversiongear/,
      ),
      effect(
        'supercooled-myomer',
        'Supercooled Myomer',
        'o3',
        'Supercooled Myomer heat reduction is lost; movement heat increases.',
        'Wendigo-XR (Prime)',
        'supercooled myomer heat lost: Wendigo-XR (Prime)',
        /supercooledmyomer/,
      ),
      effect(
        'wheels',
        'QuadVee Wheels',
        'o3',
        'Wheel placements and motive identity are lost; generic QuadVee configuration is kept. Effect on specialized vehicle-mode abilities not established.',
        'Notos A',
        'wheel identity: Notos A',
        /quadveewheels/,
      ),
      effect(
        'quad-turret',
        'Quad Turret',
        'o3',
        'Turret identity and placement are lost; effect on turret rotation and firing arcs not established.',
        'Sarath SRTH-1O',
        'turret identity: Sarath SRTH-1O',
        /quadturret/,
      ),
      effect(
        'system-boundary',
        'Configuration / system entries',
        'system-boundary',
        unestablished,
        'Screamer LAM SCR-1X-LAM',
        'unestablished system boundary: Screamer LAM SCR-1X-LAM',
        /avionics|landinggear|headturret|lamfueltank/,
      ),
      effect(
        'weapon-control',
        'Thumper placements',
        'weapon-control',
        'Thumper critical placements are lost; the listed weapon mounts are kept. Effect on other unit abilities not established.',
        'Uni ATAE-70 ArtilleryMech',
        'weapon mounts retained: Uni ATAE-70 ArtilleryMech',
        /^(?:is)?thumper(?:registry)?$|thumpercannon/,
      ),
      effect(
        'miscellaneous',
        'Miscellaneous equipment',
        'PR-D',
        unestablished,
        'Jabberwocky JAW-65A EngineerMech',
        'unestablished miscellaneous: Jabberwocky JAW-65A EngineerMech',
        /environmentalsealing|lifthoist|arrestinghoist|salvagearm|ejectionseat|mechsprayer|^(?:is)?aes$|antipersonnelpod|ppccapacitor|radicalheatsinksystem|harjel|modulararmor|collapsiblecommandmodule|liquidstorage|extendedfueltank|groundmobilehpg|laserinsulator|minedispenser|chaindrapecape|risclaserpulsemodule|^(?:is)?mass$|dumper|bridgelayer|boobytrap|riscemergencycoolant|viraljammer|ramplate|fluidsuction|paramedic/,
      ),
      effect(
        'unassigned',
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
): {
  readonly kind: CriticalSlotNoticeKind;
  readonly title: string;
  readonly ruleId: string;
  readonly effect: ICriticalSlotNoticeEffect;
} {
  const candidates = [
    identity.lookupToken,
    identity.resolvedId,
    identity.equipmentId,
    identity.equipmentName,
    identity.registryId,
    identity.registryName,
  ].filter((value): value is string => typeof value === 'string');
  const normalized = candidates.map((value) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );
  for (const [index, rule] of CRITICAL_SLOT_NOTICE_RULES.entries()) {
    const categoryMatches =
      rule.category !== undefined &&
      rule.category === identity.equipmentCategory;
    if (
      rule.kind !== 'other' &&
      !categoryMatches &&
      !(
        rule.canonicalHeatSinkIds &&
        candidates.some((id) =>
          HEAT_SINK_EQUIPMENT_IDS.some((canonical) => canonical === id),
        )
      ) &&
      !normalized.some((value) => rule.pattern?.test(value))
    )
      continue;
    const selected = rule.effects.find(
      (item) =>
        !normalized.some((value) => item.excludePattern?.test(value)) &&
        (!item.pattern ||
          normalized.some((value) => item.pattern?.test(value))),
    );
    if (!selected)
      throw new Error(`Missing notice effect fallback: ${rule.kind}`);
    return {
      kind: rule.kind,
      title: rule.title,
      ruleId: `${String(index + 1).padStart(2, '0')}-${rule.kind.replace('_', '-')}`,
      effect: selected,
    };
  }
  throw new Error('Missing critical-slot notice classification fallback');
}
