import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { CANONICAL_SPA_LIST, resolveSPAId } from '@/lib/spa';

import { canonicalSpaScopeSourceRefs } from './CombatCanonicalSpaSourceRefs';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_NIGHTWALKER_SOURCE_REFS } from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS,
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

const SPA_SUPPORT_BY_ID: Record<string, ICombatFeatureSupportEntry> =
  SPA_COMBAT_SUPPORT;
const MEGAMEK_CANONICAL_SPA_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION =
  '55584ec7529b944fca3216965697e9fa1115dced';

const ARTIFICIAL_PAIN_SHUNT_AMMO_EXPLOSION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager suppresses BattleMech ammunition-explosion crew hits when the pilot has Artificial Pain Shunt.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22820-L22831`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolveBattleMechAmmoExplosionPilotDamage returns zero for artificial_pain_shunt before applying Pain Resistance, Iron Man, or CASE relief.',
    url: 'src/utils/gameplay/ammoTracking/pilotDamage.ts#L29-L35',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation applyAmmoExplosionPilotDamage routes heat-induced and critical-induced ammo explosions through the shared pilot-damage resolver and emits no PilotHit when the resolver returns zero wounds.',
    url: 'src/simulation/runner/phases/ammoExplosionPilotDamage.ts#L47-L54',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation heat event coverage proves artificial_pain_shunt suppresses HeatInduced ammo-explosion PilotHit emission and leaves pilot wounds unchanged.',
    url: 'src/simulation/runner/__tests__/heatEvents.test.ts#L805-L850',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_EAGLE_EYES_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6033-L6056`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7498-L7506`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical miscellaneous SPA catalog defines eagle_eyes as a sensors and minefield-detection row.',
    url: 'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L10-L16',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
    url: 'src/utils/gameplay/electronicWarfare/probes.ts#L20-L37',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
    url: 'src/simulation/runner/SimulationRunnerState.ts#L120-L131',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
    url: 'src/utils/gameplay/__tests__/electronicWarfare.test.ts#L493-L547',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
    url: 'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L283-L321',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
    url: 'src/simulation/runner/phases/movementMines.ts#L38-L105',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
    url: 'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L1917-L1965',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_ENV_SPECIALIST_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L169`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek CustomMekDialog exposes Environmental Specialist options None, Fog, Light, Rain, Snow, and Wind, omitting the source-registered Hail constant from the picker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/client/ui/dialogs/customMek/CustomMekDialog.java#L454-L459`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Environmental Specialist to ranged to-hit for represented fog, light, rain, snow, and wind conditions without a Hail branch.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L168-L241`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek physical attack modifiers consume Light Environmental Specialist for unilluminated targets in moonless, solar-flare, or pitch-black light.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2733-L2741`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical miscellaneous SPA catalog defines env_specialist as a Fog/Light/Rain/Snow/Wind designation row with a to-hit combat pipeline.',
    url: 'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L17-L26',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation designation option coverage proves env_specialist exposes exactly Fog, Light, Rain, Snow, and Wind choices rather than generic terrain-only values such as vacuum, underground, or low_gravity.',
    url: 'src/lib/spa/designation/__tests__/getDesignationOptions.test.ts#L114-L121',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation env_specialist designation options are a SPA-specific terrain-shaped handoff that persists source-aligned environmental choices while leaving the generic terrain list unchanged for other terrain-designated SPAs.',
    url: 'src/lib/spa/designation/getDesignationOptions.ts#L139-L151',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation environmental modifier coverage proves env_specialist applies represented Fog, Snow, Rain, Wind, and Light ranged to-hit relief plus Light physical to-hit relief with explicit designation gates.',
    url: 'src/utils/gameplay/__tests__/environmentalModifiers.test.ts#L424-L649',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner weapon attack coverage proves Environmental Specialist Snow, Rain, Fog, Wind, and Light relief flows into AttackDeclared ranged to-hit modifiers.',
    url: 'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L1418-L1768',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation physical attack coverage proves Environmental Specialist Light applies to represented physical to-hit helper paths.',
    url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L5233-L5303',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_GOLDEN_GOOSE_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical gunnery SPA catalog defines golden_goose as reduced bombing to-hit penalty and scatter distance.',
    url: 'src/lib/spa/catalog/gunnerySPAs.ts#L30-L35',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_HUMAN_TRO_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical miscellaneous SPA catalog defines human_tro as a critical-hit modifier against a designated unit type.',
    url: 'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L34-L40',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation battle armor leg-attack resolver consumes an explicit humanTroMekSpa flag as a +1 critical-hit modifier.',
    url: 'src/utils/gameplay/battlearmor/legAttackResolver.ts#L43-L60',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation battle armor leg-attack coverage proves the HUMAN_TRO_MEK flag shifts Mek critical-hit modifiers by +1.',
    url: 'src/utils/gameplay/battlearmor/__tests__/legAttackResolver.test.ts#L195-L207',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_OBLIQUE_ARTILLERY_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical gunnery SPA catalog defines oblique_artillery as reduced artillery scatter.',
    url: 'src/lib/spa/catalog/gunnerySPAs.ts#L50-L54',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation BattleMech combat catalog keeps oblique_artillery distinct from the integrated oblique_attacker indirect-fire row.',
    url: 'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts#L2355-L2357',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_ZWEIHANDER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants and PilotOptions define Zweihander as the source-backed zweihander pilot option.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L188-L188`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/BipedMek.java#L420-L430`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek punch and club actions carry an explicit zweihandering declaration flag before applying two-handed attack effects.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L74-L84`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Zweihander punch and club damage add floor(weight / 10) when the two-handed declaration is active.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L436-L439`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek applyZweihanderSelfDamage applies arm critical self-damage and queues a Zweihander miss PSR when the declared two-handed attack misses.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L11349-L11360`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canonical piloting SPA catalog defines zweihander as a two-handed weapon strike with extra damage at a to-hit penalty.',
    url: 'src/lib/spa/catalog/pilotingSPAs.ts#L120-L126',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_BIOWARE_NEURAL_INTERFACE_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
    url: 'src/lib/spa/catalog/biowareSPAs.ts#L17-L29',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation unit combat state carries explicit neuralInterfaceActive for represented VDNI/BVDNI jack-in state, preserving legacy implicit-active behavior when absent.',
    url: 'src/types/gameplay/GameSessionStateTypes.ts#L548-L553',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
    url: 'src/utils/gameplay/gameEvents/statusPhysical.ts#L185-L211',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation game-state replay applies NeuralInterfaceStateChanged events by mutating only the target unit neuralInterfaceActive flag.',
    url: 'src/utils/gameplay/gameState/extendedCombat.ts#L630-L654',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
    url: 'src/utils/gameplay/__tests__/unitStateExtension.test.ts#L548-L596',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_BIOWARE_COMM_IMPLANT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek OptionsConstants defines comm_implant and boost_comm_implant as Manei Domini option ids.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L265-L266`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek PilotOptions registers comm_implant and boost_comm_implant as selectable Manei Domini options.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/PilotOptions.java#L162-L163`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1562-L1567`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek TWGameManager applies comm-implant minefield detonation relief only to Infantry units.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7574-L7580`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6727-L6737`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek option text describes Cybernetic Comm Implant as indirect LRM spotter relief, non-infantry artillery spotting relief, and infantry-only minefield relief, with Boosted Comm Implant adding C3i.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/resources/megamek/common/options/messages.properties#L730-L733`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
    url: 'src/lib/spa/catalog/biowareSPAs.ts#L102-L113',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation hydrateC3EquipmentFromFullUnit projects boost_comm_implant pilot ability state into represented BattleMech C3i network state.',
    url: 'src/simulation/runner/UnitHydration.ts#L1498-L1536',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation C3 automatic-formation coverage proves mounted C3i equipment and represented Boosted Comm Implant C3i access form represented C3i networks while singleton, oversized, mixed-family, or ambiguous groups fail closed.',
    url: 'src/utils/gameplay/c3Network/__tests__/automaticFormation.test.ts#L69-L85',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation GameCreated replay coverage proves raw session units with Boosted Comm Implant pilot ability state derive represented C3i networks without explicit mounted C3 equipment.',
    url: 'src/utils/gameplay/__tests__/gameSession.test.ts#L213-L250',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner coverage proves two hydrated BattleMechs with boost_comm_implant seed a represented C3i network without manual authoring.',
    url: 'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L494-L549',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation represented indirect-fire resolver applies Comm Implant and Boosted Comm Implant as source-backed LOS spotter target-number relief.',
    url: 'src/utils/gameplay/indirectFire.ts#L477-L514',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_BIOWARE_CAMO_ARMOR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines dermal_camo_armor as a Manei Domini option id.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L275`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Infantry.getArmorDesc treats dermal_camo_armor as infantry camo armor display state.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Infantry.java#L1826-L1828`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek InfantryReadout renders dermal_camo_armor as infantry Camo armor capability when sneak camo is absent.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/client/ui/entityreadout/InfantryReadout.java#L280-L282`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation bioware SPA table defines Dermal Camouflage Armor as a canonical concealment/to-hit implant row.',
    url: 'src/lib/spa/catalog/biowareSPAs.ts#L120-L125',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS = [
  ...MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
    url: 'src/lib/spa/catalog/biowareSPAs.ts#L132-L143',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_TRIPLE_CORE_PROCESSOR_REPRESENTED_SOURCE_REFS = [
  ...CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS,
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation hydrateTargetingComputerEquipmentFromFullUnit projects mounted Targeting Computer equipment and critical-slot signals into explicit combat state without conflating them with Triple-Core Processor SPA state.',
    url: 'src/simulation/runner/UnitHydration.ts#L296-L316',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation buildWeaponAttackAttackerToHitState applies the Targeting Computer modifier when either actual targetingComputerEquipment is present or represented Triple-Core Processor plus active VDNI/BVDNI called-shot eligibility is present.',
    url: 'src/utils/gameplay/toHit/stateHydration.ts#L87-L102',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner to-hit coverage proves actual Targeting Computer equipment applies without Triple-Core Processor and does not double-apply when TCP aimed-shot relief is also eligible.',
    url: 'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L2490-L2568',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CANONICAL_BIOWARE_PROTO_DNI_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek OptionsConstants defines proto_dni as a Manei Domini option id.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L275`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek PilotOptions registers proto_dni as a selectable Manei Domini option.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/PilotOptions.java#L179`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek ComputeAttackerToHitMods applies Prototype DNI as -2 ranged/gunnery target-number relief when active DNI is available.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L453-L466`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek Entity.hasDNIImplant includes proto_dni in the active DNI gate shared by VDNI and Buffered VDNI.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L12320-L12338`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek Mek.getBasePilotingRoll applies Prototype DNI as -3 BattleMech piloting target-number relief when active DNI is available.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L4125-L4138`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Current MegaMek option text describes Prototype Direct Neural Interface as BattleMek-only -2 Gunnery, -3 Piloting, and damage-feedback behavior.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/resources/megamek/common/options/messages.properties#L773-L774`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation bioware SPA table defines Prototype Direct Neural Interface as a canonical early-generation DNI row with to-hit and PSR pipelines.',
    url: 'src/lib/spa/catalog/biowareSPAs.ts#L157-L162',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation ranged to-hit SPA modifier helper consumes VDNI, Buffered VDNI, and Prototype DNI as represented active neural-interface target-number relief.',
    url: 'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L218-L232',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation piloting SPA modifier helper consumes VDNI and Prototype DNI for represented BattleMech piloting target-number relief while excluding Buffered VDNI.',
    url: 'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L437-L449',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation weapon attack hydration only grants represented Triple-Core Processor aimed-shot capability when active VDNI or Buffered VDNI is present.',
    url: 'src/utils/gameplay/toHit/stateHydration.ts#L47-L57',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation unit-state reducer coverage proves represented Prototype DNI jack-out events update neuralInterfaceActive through the same active-DNI lifecycle state used by VDNI/BVDNI.',
    url: 'src/utils/gameplay/__tests__/unitStateExtension.test.ts#L927-L944',
    sourceVersion: 'MekStation working-tree',
  },
  ...MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.checkPilotAvoidFallDamage skips fall pilot-damage avoidance rolls when the entity has Dermal Armor or TSM Implant.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23301-L23306`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
    url: 'src/utils/gameplay/physicalAttacks/damage.ts#L329-L347',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
    url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1067-L1080',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
    url: 'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.test.ts#L5349-L5390',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWDamageManager suppresses BattleMech head-hit crew damage when the unit has MD_DERMAL_ARMOR.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManager.java#L1812-L1814`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWDamageManagerModular suppresses BattleMech head-hit crew damage when the Mek has MD_DERMAL_ARMOR.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L1041-L1043`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolveDamage consumes dermal_armor pilot ability state to suppress head-hit pilot damage while preserving head armor and structure damage.',
    url: 'src/utils/gameplay/damage/resolve.ts#L35-L72',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation head-damage-cap coverage proves Dermal Armor head hits damage the head but emit no pilot damage and leave pilot wounds unchanged.',
    url: 'src/utils/gameplay/damage/__tests__/headDamageCap.test.ts#L168-L188',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
}

function unsupported(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'unsupported', evidence, gap, sourceRefs }
    : { id, level: 'unsupported', evidence, gap };
}

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'out-of-scope', evidence, gap, sourceRefs }
    : { id, level: 'out-of-scope', evidence, gap };
}

const CANONICAL_ONLY_SPA_SUPPORT: Readonly<
  Record<string, ICombatFeatureSupportEntry>
> = {
  eagle_eyes: integrated(
    'eagle_eyes',
    'Canonical eagle_eyes is represented for MegaMek BattleMech combat effects: hydrated active-probe ECM-counter range gains one hex, and represented minefield entry rolls apply the Eagle Eyes +2 detonation target-number relief before BattleMech leg damage. Non-conventional type semantics remain tracked by an exact ruleSupport.terrainEnvironment minefield branch row rather than by this canonical SPA row',
    CANONICAL_EAGLE_EYES_SOURCE_REFS,
  ),
  env_specialist: integrated(
    'env_specialist',
    'Canonical env_specialist is catalog-visible with Fog/Light/Rain/Snow/Wind designation option data aligned to MegaMek CustomMekDialog options, and MekStation consumes the source-backed runtime branches for represented Fog/Snow/Rain/Wind/Light ranged to-hit plus Light physical to-hit behavior. Hail stays excluded because MegaMek registers the constant but exposes no picker/runtime branch, and generic terrain-only values such as vacuum, underground, and low_gravity remain outside Environmental Specialist coverage',
    CANONICAL_ENV_SPECIALIST_SOURCE_REFS,
  ),
  golden_goose: outOfScope(
    'golden_goose',
    'Canonical golden_goose is catalog-visible as a bombing to-hit and scatter SPA',
    'Golden Goose belongs in an aerospace/bombing validation matrix; current BattleMech combat validation does not model bombing attack resolution or bombing scatter',
    CANONICAL_GOLDEN_GOOSE_SOURCE_REFS,
  ),
  human_tro: outOfScope(
    'human_tro',
    'Canonical human_tro is catalog-visible as a critical-hit modifier and MekStation battle armor leg-attack helpers consume an explicit HUMAN_TRO_MEK flag for battle armor attacks against Meks',
    'Human TRO is accounted for by battle armor leg-attack helper coverage, not by BattleMech pilot combat SPA hydration; keep it out of the BattleMech SPA blocker inventory until a BattleMech-side resolver consumes the canonical SPA id',
    CANONICAL_HUMAN_TRO_SOURCE_REFS,
  ),
  oblique_artillery: outOfScope(
    'oblique_artillery',
    'Canonical oblique_artillery is catalog-visible as reduced artillery scatter only; the integrated oblique_attacker row covers indirect-fire to-hit penalties, not artillery scatter reduction',
    'Oblique Artilleryman belongs in an artillery/scatter validation matrix; current BattleMech combat validation does not model artillery attack resolution or scatter adjustment, and indirect-fire penalty coverage must not promote this row',
    CANONICAL_OBLIQUE_ARTILLERY_SOURCE_REFS,
  ),
  zweihander: integrated(
    'zweihander',
    'Canonical zweihander is catalog-visible as a two-handed BattleMech punch/club or physical-weapon declaration with source-backed actuator, arm-state, arm-fire, and prone eligibility gates; MekStation consumes the SPA id for represented explicit two-handed punch and every official standalone physical-weapon declaration, including selected-arm limb/location selection, per-arm hand and off-arm actuator state, bonus damage, miss PSR, represented self-critical side effects, interactive declaration prompts, runner declaration events, and invalid declaration no-side-effect gates. Non-catalog improvised club, breakage, and broader mounted physical-weapon mode authoring are excluded from this BattleMech official-weapon SPA blocker and remain visible through the physical-weapon action scope split',
    CANONICAL_ZWEIHANDER_SOURCE_REFS,
  ),
  artificial_pain_shunt: integrated(
    'artificial_pain_shunt',
    'resolveBattleMechAmmoExplosionPilotDamage consumes canonical artificial_pain_shunt ability state to suppress source-backed BattleMech ammunition-explosion pilot damage, and runner ammo-explosion paths skip PilotHit emission when the resolver returns zero wounds',
    ARTIFICIAL_PAIN_SHUNT_AMMO_EXPLOSION_SOURCE_REFS,
  ),
  vdni: integrated(
    'vdni',
    'Canonical vdni is catalog-visible as a neural-interface implant affecting ranged to-hit, piloting target numbers, and internal-damage neural feedback; MekStation consumes vdni for represented ranged to-hit, piloting target-number, internal-structure damage feedback, explicit disconnected neuralInterfaceActive gates, and replayable NeuralInterfaceStateChanged jack-in/jack-out state transitions',
    CANONICAL_BIOWARE_NEURAL_INTERFACE_SOURCE_REFS,
  ),
  bvdni: integrated(
    'bvdni',
    'Canonical bvdni is catalog-visible as a Buffered VDNI neural-interface row; MekStation consumes bvdni for represented ranged to-hit target-number relief, critical-hit neural feedback, TCP pairing gates, explicit disconnected neuralInterfaceActive gates, and replayable NeuralInterfaceStateChanged jack-in/jack-out state transitions while keeping the VDNI-only piloting bonus disabled for buffered interfaces',
    CANONICAL_BIOWARE_NEURAL_INTERFACE_SOURCE_REFS,
  ),
  comm_implant: integrated(
    'comm_implant',
    'Canonical comm_implant is catalog-visible as LRM spotting and mine-spotting comm hardware; current MegaMek executable BattleMech combat applies the implant as -1 indirect LRM spotter target-number relief while minefield detonation relief is Infantry-only, and MekStation consumes comm_implant for represented LOS spotter indirect-fire relief. Non-LRM artillery spotting belongs in an artillery validation matrix rather than this BattleMech weapon-attack SPA row',
    CANONICAL_BIOWARE_COMM_IMPLANT_SOURCE_REFS,
  ),
  boost_comm_implant: integrated(
    'boost_comm_implant',
    'Canonical boost_comm_implant is catalog-visible as comm-implant spotting plus a C3i-node implant; current MegaMek applies the comm-implant indirect LRM spotter relief and treats boosted comm implant as C3i access for any crewed unit, and MekStation consumes boost_comm_implant for represented LOS spotter indirect-fire relief plus represented BattleMech C3i network state that flows through conservative C3i seeding without adding manual network authoring',
    CANONICAL_BIOWARE_COMM_IMPLANT_SOURCE_REFS,
  ),
  dermal_camo_armor: outOfScope(
    'dermal_camo_armor',
    'Canonical dermal_camo_armor is catalog-visible as a concealment/to-hit implant, but MegaMek source only routes dermal_camo_armor through Infantry armor/readout camo state and no BattleMech attacker to-hit or concealment resolver consumes the option id',
    'Dermal Camouflage Armor belongs in an infantry/personnel concealment validation matrix; current BattleMech combat validation must not count infantry camo armor display support as a missing BattleMech SPA combat resolver',
    CANONICAL_BIOWARE_CAMO_ARMOR_SOURCE_REFS,
  ),
  triple_core_processor: integrated(
    'triple_core_processor',
    'Canonical triple_core_processor is catalog-visible as an initiative and to-hit processor implant; MekStation consumes the represented BattleMech initiative component, represented shutdown/hostile-ECM/EMI initiative reductions, represented called-shot Targeting Computer -1 aimed-shot relief when active VDNI or Buffered VDNI is also present, explicit disconnected neuralInterfaceActive gates, represented neural-interface lifecycle state, and actual Targeting Computer equipment state without double-counting TCP-backed relief',
    CANONICAL_TRIPLE_CORE_PROCESSOR_REPRESENTED_SOURCE_REFS,
  ),
  filtration_implants: outOfScope(
    'filtration_implants',
    'Canonical filtration_implants is catalog-visible as toxin and low-atmosphere environmental-hazard immunity only; current BattleMech atmosphere support is heat/dissipation math and no BattleMech pilot hazard resolver consumes the SPA id',
    'Filtration Implants belongs in an environment/personnel hazard validation matrix until BattleMech cockpit exposure, life-support failure, or pilot toxin/low-atmosphere injury effects are modeled; do not count heat-only atmosphere support as Filtration Implants coverage',
    CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS,
  ),
  proto_dni: integrated(
    'proto_dni',
    'Canonical proto_dni is catalog-visible as an early-generation DNI row; current MegaMek includes proto_dni in active DNI detection and applies source-backed -2 ranged/gunnery and -3 BattleMech piloting target-number relief, while the executable damage-feedback branch checks VDNI/BVDNI rather than proto_dni. MekStation consumes proto_dni for represented ranged to-hit, BattleMech PSR target-number relief, and explicit neuralInterfaceActive lifecycle replay without inferring VDNI neural-feedback pilot damage from option text alone',
    CANONICAL_BIOWARE_PROTO_DNI_SOURCE_REFS,
  ),
  edge_when_headhit: integrated(
    'edge_when_headhit',
    'BattleMech hit-location resolution consumes edge_when_headhit trigger-specific state, spends represented Edge, replaces head-hit locations with deterministic rerolls, carries superseded/final metadata, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
    ],
  ),
  edge_when_tac: integrated(
    'edge_when_tac',
    'BattleMech hit-location resolution consumes edge_when_tac trigger-specific state, spends represented Edge, replaces TAC hit-location results with deterministic rerolls before TAC critical processing, carries superseded/final metadata, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS, ...MEKSTATION_EDGE_TAC_SOURCE_REFS],
  ),
  edge_when_ko: integrated(
    'edge_when_ko',
    'resolvePilotConsciousnessCheck consumes edge_when_ko trigger-specific state for failed BattleMech knockout checks, spends represented Edge, carries superseded/final roll metadata, and runner plus interactive PilotHit paths persist the remaining Edge point count',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  edge_when_explosion: integrated(
    'edge_when_explosion',
    'resolveCriticalHits consumes edge_when_explosion trigger-specific state for BattleMech ammo critical-slot selection, spends represented Edge, and redirects to a hittable non-explosive slot when one exists',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
    ],
  ),
  tm_nightwalker: integrated(
    'tm_nightwalker',
    'validateMovement, getMovementStepCostBreakdown, deriveReachableHexes, validateCommittedMovement, and runMovementPhase consume represented environmental light state: non-Nightwalker BattleMech ground movement pays legacy dawn/dusk/night and MegaMek full-moon, glare, moonless, solar-flare, and pitch-black MP penalties, canonical tm_nightwalker bypasses those represented costs and fail-closed prohibits run-derived ground movement in those low-light states, represented airborne LAM ground projection stays blocked before Nightwalker relief can apply, and no Nightwalker to-hit modifier is claimed',
    MEGAMEK_NIGHTWALKER_SOURCE_REFS,
  ),
  dermal_armor: integrated(
    'dermal_armor',
    'Canonical dermal_armor is catalog-visible as a damage pipeline implant; MekStation represents the BattleMech head-hit pilot-damage suppression slice in resolveDamage and the entity fall pilot-damage immunity slice in resolveDfaMissFallPilotDamageAvoidance, while non-BattleMech infantry, vehicle, and aerospace Dermal Armor branches are split out of this BattleMech matrix',
    [
      ...CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
      ...CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
    ],
  ),
  tsm_implant: integrated(
    'tsm_implant',
    'Canonical tsm_implant is catalog-visible as a damage pipeline implant; MekStation represents the BattleMech-relevant entity fall pilot-damage immunity slice by consuming tsm_implant in resolveDfaMissFallPilotDamageAvoidance, while infantry TSM implant damage/divisor and aerospace/vehicle crew-hit branches are split out of this BattleMech matrix and ordinary BattleMech physical-weapon TSM damage remains modeled by equipment heat state rather than this SPA id',
    CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
  ),
};

const BIOWARE_PERSONNEL_ONLY_SPA_IDS = new Set([
  'pl_enhanced',
  'pl_ienhanced',
  'pl_masc',
  'pl_extra_limbs',
  'pl_tail',
  'pl_glider',
  'pl_flight',
  'cyber_imp_audio',
  'cyber_imp_visual',
  'cyber_imp_laser',
  'mm_implants',
  'enh_mm_implants',
  'gas_effuser_pheromone',
  'gas_effuser_toxin',
  'suicide_implants',
]);

function cloneForCanonicalSpa(
  spa: ISPADefinition,
  support: ICombatFeatureSupportEntry,
): ICombatFeatureSupportEntry {
  const sourceRefs = mergeSourceRefs(
    support.sourceRefs ?? [],
    canonicalSpaScopeSourceRefs(spa),
  );

  return {
    ...support,
    id: spa.id,
    evidence: `${support.evidence}; canonical SPA catalog id ${spa.id} is covered through the combat SPA support map`,
    sourceRefs,
  };
}

function mergeSourceRefs(
  ...sourceRefGroups: readonly (readonly ICombatFeatureSourceReference[])[]
): readonly ICombatFeatureSourceReference[] {
  return Array.from(
    new Map(
      sourceRefGroups
        .flatMap((sourceRefs) => [...sourceRefs])
        .map((sourceRef) => [`${sourceRef.kind}:${sourceRef.url}`, sourceRef]),
    ).values(),
  );
}

function canonicalSpaFallback(spa: ISPADefinition): ICombatFeatureSupportEntry {
  const pipelineList = spa.pipelines.join(', ') || 'none';
  const evidence = `Canonical SPA catalog entry "${spa.displayName}" (${spa.id}) affects pipeline(s): ${pipelineList}`;

  if (spa.source === 'Unofficial' || spa.source === 'Legacy') {
    return outOfScope(
      spa.id,
      evidence,
      'Unofficial and legacy SPA rows are excluded from the official BattleMech validation matrix until explicitly enabled',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'infantry') {
    return outOfScope(
      spa.id,
      evidence,
      'Infantry-scoped SPAs belong in the separate infantry or battle-armor validation matrix',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge' && spa.id.startsWith('edge_when_aero_')) {
    return outOfScope(
      spa.id,
      evidence,
      'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge' && spa.id === 'edge_when_masc_fails') {
    return integrated(
      spa.id,
      `${evidence}; runPSRPhase consumes this trigger for source-backed MASC and Supercharger failure rerolls, spends Edge, emits superseded/reroll evidence, and suppresses failure aftermath when the reroll passes`,
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'bioware') {
    if (BIOWARE_PERSONNEL_ONLY_SPA_IDS.has(spa.id)) {
      return outOfScope(
        spa.id,
        `${evidence}; this bioware row is infantry, prosthetic, sensory-implant, gas-effuser, or capture/self-destruct personnel equipment rather than a BattleMech pilot combat resolver input`,
        'Personnel-only Manei Domini implant rows belong in an infantry/personnel or campaign-capture validation matrix; they are catalog-visible but are not BattleMech combat completion blockers',
        canonicalSpaScopeSourceRefs(spa),
      );
    }

    return helperOnly(
      spa.id,
      evidence,
      'BattleMech-relevant Manei Domini/bioware SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge') {
    return helperOnly(
      spa.id,
      evidence,
      'Trigger-specific Edge SPAs are catalog-visible; BattleMech Edge triggers move row-by-row as runtime evidence proves each trigger-specific path, while aggregate Edge rows stay helper-only until broad coverage is proven',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.source === 'ATOW') {
    return outOfScope(
      spa.id,
      evidence,
      'ATOW/origin-level and aerospace-control SPA effects belong in a separate personnel or aerospace validation matrix instead of the official BattleMech combat blocker inventory',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  return helperOnly(
    spa.id,
    evidence,
    'No combat support entry or resolver consumes this canonical SPA id yet',
    canonicalSpaScopeSourceRefs(spa),
  );
}

function canonicalSpaSupportEntry(
  spa: ISPADefinition,
): ICombatFeatureSupportEntry {
  const directSupport = SPA_SUPPORT_BY_ID[spa.id];
  if (directSupport) return cloneForCanonicalSpa(spa, directSupport);

  const aliasedSupport = Object.values(SPA_COMBAT_SUPPORT).find(
    (entry) => resolveSPAId(entry.id) === spa.id,
  );
  if (aliasedSupport) return cloneForCanonicalSpa(spa, aliasedSupport);

  const canonicalOnlySupport = CANONICAL_ONLY_SPA_SUPPORT[spa.id];
  if (canonicalOnlySupport)
    return cloneForCanonicalSpa(spa, canonicalOnlySupport);

  return canonicalSpaFallback(spa);
}

export const CANONICAL_SPA_COMBAT_SCOPE_SUPPORT = Object.fromEntries(
  CANONICAL_SPA_LIST.map((spa) => [spa.id, canonicalSpaSupportEntry(spa)]),
) satisfies Record<string, ICombatFeatureSupportEntry>;
