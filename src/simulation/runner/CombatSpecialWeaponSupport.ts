import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS,
  MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
  MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS,
  MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  MEGAMEK_ECM_SUITE_SOURCE_REFS,
  INARC_POD_BRUSH_OFF_REMOVAL_SOURCE_REFS,
  INARC_POD_BRUSH_OFF_TARGET_SELECTION_SOURCE_REFS,
  MEKSTATION_ARTEMIS_STEALTH_LIFECYCLE_SOURCE_REFS,
  MEGAMEK_INARC_ECM_C3_SOURCE_REFS,
  MEGAMEK_INARC_ECM_SENSOR_EFFECT_SOURCE_REFS,
  MEGAMEK_INARC_ECM_SOURCE_REFS,
  MEGAMEK_INARC_EXPLOSIVE_SOURCE_REFS,
  MEGAMEK_INARC_HAYWIRE_SOURCE_REFS,
  MEGAMEK_INARC_HOMING_SOURCE_REFS,
  MEGAMEK_INARC_NEMESIS_SOURCE_REFS,
  MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_NARC_CLUSTER_SOURCE_REFS,
  MEGAMEK_NARC_MARKER_SOURCE_REFS,
  MEGAMEK_NOVA_CEWS_NETWORK_SOURCE_REFS,
  MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_TAG_CLEAR_SOURCE_REFS,
  MEGAMEK_TAG_DESIGNATION_SOURCE_REFS,
  MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  MEGAMEK_TAG_SEMI_GUIDED_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatSpecialWeaponSourceRefs';

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

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

export const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS =
  [] as const;

