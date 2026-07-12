import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  MEGAMEK_ECM_SUITE_SOURCE_REFS,
  MEKSTATION_ARTEMIS_STEALTH_LIFECYCLE_SOURCE_REFS,
  MEGAMEK_NOVA_CEWS_NETWORK_SOURCE_REFS,
  MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
  MEGAMEK_TAG_CLEAR_SOURCE_REFS,
  MEGAMEK_TAG_DESIGNATION_SOURCE_REFS,
  MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  MEGAMEK_TAG_SEMI_GUIDED_SOURCE_REFS,
} from './CombatSpecialWeaponSourceRefs';

export const SPECIAL_WEAPON_TAG_ARTEMIS_COMBAT_SUPPORT = {
  'tag-designation-hit': integrated(
    'tag-designation-hit',
    'Source-backed TAG marker behavior: applyDesignatorMarkerHit marks targets as TAG-designated on hit without applying damage',
    MEGAMEK_TAG_DESIGNATION_SOURCE_REFS,
  ),
  'tag-turn-lifecycle-clear': integrated(
    'tag-turn-lifecycle-clear',
    'Source-backed turn lifecycle reset clears transient TAG designations while preserving persistent NARC markers',
    MEGAMEK_TAG_CLEAR_SOURCE_REFS,
  ),
  'tag-marker-lifecycle-events': integrated(
    'tag-marker-lifecycle-events',
    'runner TAG hits emit DesignatorMarkerApplied when they set transient tagDesignated target state',
    MEGAMEK_TAG_DESIGNATION_SOURCE_REFS,
  ),
  'tag-semi-guided-to-hit': integrated(
    'tag-semi-guided-to-hit',
    'calculateToHit appends source-backed semi-guided TAG target-movement cancellation and indirect-fire relief, and runAttackPhase plus declareAttack hydrate semi-guided/TAG state into weapon to-hit resolution',
    MEGAMEK_TAG_SEMI_GUIDED_SOURCE_REFS,
  ),
  'tag-intent-wire-state-replay': integrated(
    'tag-intent-wire-state-replay',
    'Generic Attack game and wire intents carry TAG weapon ids through declareAttack, runner TAG hits emit DesignatorMarkerApplied, the replay reducer reapplies tagDesignated target state, and TurnStarted clears transient TAG state',
    MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  ),
  'artemis-cluster-modifier': integrated(
    'artemis-cluster-modifier',
    'Source-backed UnitHydration hydrates Artemis IV/prototype IV/V flags from explicit linkedEquipment metadata, unambiguous single-launcher same-location FCS, or exact same-location FCS-to-compatible-launcher cardinality plus Artemis-capable ammo, runAttackPhase passes those flags plus indirect-fire state into missileClusterModifier, and calculateClusterModifiers applies MegaMek-parity IV/prototype IV/V bonuses without stacking while suppressing them for indirect fire',
    MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  ),
  'artemis-fcs-critical-slot-hydration': integrated(
    'artemis-fcs-critical-slot-hydration',
    'UnitHydration maps represented Artemis IV, prototype Artemis IV, and Artemis V FCS critical slots plus matching Artemis-capable ammo into explicit runner weapon guidance flags, using explicit linkedEquipment FCS allocation when present and same-location fallback only when no explicit FCS link metadata exists and either one compatible launcher is present or the same-kind FCS count exactly matches the compatible launcher count',
    MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  ),
  'artemis-explicit-fcs-link-lifecycle': integrated(
    'artemis-explicit-fcs-link-lifecycle',
    'Represented explicit Artemis FCS link lifecycle: UnitHydration consumes authored linkedEquipment metadata before any unambiguous same-location fallback, hydrateCriticalSlotManifestFromFullUnit carries the linked launcher id/name into the Artemis FCS critical slot, CriticalHitResolved replay records the linked launcher id, and toAIUnitState strips guidance only from that explicitly linked launcher after FCS critical destruction',
    MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  ),
  'artemis-fcs-critical-lifecycle': integrated(
    'artemis-fcs-critical-lifecycle',
    'CriticalHitResolved replay records represented destroyed Artemis IV, prototype Artemis IV, and Artemis V FCS kind plus location and explicit linked launcher id when present; toAIUnitState removes linked weapon guidance flags before runner missile cluster resolution and falls back to unambiguous same-location weapon guidance flags only when no explicit link metadata exists',
    MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  ),
  'artemis-cews-ecm-probe-lifecycle': integrated(
    'artemis-cews-ecm-probe-lifecycle',
    'Source-backed Watchdog and Nova CEWS are represented only as combined ECM-suite plus active-probe equipment: UnitHydration maps their ECM and BAP ids into runner electronic-warfare state, active-probe ECM countering can preserve Artemis cluster guidance, and CriticalHitResolved replay can remove the same-unit CEWS ECM/probe capability without promoting Nova CEWS C3-style network behavior into Artemis FCS support',
    [...MEGAMEK_ECM_SUITE_SOURCE_REFS, ...MEGAMEK_ACTIVE_PROBE_SOURCE_REFS],
  ),
  'nova-cews-c3-network-lifecycle': integrated(
    'nova-cews-c3-network-lifecycle',
    'Source-backed Nova CEWS C3-style range sharing is represented as a bounded C3-family peer network: UnitHydration maps Nova CEWS equipment into mounted nova network roles, conservative same-side formation builds only unambiguous 2-3 unit Nova networks, oversized/singleton/mixed-family cases fail closed, and calculateToHitWithC3 consumes the resulting network through the existing explicit C3 range-sharing path',
    MEGAMEK_NOVA_CEWS_NETWORK_SOURCE_REFS,
  ),
  'artemis-link-network-lifecycle': integrated(
    'artemis-link-network-lifecycle',
    'Split-accounted Artemis lifecycle row: represented rows cover unambiguous single-launcher and exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration, explicit linkedEquipment FCS allocation when present, explicit linked FCS critical damage guidance removal, unambiguous same-location Artemis FCS critical damage guidance removal fallback when no explicit link exists, Artemis IV/prototype IV/V cluster-table modifiers, indirect-fire suppression, target/flight-path ECM suppression, ECM mode consumption for Artemis suppression, source-backed active-probe ECM countering from BAP/CEWS equipment state, CEWS as ECM/probe equipment, ECM-suite and active-probe hydration, ECM-suite and active-probe critical replay lifecycle, bounded Nova CEWS C3-style range sharing, active attacker-stealth suppression from runner electronic-warfare state, ECM-linked stealth damage lifecycle suppression removal, compact official IS/Clan launcher id resolution through source-backed name mappings, and whole-catalog non-torpedo Artemis FCS allocation audit coverage',
    [
      ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
      ...MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
      ...MEGAMEK_ECM_SUITE_SOURCE_REFS,
      ...MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
      ...MEGAMEK_NOVA_CEWS_NETWORK_SOURCE_REFS,
      ...MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
    ],
  ),
  'artemis-ambiguous-fcs-allocation-authoring': integrated(
    'artemis-ambiguous-fcs-allocation-authoring',
    'Official BattleMech Artemis FCS allocation authoring is covered by source-backed compact weapon name-mapping aliases plus whole-catalog non-torpedo audit coverage: represented hydration consumes explicit linkedEquipment metadata first, permits same-location fallback only for unambiguous single-launcher or exact same-kind FCS-to-launcher cardinality with Artemis-capable ammo, and keeps synthetic mixed-kind or mismatched-count cases fail-closed without arbitrary launcher fallback',
    MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  ),
  'artemis-active-probe-mode-authoring': integrated(
    'artemis-active-probe-mode-authoring',
    'Source-backed Artemis active-probe authoring is represented by BAP/CEWS equipment hydration and operational lifecycle rather than a separate probe mode surface: UnitHydration maps active-probe and CEWS equipment ids into runner active probes, createInitialState seeds operational active probes, CriticalHitResolved replay can disable represented probe equipment, and runner missile cluster resolution consumes operational probes to counter target ECM before Artemis IV/prototype IV/V suppression while ECM-suite mode authoring stays covered by artemis-ew-mode-authoring',
    [
      ...MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
      ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
    ],
  ),
  'artemis-ew-mode-authoring': integrated(
    'artemis-ew-mode-authoring',
    'Source-backed UnitHydration imports ECM suite currentMode/mode/activeMode/modeName authoring as ecm/eccm/off runner state, createInitialState preserves the hydrated ECM mode, and runner Artemis cluster resolution suppresses Artemis IV/prototype IV/V guidance only when the authored mode is ECM while ECCM/off modes do not provide a suppression bubble',
    [...MEGAMEK_ECM_SUITE_SOURCE_REFS, ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS],
  ),
  'artemis-stealth-mode-damage-lifecycle': integrated(
    'artemis-stealth-mode-damage-lifecycle',
    'Source-backed BattleMech stealth lifecycle for Artemis guidance is represented: UnitHydration hydrates stealth armor and ECM suite mode authoring, createInitialState preserves operational own ECM state, runAttackPhase suppresses Artemis IV/prototype IV/V bonuses only while attacker stealth has active own ECM, and represented ECM equipment critical replay disables that own ECM state so later Artemis guidance is no longer stealth-suppressed',
    MEKSTATION_ARTEMIS_STEALTH_LIFECYCLE_SOURCE_REFS,
  ),
  'artemis-ecm-suppression': integrated(
    'artemis-ecm-suppression',
    'Source-backed calculateClusterModifiers accepts ecmProtected and zeroes Artemis IV/prototype IV/V bonuses, and runAttackPhase derives target ECM coverage plus active-probe countering from runner electronic-warfare state before missile cluster resolution',
    MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  ),
  'artemis-ecm-mode-lifecycle': integrated(
    'artemis-ecm-mode-lifecycle',
    'Source-backed runner electronic-warfare state consumes represented ECM mode during Artemis suppression: target ECM in ecm mode suppresses Artemis IV/prototype IV/V cluster guidance, while the same operational suite in eccm or off mode does not provide an ECM bubble for missile cluster resolution',
    [...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS, ...MEGAMEK_ECM_SUITE_SOURCE_REFS],
  ),
  'artemis-ecm-suite-hydration': integrated(
    'artemis-ecm-suite-hydration',
    'Source-backed UnitHydration maps standard Guardian, Angel, Clan, Watchdog CEWS, and Nova CEWS ECM ids from hydrated BattleMech equipment and critical slots, and createInitialState seeds those suites into IGameState.electronicWarfare',
    MEGAMEK_ECM_SUITE_SOURCE_REFS,
  ),
  'active-probe-counter-hydration': integrated(
    'active-probe-counter-hydration',
    'Source-backed UnitHydration maps Beagle, Bloodhound, Clan, light, Watchdog CEWS, and Nova CEWS active-probe equipment ids; createInitialState seeds active probes for ECM countering before Artemis cluster suppression and carries represented Eagle Eyes range-bonus state when hydrated pilot ability ids include eagle_eyes',
    MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  ),
  'active-probe-critical-lifecycle': integrated(
    'active-probe-critical-lifecycle',
    'CriticalHitResolved replay marks represented same-unit active probes non-operational when an active-probe or CEWS equipment critical is destroyed, preserving other same-unit probe types and other-unit probes',
    MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  ),
  'artemis-stealth-suppression': integrated(
    'artemis-stealth-suppression',
    'Source-backed createHydratedUnitState preserves BattleMech stealth armor, runAttackPhase detects active attacker stealth from the unit own operational ECM suite, and calculateClusterModifiers suppresses Artemis IV/prototype IV/V cluster bonuses while active',
    [
      ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
      ...MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
