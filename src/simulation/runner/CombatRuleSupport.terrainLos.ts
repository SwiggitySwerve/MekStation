import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  integrated,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_TO_HIT_SOURCE_VERSION,
  megamekTerrainSourceRef,
  mekstationDeviationSourceRef,
} from './CombatRuleSupport.sourceRefs';
import {
  MEGAMEK_DROPSHIP_SPECIAL_BUILDING_LOS_SOURCE_REFS,
  MEGAMEK_TACOPS_DIAGRAM_LOS_SOURCE_REFS,
  terrainLosSourceRefs,
} from './CombatTerrainEnvironmentSourceRefs';
import { MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS } from './CombatToHitSourceRefs';

const MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation calculateLOS owns represented TerrainType LOS tracing, divided side-path selection, endpoint LOS elevation inputs, and optional TacOps diagram terrain-effect checks for woods, smoke, heavy industrial, and planted fields.',
  'src/utils/gameplay/lineOfSight.ts',
  'L1-L825',
);

const MEKSTATION_TACOPS_LOS_CALLER_OPTION_SOURCE_REFS = [
  MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack LOS validation threads combat optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/simulation/runner/phases/weaponAttackLineOfSight.ts',
    'L1-L94',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack C3 spotter LOS checks thread combat optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1-L1346',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack declarations and indirect spotter terrain effects thread session optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/engine/InteractiveSession.actions.ts',
    'L1-L1634',
  ),
  mekstationDeviationSourceRef(
    'MekStation indirect-fire context and spotter election carry LOS calculation options from session or runner optional rules into the pure indirect-fire helper.',
    'src/engine/InteractiveSession.indirectFire.ts',
    'L1-L207',
  ),
] as const;

const MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek LosEffects.calculateLos selects divided LOS when the attack-target bearing follows a hexside and otherwise uses straight LOS, while TacOps LOS1 enables diagram LOS.',
    'common/LosEffects.java',
    'L783-L790',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losDivided evaluates non-split coordinates and left/right split-side LOS effects separately before choosing defender-favorable cover or blocking.',
    'common/LosEffects.java',
    'L993-L1040',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losStraight counts endpoint elevation differences as building hexes passed through when both endpoints are in a building.',
    'common/LosEffects.java',
    'L949-L958',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords tracks underwater minimum-water depth, clear-hex underwater blocking, TacOps diagram elevation, and grounded Dropship/building-height blocking during LOS tracing.',
    'common/LosEffects.java',
    'L1252-L1348',
  ),
  ...terrainLosSourceRefs(TerrainType.Water),
];

const TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS = [
  ...MEGAMEK_TACOPS_DIAGRAM_LOS_SOURCE_REFS,
  MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
  ...terrainLosSourceRefs(TerrainType.Building),
  ...terrainLosSourceRefs(TerrainType.HeavyIndustrial),
  ...terrainLosSourceRefs(TerrainType.PlantedField),
];

const DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS = [
  ...MEGAMEK_DROPSHIP_SPECIAL_BUILDING_LOS_SOURCE_REFS,
  ...terrainLosSourceRefs(TerrainType.Building),
];