export const SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT = {
  'uac-rate-of-fire': integrated(
    'uac-rate-of-fire',
    'UnitHydration.buildCatalogFiringModes exposes single/double Ultra AC modes and runAttackPhase expands selected modes into shots',
    MEGAMEK_UAC_SOURCE_REFS,
  ),
  'uac-jam-on-natural-two': integrated(
    'uac-jam-on-natural-two',
    'shouldJamOnNaturalTwo plus markWeaponJammed handles Ultra AC jam state on natural 2',
    MEGAMEK_UAC_SOURCE_REFS,
  ),
  'rac-rate-of-fire': integrated(
    'rac-rate-of-fire',
    'UnitHydration.buildCatalogFiringModes exposes Rotary AC rate-of-fire modes and AIWeaponModeSelector can select them',
    MEGAMEK_RAC_SOURCE_REFS,
  ),
  'rac-jam-on-natural-two': integrated(
    'rac-jam-on-natural-two',
    'shouldJamOnNaturalTwo plus markWeaponJammed handles Rotary AC jam state on natural 2',
    MEGAMEK_RAC_SOURCE_REFS,
  ),
  'lbx-slug-cluster-modes': integrated(
    'lbx-slug-cluster-modes',
    'UnitHydration.buildCatalogFiringModes exposes LB-X slug/cluster modes and resolveClusterModeHit resolves cluster projectiles',
    MEGAMEK_LBX_SOURCE_REFS,
  ),
  'lbx-cluster-to-hit': integrated(
    'lbx-cluster-to-hit',
    'selectedModeToHitModifier applies the LB-X cluster to-hit adjustment during AttackDeclared math',
    MEGAMEK_LBX_SOURCE_REFS,
  ),
  'streak-lock-no-spend-on-miss': integrated(
    'streak-lock-no-spend-on-miss',
    'shouldSpendAmmoAndHeatOnMiss prevents damage-capable Streak SRM ammo and heat spending when lock fails',
    MEGAMEK_STREAK_SRM_SOURCE_REFS,
  ),
  'streak-rack-projectiles': integrated(
    'streak-rack-projectiles',
    'resolveSpecialProjectileHit derives damage-capable Streak SRM rack size as projectile count on successful lock',
    MEGAMEK_STREAK_SRM_SOURCE_REFS,
  ),
  'mml-variable-damage': integrated(
    'mml-variable-damage',
    'resolveCatalogDamage parses variable MML descriptors such as 1-2/missile into nonzero rack damage',
    MEGAMEK_MML_SOURCE_REFS,
  ),
  'mml-srm-lrm-mode-damage': integrated(
    'mml-srm-lrm-mode-damage',
    'UnitHydration.buildCatalogFiringModes exposes MML SRM/LRM modes and runner selected modes change resolved damage',
    MEGAMEK_MML_SOURCE_REFS,
  ),
  'mml-srm-lrm-ammo-compatibility': integrated(
    'mml-srm-lrm-ammo-compatibility',
    'MML firing-mode metadata maps selected SRM/LRM modes to distinct srm-N/lrm-N ammo-bin families for runner ammo checks and consumption',
    MEGAMEK_MML_SOURCE_REFS,
  ),
  'narc-marker-attachment': integrated(
    'narc-marker-attachment',
    'Source-backed standard NARC marker behavior: applyDesignatorMarkerHit attaches attacker-team NARC markers to hit targets without applying damage',
    MEGAMEK_NARC_MARKER_SOURCE_REFS,
  ),
  'narc-cluster-modifier': integrated(
    'narc-cluster-modifier',
    'missileClusterModifier consumes targetNarcedBy and resolveSpecialProjectileHit applies the NARC cluster bonus to NARC-compatible missiles',
    MEGAMEK_NARC_CLUSTER_SOURCE_REFS,
  ),
  'inarc-pod-variants': integrated(
    'inarc-pod-variants',
    'Runner iNarc pod variant support is split into source-backed executable rows: selected-ammo attachment for Homing, ECM, Haywire, and Nemesis; Homing marker/to-hit/cluster guidance; Haywire attacker to-hit; ECM attacker flight-path Artemis suppression, explicit C3 disruption, and tactical sensor-contact bracket penalties; Nemesis redirect; explosive selected-ammo impact damage; markerless unknown-ammo guard behavior; and carrier-level Brush-Off removal.',
    MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  ),
  'inarc-pod-object-lifecycle': integrated(
    'inarc-pod-object-lifecycle',
    'MekStation represents MegaMek-style attached iNarc pod object lifecycle through carrier iNarcPods state: selected-ammo hits attach typed Homing/ECM/Haywire/Nemesis pods with location, turn reset preserves that state, DesignatorMarkerApplied replay rehydrates typed pods, same-team/same-type pod identity is targetable and deduped for carrier-scoped Brush-Off rows, the physical panel/store author selected pod identity, declared/resolved events carry selectedINarcPod, and runner/session/replay Brush-Off removal removes the selected same-team/same-type attached pod while preserving nonmatching pods; producer-side C3 authoring remains separated under inarc-producer-c3-authoring',
    MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  ),
  'inarc-pod-target-identity-lifecycle': integrated(
    'inarc-pod-target-identity-lifecycle',
    'iNarcPodTargetKey, iNarcPodDisplayName, and markTargetINarcPod encode MegaMek-style same-team/same-type iNarc pod target identity while preserving hit location on the stored carrier pod state',
    MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  ),
  'inarc-pod-target-option-deduplication': integrated(
    'inarc-pod-target-option-deduplication',
    'uniqueINarcPodTargets and the physical attack panel perform carrier-level target-option dedupe by collapsing same-team/same-type attached iNARC pods into one represented Brush-Off target option, matching MegaMek INarcPod target ids while preserving stored pod location metadata on carrier state',
    MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  ),
  'inarc-pod-brush-off-target-selection': integrated(
    'inarc-pod-brush-off-target-selection',
    'buildINarcPodBrushOffTargetOptions and PhysicalAttackPanel expose carrier-scoped attached iNarc pod rows as independently selectable Brush-Off targets, then commit through the existing carrier target id plus selectedINarcPod declaration path',
    INARC_POD_BRUSH_OFF_TARGET_SELECTION_SOURCE_REFS,
  ),
  'inarc-pod-helper-removal-lifecycle': integrated(
    'inarc-pod-helper-removal-lifecycle',
    'removeEquivalentINarcPod consumes MegaMek-style same-team/same-type iNarc pod target identity, removes exactly one matching attached helper pod object, preserves nonmatching team/type pods, and leaves the original array untouched when no equivalent pod exists',
    MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  ),
  'inarc-pod-turn-reset-lifecycle': integrated(
    'inarc-pod-turn-reset-lifecycle',
    'resetTurnState clears transient TAG and per-turn combat state while preserving attached typed iNarcPods carrier state across turn-boundary cleanup',
    MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  ),
  'inarc-ecm-sensor-effects': integrated(
    'inarc-ecm-sensor-effects',
    'canPlayerSeeUnit and visibleUnitsForPlayer consume explicit sensorCheck plus sensorRangeBrackets state, apply enemy iNarc ECM pods as MegaMek-style active-sensor ECM check modifiers, and drop tactical sensor contacts when the adjusted bracket has no range while represented iNarc ECM flight-path Artemis/prototype Artemis/Artemis V suppression and C3 disruption remain wired through attack resolution',
    MEGAMEK_INARC_ECM_SENSOR_EFFECT_SOURCE_REFS,
  ),
  'inarc-producer-c3-authoring': outOfScope(
    'inarc-producer-c3-authoring',
    'Residual row only: runner attack declaration can consume already-authored explicit C3 range sharing state, conservative unambiguous C3 equipment seeding remains tracked under the to-hit C3 rows at ruleSupport.toHitModifiers.c3-equipment-network-formation, and represented iNarc ECM C3 disruption can deny source-backed C3 range sharing',
    'Producer-side C3 membership, spotter assignment authoring, C3 assignment UI/editor, and ambiguous multi-network partitioning are not special-weapon runtime implementation blockers here; explicit or conservative C3 state consumption alone, equipment seeding, and iNarc ECM disruption alone do not prove producer-side C3 authoring; keep C3 network formation coverage under ruleSupport.toHitModifiers.c3-equipment-network-formation and iNarc ECM/C3 disruption coverage under the executable iNarc ECM rows',
    MEGAMEK_INARC_ECM_C3_SOURCE_REFS,
  ),
  'inarc-pod-brush-off-removal-lifecycle': integrated(
    'inarc-pod-brush-off-removal-lifecycle',
    'Runner, session, and replay physical Brush-Off resolve carrier-level attached iNarc pod removal by carrying optional same-team/same-type selectedINarcPod identity through declared/resolved events and removing the selected matching iNarcPods entry on successful Brush-Off resolution, with legacy first-pod removal preserved when no selector is supplied',
    INARC_POD_BRUSH_OFF_REMOVAL_SOURCE_REFS,
  ),
  'inarc-explosive-ammo-compatibility': integrated(
    'inarc-explosive-ammo-compatibility',
    'Runner iNarc explosive selected ammo is distinguished from marker pod variants, consumes inarc-explosive-pods ammo, resolves source-backed 6-point impact damage through the normal BattleMech damage chain, emits no DesignatorMarkerApplied marker, and preserves unknown selected iNarc ammo as markerless zero-damage guard behavior',
    MEGAMEK_INARC_EXPLOSIVE_SOURCE_REFS,
  ),
  'inarc-nemesis-redirect': integrated(
    'inarc-nemesis-redirect',
    'runAttackPhase redirects source-backed iNARC Nemesis-confusable direct missile attacks to friendly intervening units carrying Nemesis pods before resolving the attack',
    MEGAMEK_INARC_NEMESIS_SOURCE_REFS,
  ),
  'inarc-ecm-attacker-flight-path-suppression': integrated(
    'inarc-ecm-attacker-flight-path-suppression',
    'runAttackPhase consumes attacker iNarc ECM pod state as source-backed flight-path ECM that suppresses Artemis IV/prototype IV/V cluster modifiers without suppressing target-only NARC guidance',
    MEGAMEK_INARC_ECM_SOURCE_REFS,
  ),
  'inarc-ecm-c3-disruption': integrated(
    'inarc-ecm-c3-disruption',
    'resolveC3ECMDisruption consumes attached iNarc ECM pod state as source-backed C3 ECM disruption, and runner explicit C3 attack state denies network benefit through the existing ECM-disrupted path',
    MEGAMEK_INARC_ECM_C3_SOURCE_REFS,
  ),
  'inarc-variant-ammo-attachment': integrated(
    'inarc-variant-ammo-attachment',
    'Runner iNarc hits derive Homing, ECM, Haywire, and Nemesis podType from the selected ammo weapon type before attaching iNarcPods state and emitting DesignatorMarkerApplied',
    MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  ),
  'inarc-pod-event-replay-lifecycle': integrated(
    'inarc-pod-event-replay-lifecycle',
    'DesignatorMarkerApplied replay consumes marker=inarc plus Homing/ECM/Haywire/Nemesis podType payloads, rehydrates typed iNarcPods carrier state with hit location when present, and deduplicates repeated team/pod events without falling back to standard narcedBy state',
    MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  ),
  'inarc-homing-marker-attachment': integrated(
    'inarc-homing-marker-attachment',
    'Runner iNarc Homing hits attach iNarcPods state, emit DesignatorMarkerApplied marker=inarc/podType=homing, and replay that marker without falling back to narcedBy',
    MEGAMEK_INARC_HOMING_SOURCE_REFS,
  ),
  'inarc-homing-cluster-modifier': integrated(
    'inarc-homing-cluster-modifier',
    'resolveSpecialProjectileHit consumes targetINarcedBy as source-backed Homing iNarc guidance for direct NARC-compatible missile cluster modifiers while suppressing the cluster bonus during indirect fire',
    MEGAMEK_INARC_HOMING_SOURCE_REFS,
  ),
  'inarc-homing-to-hit-modifier': integrated(
    'inarc-homing-to-hit-modifier',
    'runAttackPhase consumes target iNarc Homing pod state and applies the source-backed -1 iNarc Homing to-hit modifier to NARC-compatible missiles when target ECM does not suppress it',
    MEGAMEK_INARC_HOMING_SOURCE_REFS,
  ),
  'inarc-haywire-to-hit-modifier': integrated(
    'inarc-haywire-to-hit-modifier',
    'runAttackPhase consumes attacker iNarc Haywire pod state and applies the source-backed +1 attacker to-hit modifier',
    MEGAMEK_INARC_HAYWIRE_SOURCE_REFS,
  ),
  'narc-marker-lifecycle-events': integrated(
    'narc-marker-lifecycle-events',
    'Runner target state preserves standard NARC markers and iNarc Homing pods after beacon hits, emits DesignatorMarkerApplied for marker attachment, and replay reducer reapplies marker state',
    [...MEGAMEK_NARC_MARKER_SOURCE_REFS, ...MEGAMEK_INARC_HOMING_SOURCE_REFS],
  ),
  'ams-projectile-reduction': integrated(
    'ams-projectile-reduction',
    'resolveSpecialProjectileHit passes target-mounted AMS weapons through resolveAMSInterception, which applies the Total Warfare/MegaMek -4 cluster-table modifier',
    MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
  ),
  'ams-automatic-interception-assignment': integrated(
    'ams-automatic-interception-assignment',
    'runAttackPhase automatically passes defender mounted AMS into missile resolution and resolveAMSInterception selects an operational in-arc AMS without requiring manual defender choice',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-mounted-arc-enforcement': integrated(
    'ams-mounted-arc-enforcement',
    'resolveAMSInterception and resolveSingleMissileAMSInterception filter target-mounted AMS by incoming attack arc when mountingArc or multi-arc mountingArcs state is available, unioning multi-arc coverage via weaponMountCoversTargetArc',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-mounted-arc-hydration': integrated(
    'ams-mounted-arc-hydration',
    'UnitHydration maps canonical mounted equipment isRearMounted metadata into explicit Front/Rear mountingArc state and biped arm mount locations into MegaMek Mek.getWeaponArc front+side mountingArcs coverage for runner and AI combat snapshots',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-streak-cluster-parity': integrated(
    'ams-streak-cluster-parity',
    'resolveSpecialProjectileHit treats Streak hits as cluster-roll 11 when target AMS engages, then applies the AMS -4 cluster-table modifier',
    MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
  ),
  'ams-single-missile-parity': integrated(
    'ams-single-missile-parity',
    'resolveSingleMissileAMSInterception mirrors MegaMek NARC/Thunderbolt handlers by rolling 1d6 and destroying the single incoming pod or missile on 1-3',
    MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS,
  ),
  'ams-ammo-consumption': integrated(
    'ams-ammo-consumption',
    'runAttackPhase passes defender ammo state into missile resolution and consumes the target-mounted AMS ammo bin during cluster or single-missile interception',
    MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS,
  ),
  'ams-authored-multi-use-lifecycle': integrated(
    'ams-authored-multi-use-lifecycle',
    'Runner and interactive attack resolution consume already-authored explicit amsMultiUse mount state or PLAYTEST_3 optional-rule state to allow same-phase AMS reuse while preserving ammo consumption, heat generation, and fired-state accounting',
    [
      ...MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
      ...MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS,
    ],
  ),
  'ams-interception-events': integrated(
    'ams-interception-events',
    'runAttackPhase emits AMSInterception payloads with incoming, intercepted, and remaining projectile counts before damage resolution',
    [
      ...MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
      ...MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS,
    ],
  ),
  'ams-runner-selected-defender-choice': integrated(
    'ams-runner-selected-defender-choice',
    'runAttackPhase consumes replayable defender-selected AttackDeclared.selectedAMSWeaponIds, threads the selectedAMSWeaponId into missile AMS interception, honors eligible selected mounts, rejects ineligible explicit selections without automatic fallback or defender ammo/fired-state side effects, emits the selected AMS id in AttackDeclared and AMSInterception evidence, and keeps absent selections on automatic operational in-arc AMS assignment',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-session-selected-defender-choice': integrated(
    'ams-session-selected-defender-choice',
    'applyInteractiveSessionAttack snapshots defender-selected AMS mount metadata onto AttackDeclared.selectedAMSWeaponMounts and resolveAttack consumes only that replayable payload plus currentState to honor selected mounts while rejecting invalid explicit selections without automatic fallback, defender ammo consumption, AMSInterception events, or fired-state side effects',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-manual-defender-choice': integrated(
    'ams-manual-defender-choice',
    'InteractiveSession.applyAttack/applyInteractiveSessionAttack expose defender-selected selectedAMSWeaponIds as the interactive declaration surface, snapshot legal selected defender AMS mounts onto AttackDeclared before commit, reject illegal selected non-missile/non-AMS/out-of-arc/already-fired/no-ammo selections with AttackInvalid before AttackDeclared, and runner/session replay consume selected ids without automatic fallback',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-bay-authoring': outOfScope(
    'ams-bay-authoring',
    'BattleMech official catalog data does not expose an AMS bay equipment entry or amsBay authoring field; MekStation represents standard AMS mounts plus explicit selected defender AMS mount ids, and AMS bay-shaped helper metadata does not make standard AMS reusable',
    'AMS bay authoring belongs outside the current BattleMech blocker matrix until a source-backed BattleMech catalog entry or supported bay/multi-mount authoring model exists; standard AMS arc assignment, selected defender AMS support, and helper-shaped amsBay metadata must not be treated as AMS bay support',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-optional-multi-use-authoring': outOfScope(
    'ams-optional-multi-use-authoring',
    'BattleMech official catalog data does not expose a multi-use AMS variant or amsMultiUse authoring field; MekStation consumes already-authored amsMultiUse mount state and PLAYTEST_3 optional-rule state under ams-authored-multi-use-lifecycle',
    'Optional multi-use AMS catalog/editor/game-option authoring belongs outside the current BattleMech blocker matrix until a source-backed catalog field, editor surface, or rule-option authoring matrix exists; explicit amsMultiUse state and runtime optionalRules consumption must remain covered by ams-authored-multi-use-lifecycle',
    [
      ...MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
      ...MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS,
    ],
  ),
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
  'plasma-cannon-battlemech-target-heat': integrated(
    'plasma-cannon-battlemech-target-heat',
    'Runner plasma-cannon hits against BattleMechs emit zero BattleMech damage, queue source-backed 2d6 external target heat in a Heat Phase pending bucket, adjust heat for reflective or heat-dissipating armor including PLAYTEST_3 behavior, preserve turn-boundary cap reset, and consume source-backed plasma ammo despite MegaMek energy flags',
    MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  ),
  'plasma-cannon-battlemech-heat-phase-pending-bucket': integrated(
    'plasma-cannon-battlemech-heat-phase-pending-bucket',
    'Runner plasma-cannon BattleMech target heat is stored on pendingExternalHeat during Weapon Attack, applies as external HeatGenerated in Heat Phase, clears the pending bucket, and enforces the existing 15-point external heat per-turn cap through externalHeatThisTurn',
    MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
