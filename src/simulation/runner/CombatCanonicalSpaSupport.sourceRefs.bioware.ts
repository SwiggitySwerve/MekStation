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

export const CANONICAL_BIOWARE_NEURAL_INTERFACE_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
    'src/lib/spa/catalog/biowareSPAs.ts#L17-L29',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation unit combat state carries explicit neuralInterfaceActive for represented VDNI/BVDNI jack-in state, preserving legacy implicit-active behavior when absent.',
    'src/types/gameplay/GameSessionStateTypes.ts#L548-L553',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts#L185-L211',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation game-state replay applies NeuralInterfaceStateChanged events by mutating only the target unit neuralInterfaceActive flag.',
    'src/utils/gameplay/gameState/unitExitState.ts#L61-L73',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
    'src/utils/gameplay/__tests__/unitStateExtension.test.ts#L548-L596',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_BIOWARE_COMM_IMPLANT_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek OptionsConstants defines comm_implant and boost_comm_implant as Manei Domini option ids.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L265-L266`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek PilotOptions registers comm_implant and boost_comm_implant as selectable Manei Domini options.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/PilotOptions.java#L162-L163`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1562-L1567`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek TWGameManager applies comm-implant minefield detonation relief only to Infantry units.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7574-L7580`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6727-L6737`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek option text describes Cybernetic Comm Implant as indirect LRM spotter relief, non-infantry artillery spotting relief, and infantry-only minefield relief, with Boosted Comm Implant adding C3i.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/resources/megamek/common/options/messages.properties#L730-L733`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
    'src/lib/spa/catalog/biowareSPAs.ts#L102-L113',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation hydrateC3EquipmentFromFullUnit projects boost_comm_implant pilot ability state into represented BattleMech C3i network state.',
    'src/simulation/runner/UnitHydration.ts#L1498-L1536',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation C3 automatic-formation coverage proves mounted C3i equipment and represented Boosted Comm Implant C3i access form represented C3i networks while singleton, oversized, mixed-family, or ambiguous groups fail closed.',
    'src/utils/gameplay/c3Network/__tests__/automaticFormation.test.ts#L69-L85',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation GameCreated replay coverage proves raw session units with Boosted Comm Implant pilot ability state derive represented C3i networks without explicit mounted C3 equipment.',
    'src/utils/gameplay/__tests__/gameSession.test.ts#L213-L250',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation runner coverage proves two hydrated BattleMechs with boost_comm_implant seed a represented C3i network without manual authoring.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L494-L549',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation represented indirect-fire resolver applies Comm Implant and Boosted Comm Implant as source-backed LOS spotter target-number relief.',
    'src/utils/gameplay/indirectFire.ts#L477-L514',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_BIOWARE_CAMO_ARMOR_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek OptionsConstants defines dermal_camo_armor as a Manei Domini option id.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L275`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek Infantry.getArmorDesc treats dermal_camo_armor as infantry camo armor display state.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/common/units/Infantry.java#L1826-L1828`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek InfantryReadout renders dermal_camo_armor as infantry Camo armor capability when sneak camo is absent.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/client/ui/entityreadout/InfantryReadout.java#L280-L282`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation bioware SPA table defines Dermal Camouflage Armor as a canonical concealment/to-hit implant row.',
    'src/lib/spa/catalog/biowareSPAs.ts#L120-L125',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS = [
  ...MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
    'src/lib/spa/catalog/biowareSPAs.ts#L132-L143',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_TRIPLE_CORE_PROCESSOR_REPRESENTED_SOURCE_REFS = [
  ...CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS,
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation hydrateTargetingComputerEquipmentFromFullUnit projects mounted Targeting Computer equipment and critical-slot signals into explicit combat state without conflating them with Triple-Core Processor SPA state.',
    'src/simulation/runner/UnitHydration.ts#L296-L316',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation buildWeaponAttackAttackerToHitState applies the Targeting Computer modifier when either actual targetingComputerEquipment is present or represented Triple-Core Processor plus active VDNI/BVDNI called-shot eligibility is present.',
    'src/utils/gameplay/toHit/stateHydration.ts#L87-L102',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation runner to-hit coverage proves actual Targeting Computer equipment applies without Triple-Core Processor and does not double-apply when TCP aimed-shot relief is also eligible.',
    'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L2490-L2568',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_BIOWARE_PROTO_DNI_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek OptionsConstants defines proto_dni as a Manei Domini option id.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L275`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek PilotOptions registers proto_dni as a selectable Manei Domini option.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/options/PilotOptions.java#L179`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek ComputeAttackerToHitMods applies Prototype DNI as -2 ranged/gunnery target-number relief when active DNI is available.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L453-L466`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek Entity.hasDNIImplant includes proto_dni in the active DNI gate shared by VDNI and Buffered VDNI.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L12320-L12338`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek Mek.getBasePilotingRoll applies Prototype DNI as -3 BattleMech piloting target-number relief when active DNI is available.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L4125-L4138`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'Current MegaMek option text describes Prototype Direct Neural Interface as BattleMek-only -2 Gunnery, -3 Piloting, and damage-feedback behavior.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/megamek/resources/megamek/common/options/messages.properties#L773-L774`,
    MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation bioware SPA table defines Prototype Direct Neural Interface as a canonical early-generation DNI row with to-hit and PSR pipelines.',
    'src/lib/spa/catalog/biowareSPAs.ts#L157-L162',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation ranged to-hit SPA modifier helper consumes VDNI, Buffered VDNI, and Prototype DNI as represented active neural-interface target-number relief.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L218-L232',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation piloting SPA modifier helper consumes VDNI and Prototype DNI for represented BattleMech piloting target-number relief while excluding Buffered VDNI.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L437-L449',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation weapon attack hydration only grants represented Triple-Core Processor aimed-shot capability when active VDNI or Buffered VDNI is present.',
    'src/utils/gameplay/toHit/stateHydration.ts#L47-L57',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation unit-state reducer coverage proves represented Prototype DNI jack-out events update neuralInterfaceActive through the same active-DNI lifecycle state used by VDNI/BVDNI.',
    'src/utils/gameplay/__tests__/unitStateExtension.test.ts#L927-L944',
    'MekStation working-tree',
  ),
  ...MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek TWGameManager.checkPilotAvoidFallDamage skips fall pilot-damage avoidance rolls when the entity has Dermal Armor or TSM Implant.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23301-L23306`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L329-L347',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
    'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1067-L1080',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
    'src/utils/gameplay/__tests__/battlemechPhysicalCombat.behavior.test.ts#L5349-L5390',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS = [
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek TWDamageManager suppresses BattleMech head-hit crew damage when the unit has MD_DERMAL_ARMOR.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManager.java#L1812-L1814`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'megamek-source',
    'MegaMek TWDamageManagerModular suppresses BattleMech head-hit crew damage when the Mek has MD_DERMAL_ARMOR.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L1041-L1043`,
    MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation resolveDamage consumes dermal_armor pilot ability state to suppress head-hit pilot damage while preserving head armor and structure damage.',
    'src/utils/gameplay/damage/resolve.ts#L35-L72',
    'MekStation working-tree',
  ),
  canonicalSpaSourceRef(
    'mekstation-deviation',
    'MekStation head-damage-cap coverage proves Dermal Armor head hits damage the head but emit no pilot damage and leave pilot wounds unchanged.',
    'src/utils/gameplay/damage/__tests__/headDamageCap.test.ts#L168-L188',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