export const TERRAIN_LOS_COMBAT_SUPPORT = {
  'terrain-los-blocking': integrated(
    'terrain-los-blocking',
    'lineOfSight consumes TerrainType direct blockers, cumulative woods/smoke density, and source-backed land-to-depth-2+ water endpoint state for MekStation LOS blocking',
    [
      ...terrainLosSourceRefs(TerrainType.HeavyWoods),
      ...terrainLosSourceRefs(TerrainType.Water),
    ],
  ),
  'terrain-los-water-endpoint-blocking': integrated(
    'terrain-los-water-endpoint-blocking',
    'calculateLOS blocks source-backed land-to-depth-2+ water endpoint sightlines in both directions and validateLineOfSightForAttack converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Water),
  ),
  'terrain-los-underwater-clear-hex-blocking': integrated(
    'terrain-los-underwater-clear-hex-blocking',
    'calculateLOS blocks source-backed underwater-to-underwater sightlines and underwater-combat sightlines from represented non-land endpoints when they trace through any clear/non-water depth-0 intervening hex, matching MegaMek direct LOS underwater-combat blocking; validateLineOfSightForAttack converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Water),
  ),
  'terrain-los-underwater-depth-height-side-paths': integrated(
    'terrain-los-underwater-depth-height-side-paths',
    'calculateLOS classifies represented water endpoints from explicit endpoint LOS elevations when supplied, preserves legacy depth-only classification otherwise, exposes minimumWaterDepth across endpoints and traced side paths for torpedo-style metadata, and blocks underwater combat when the traced minimum depth drops below 1',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-same-building-hex-blocking': integrated(
    'terrain-los-same-building-hex-blocking',
    'calculateLOS counts intervening building terrain sharing both endpoint buildingId values and blocks once represented same-building building hexes exceed two; runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Building),
  ),
  'terrain-los-same-building-level-count': integrated(
    'terrain-los-same-building-level-count',
    'calculateLOS counts represented endpoint base-elevation differences and explicit endpoint LOS-height differences as same-building building levels when both endpoints share a buildingId, then blocks once the combined same-building level/hex count exceeds two; runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events without claiming broader building-level parity',
    [
      ...MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
      ...terrainLosSourceRefs(TerrainType.Building),
    ],
  ),
  'terrain-los-building-height-blocking': integrated(
    'terrain-los-building-height-blocking',
    'calculateLOS blocks represented non-diagram building sightlines when an intervening Building terrain feature level plus hex elevation rises above the taller endpoint or an adjacent endpoint, allows non-adjacent sightlines over buildings no higher than the taller endpoint, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    [
      ...MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
      ...terrainLosSourceRefs(TerrainType.Building),
    ],
  ),
  'terrain-los-divided-side-path-blocking': integrated(
    'terrain-los-divided-side-path-blocking',
    'calculateLOS detects represented degree % 60 == 30 divided LOS bearings, traces both adjacent split-side paths, and keeps the defender-favorable blocker or intervening terrain modifier result instead of silently using the rounded single hexLine path; runAttackPhase converts represented divided-LOS blockers into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-divided-elevation-blocking': integrated(
    'terrain-los-divided-elevation-blocking',
    'calculateLOS applies the same pure-elevation blocker test to represented divided LOS side paths, keeps the defender-favorable split-side elevation blocker, reports blockingElevation without synthesizing blocking terrain, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-intervening-elevation-blocking': integrated(
    'terrain-los-intervening-elevation-blocking',
    'calculateLOS blocks represented single-path sightlines when an intervening clear hex elevation rises above the interpolated LOS height, reports blockingElevation without synthesizing a blocking terrain feature, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-represented-pure-elevation': integrated(
    'terrain-los-tacops-diagram-represented-pure-elevation',
    'Split sub-branch: calculateLOS represents the terrain-height side of MegaMek TacOps diagram elevation checks only for clear-hex pure elevation on straight and divided side paths, reports blockingElevation, and converts direct-fire declarations into no-side-effect AttackInvalid events; this row does not claim ADVANCED_COMBAT_TAC_OPS_LOS1 option state or diagram-height terrain-effect parity',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-represented-terrain-effects': integrated(
    'terrain-los-tacops-diagram-represented-terrain-effects',
    'Split sub-branch: calculateLOS exposes explicit TacOps diagram LOS option state for represented woods and smoke terrain effects, preserving current diagram-style defaults while allowing non-diagram endpoint-height checks to omit terrain effects that only the interpolated diagram LOS line reaches',
    [
      ...TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
      MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
    ],
  ),
  'terrain-los-side-paths': integrated(
    'terrain-los-side-paths',
    'Split-accounting row: core direct TerrainType blockers and single-path calculateLOS/hexLine cumulative woods/smoke LOS density are integrated under terrain-los-blocking and per-TerrainType LOS rows; source-backed land-to-depth-2+ water endpoint blocking is split under terrain-los-water-endpoint-blocking; represented underwater clear/non-water depth-0 sightline blocking is split under terrain-los-underwater-clear-hex-blocking; represented underwater endpoint-height classification and minimum-water-depth metadata are split under terrain-los-underwater-depth-height-side-paths; represented same-building building-hex blocking is split under terrain-los-same-building-hex-blocking; represented same-building endpoint base-elevation and explicit LOS-height difference counting is split under terrain-los-same-building-level-count; represented non-diagram building feature height blocking and taller-endpoint/adjacent-endpoint building-level cases are split under terrain-los-building-height-blocking; represented fuel-tank elevation metadata is split under terrain-los-fuel-tank-elevation; represented grounded DropShip entity cover, represented hard/soft building classification, represented building/fuel-tank damageable cover-provider metadata, and represented cover-hit damage routing into constructionFactor terrain state are split under terrain-los-grounded-dropship-cover-providers, terrain-los-hard-soft-building-cover-providers, terrain-los-fuel-tank-damageable-cover-providers, and terrain-los-damageable-cover-hit-resolution-routing; represented divided LOS side-path blocking and modifier selection is split under terrain-los-divided-side-path-blocking; represented divided LOS pure-elevation blocking is split under terrain-los-divided-elevation-blocking; represented single-path pure elevation blocking with direct-fire invalidation is split under terrain-los-intervening-elevation-blocking; represented clear-hex pure-elevation overlap with TacOps diagram terrain-height checks is split under terrain-los-tacops-diagram-represented-pure-elevation; represented woods/smoke/heavy-industrial/planted-field TacOps diagram terrain-effect option state is split under terrain-los-tacops-diagram-represented-terrain-effects, terrain-los-tacops-diagram-industrial-zone-side-paths, and terrain-los-tacops-diagram-planted-field-side-paths; represented combat-caller TacOps LOS1 option propagation is split under terrain-los-tacops-diagram-combat-caller-option-propagation; no represented BattleMech terrain LOS side-path leaf remains unsupported',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-industrial-zone-side-paths': integrated(
    'terrain-los-tacops-diagram-industrial-zone-side-paths',
    'calculateLOS models represented HeavyIndustrial terrain as the MegaMek heavy-industrial TacOps LOS1 side-path terrain class, applies explicit diagram-height gating on straight and divided side paths, adds +1 intervening modifier per counted hex, and blocks LOS once the represented count exceeds two',
    TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-planted-field-side-paths': integrated(
    'terrain-los-tacops-diagram-planted-field-side-paths',
    'calculateLOS models represented PlantedField terrain as the MegaMek planted-field TacOps LOS1 side-path terrain class, applies explicit diagram-height gating on straight and divided side paths, adds +1 intervening modifier per two counted fields, and blocks LOS once the represented count exceeds five',
    TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-combat-caller-option-propagation': integrated(
    'terrain-los-tacops-diagram-combat-caller-option-propagation',
    'Runner weapon attack LOS validation, runner C3 spotter LOS checks, interactive direct attack declarations, interactive indirect spotter terrain effects, and indirect-fire spotter election thread explicit optionalRules through lineOfSightOptionsFromOptionalRules so represented woods/smoke TacOps LOS1 diagram terrain effects turn on only when a recognized ADVANCED_COMBAT_TAC_OPS_LOS1-style rule is present',
    [
      ...TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
      ...MEKSTATION_TACOPS_LOS_CALLER_OPTION_SOURCE_REFS,
    ],
  ),
  'terrain-los-grounded-dropship-cover-providers': integrated(
    'terrain-los-grounded-dropship-cover-providers',
    'calculateLOS consumes represented occupant state keyed by hex occupantId, treats non-destroyed grounded DropShip occupants as level-10 LOS cover, records grounded DropShip damageable-cover provider metadata for partial-cover consumers, and runner weapon LOS plus C3 spotter LOS now thread combat-state occupants through that helper while leaving destroyed, airborne, and non-DropShip occupants inert',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-fuel-tank-elevation': integrated(
    'terrain-los-fuel-tank-elevation',
    'calculateLOS consumes explicit Building feature fuelTankElevation metadata as the FUEL_TANK_ELEV-derived LOS height and preserves fuelTankId in terrain encoding for future cover-provider routing; this covers fuel-tank elevation only, not damageable cover-provider output',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-fuel-tank-damageable-cover-providers': integrated(
    'terrain-los-fuel-tank-damageable-cover-providers',
    'calculateLOS records represented fuel-tank terrain features with explicit fuelTankElevation/fuelTankId metadata as damageable cover providers for horizontal partial-cover situations without treating them as generic building providers',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-hard-soft-building-cover-providers': integrated(
    'terrain-los-hard-soft-building-cover-providers',
    'calculateLOS records represented Building features as damageable cover providers for horizontal partial-cover situations and classifies them through constructionFactor metadata, matching the BLDG_CF > 90 hard-building branch while treating represented non-hard building elevation as soft',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-damageable-cover-hit-resolution-routing': integrated(
    'terrain-los-damageable-cover-hit-resolution-routing',
    'resolveWeaponHit consumes represented LOS building/fuel-tank damageable cover-provider metadata on covered leg-hit absorption, emits TerrainChanged with damageable_cover_hit, reduces provider constructionFactor terrain state, removes exhausted represented providers, and mutates the runner grid so later same-phase shots see the changed cover state',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
