import {
  CANONICAL_BIOWARE_NEURAL_INTERFACE_SOURCE_REFS,
  CANONICAL_BIOWARE_COMM_IMPLANT_SOURCE_REFS,
  CANONICAL_BIOWARE_CAMO_ARMOR_SOURCE_REFS,
  CANONICAL_BIOWARE_PROCESSOR_ENVIRONMENT_SOURCE_REFS,
  CANONICAL_TRIPLE_CORE_PROCESSOR_REPRESENTED_SOURCE_REFS,
  CANONICAL_BIOWARE_PROTO_DNI_SOURCE_REFS,
  CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
  CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
} from './CombatCanonicalSpaSupport.sourceRefs.bioware';
import {
  ARTIFICIAL_PAIN_SHUNT_AMMO_EXPLOSION_SOURCE_REFS,
  CANONICAL_EAGLE_EYES_SOURCE_REFS,
  CANONICAL_ENV_SPECIALIST_SOURCE_REFS,
  CANONICAL_GOLDEN_GOOSE_SOURCE_REFS,
  CANONICAL_HUMAN_TRO_SOURCE_REFS,
  CANONICAL_OBLIQUE_ARTILLERY_SOURCE_REFS,
  CANONICAL_ZWEIHANDER_SOURCE_REFS,
} from './CombatCanonicalSpaSupport.sourceRefs.general';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_NIGHTWALKER_SOURCE_REFS } from './CombatLegacyPilotAbilitySourceRefs';

export const CANONICAL_ONLY_SPA_SUPPORT: Readonly<
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

export const BIOWARE_PERSONNEL_ONLY_SPA_IDS = new Set([
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
