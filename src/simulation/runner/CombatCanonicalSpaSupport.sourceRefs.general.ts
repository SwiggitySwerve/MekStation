import { CANONICAL_SPA_LIST, resolveSPAId } from '@/lib/spa';
import { type ISPADefinition } from '@/types/spa/SPADefinition';

import { canonicalSpaScopeSourceRefs } from './CombatCanonicalSpaSourceRefs';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import { combatFeatureSourceRef as canonicalSpaSourceRef } from './CombatFeatureSourceReference';
import {
  helperOnly,
  integrated,
  outOfScope,
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_NIGHTWALKER_SOURCE_REFS } from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS,
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';
import { remapMekStationSourceRef } from './CombatSourceRefAnchorRemap';

const MEGAMEK_CANONICAL_SPA_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION =
  '55584ec7529b944fca3216965697e9fa1115dced';

export const ARTIFICIAL_PAIN_SHUNT_AMMO_EXPLOSION_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek TWGameManager suppresses BattleMech ammunition-explosion crew hits when the pilot has Artificial Pain Shunt.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22820-L22831`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation resolveBattleMechAmmoExplosionPilotDamage returns zero for artificial_pain_shunt before applying Pain Resistance, Iron Man, or CASE relief.',
    'src/utils/gameplay/ammoTracking/pilotDamage.ts#L29-L35',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation applyAmmoExplosionPilotDamage routes heat-induced and critical-induced ammo explosions through the shared pilot-damage resolver and emits no PilotHit when the resolver returns zero wounds.',
    'src/simulation/runner/phases/ammoExplosionPilotDamage.ts#L47-L54',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation heat event coverage proves artificial_pain_shunt suppresses HeatInduced ammo-explosion PilotHit emission and leaves pilot wounds unchanged.',
    'src/simulation/runner/__tests__/heatEvents.03.test.ts#L127-L170',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_EAGLE_EYES_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6033-L6056`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7498-L7506`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical miscellaneous SPA catalog defines eagle_eyes as a sensors and minefield-detection row.',
    'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L10-L16',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
    'src/utils/gameplay/electronicWarfare/probes.ts#L20-L37',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
    'src/simulation/runner/SimulationRunnerState.ts#L120-L131',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
    'src/utils/gameplay/__tests__/electronicWarfare.test.ts#L493-L547',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L283-L321',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
    'src/simulation/runner/phases/movementMines.ts#L132-L774',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L1917-L1965',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_ENV_SPECIALIST_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L169`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek CustomMekDialog exposes Environmental Specialist options None, Fog, Light, Rain, Snow, and Wind, omitting the source-registered Hail constant from the picker.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/client/ui/dialogs/customMek/CustomMekDialog.java#L454-L459`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek ComputeAbilityMods applies Environmental Specialist to ranged to-hit for represented fog, light, rain, snow, and wind conditions without a Hail branch.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L168-L241`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek physical attack modifiers consume Light Environmental Specialist for unilluminated targets in moonless, solar-flare, or pitch-black light.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2733-L2741`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical miscellaneous SPA catalog defines env_specialist as a Fog/Light/Rain/Snow/Wind designation row with a to-hit combat pipeline.',
    'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L17-L26',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation designation option coverage proves env_specialist exposes exactly Fog, Light, Rain, Snow, and Wind choices rather than generic terrain-only values such as vacuum, underground, or low_gravity.',
    'src/lib/spa/designation/__tests__/getDesignationOptions.test.ts#L114-L121',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation env_specialist designation options are a SPA-specific terrain-shaped handoff that persists source-aligned environmental choices while leaving the generic terrain list unchanged for other terrain-designated SPAs.',
    'src/lib/spa/designation/getDesignationOptions.ts#L139-L151',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation environmental modifier coverage proves env_specialist applies represented Fog, Snow, Rain, Wind, and Light ranged to-hit relief plus Light physical to-hit relief with explicit designation gates.',
    'src/utils/gameplay/__tests__/environmentalModifiers.test.ts#L424-L649',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation runner weapon attack coverage proves Environmental Specialist Snow, Rain, Fog, Wind, and Light relief flows into AttackDeclared ranged to-hit modifiers.',
    'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L1418-L1768',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation physical attack coverage proves Environmental Specialist Light applies to represented physical to-hit helper paths.',
    'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L5233-L5303',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_GOLDEN_GOOSE_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical gunnery SPA catalog defines golden_goose as reduced bombing to-hit penalty and scatter distance.',
    'src/lib/spa/catalog/gunnerySPAs.ts#L30-L35',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_HUMAN_TRO_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical miscellaneous SPA catalog defines human_tro as a critical-hit modifier against a designated unit type.',
    'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L34-L40',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation battle armor leg-attack resolver consumes an explicit humanTroMekSpa flag as a +1 critical-hit modifier.',
    'src/utils/gameplay/battlearmor/legAttackResolver.ts#L43-L60',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation battle armor leg-attack coverage proves the HUMAN_TRO_MEK flag shifts Mek critical-hit modifiers by +1.',
    'src/utils/gameplay/battlearmor/__tests__/legAttackResolver.test.ts#L195-L207',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_OBLIQUE_ARTILLERY_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical gunnery SPA catalog defines oblique_artillery as reduced artillery scatter.',
    'src/lib/spa/catalog/gunnerySPAs.ts#L50-L54',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation BattleMech combat catalog keeps oblique_artillery distinct from the integrated oblique_attacker indirect-fire row.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.05.maps-every-damage-capable-official-streak-srm-launcher.fragment.ts#L25-L27',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_ZWEIHANDER_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek OptionsConstants and PilotOptions define Zweihander as the source-backed zweihander pilot option.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L188-L188`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/BipedMek.java#L420-L430`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek punch and club actions carry an explicit zweihandering declaration flag before applying two-handed attack effects.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L74-L84`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek Zweihander punch and club damage add floor(weight / 10) when the two-handed declaration is active.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L436-L439`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek applyZweihanderSelfDamage applies arm critical self-damage and queues a Zweihander miss PSR when the declared two-handed attack misses.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L11349-L11360`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation canonical piloting SPA catalog defines zweihander as a two-handed weapon strike with extra damage at a to-hit penalty.',
    'src/lib/spa/catalog/pilotingSPAs.ts#L120-L126',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
