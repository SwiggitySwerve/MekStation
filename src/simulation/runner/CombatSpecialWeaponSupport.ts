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
  MEGAMEK_ECM_SUITE_SOURCE_REFS,
  MEGAMEK_INARC_ECM_C3_SOURCE_REFS,
  MEGAMEK_INARC_ECM_SOURCE_REFS,
  MEGAMEK_INARC_HAYWIRE_SOURCE_REFS,
  MEGAMEK_INARC_HOMING_SOURCE_REFS,
  MEGAMEK_INARC_NEMESIS_SOURCE_REFS,
  MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_NARC_CLUSTER_SOURCE_REFS,
  MEGAMEK_NARC_MARKER_SOURCE_REFS,
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
  'inarc-pod-variants': helperOnly(
    'inarc-pod-variants',
    'Source-backed iNarc pod variants are cataloged as separate ECM, Haywire, Nemesis, and Homing marker shapes; selected ammo can attach each runner pod type, Homing has runner marker and missile guidance coverage, Haywire has attacker to-hit coverage, ECM suppresses attacker flight-path Artemis guidance and disrupts C3 state, and Nemesis redirects confusable missiles',
    'Remaining iNarc ECM sensor effects, ambiguous/player-authored C3 network assignment, and targetable iNARC pod brush-off removal are not represented in runner combat resolution',
    MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
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
  'ams-mounted-arc-enforcement': integrated(
    'ams-mounted-arc-enforcement',
    'resolveAMSInterception and resolveSingleMissileAMSInterception filter target-mounted AMS by incoming attack arc when mountingArc state is available',
    MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ),
  'ams-mounted-arc-hydration': integrated(
    'ams-mounted-arc-hydration',
    'UnitHydration maps canonical mounted equipment isRearMounted metadata into explicit Front/Rear mountingArc state for runner and AI combat snapshots',
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
  'ams-interception-events': integrated(
    'ams-interception-events',
    'runAttackPhase emits AMSInterception payloads with incoming, intercepted, and remaining projectile counts before damage resolution',
    [
      ...MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
      ...MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS,
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
    'Source-backed UnitHydration approximates Artemis IV/prototype IV/V flags from same-location FCS plus Artemis-capable ammo, runAttackPhase passes those flags plus indirect-fire state into missileClusterModifier, and calculateClusterModifiers applies MegaMek-parity IV/prototype IV/V bonuses without stacking while suppressing them for indirect fire',
    MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  ),
  'artemis-ecm-suppression': integrated(
    'artemis-ecm-suppression',
    'Source-backed calculateClusterModifiers accepts ecmProtected and zeroes Artemis IV/prototype IV/V bonuses, and runAttackPhase derives target ECM coverage plus active-probe countering from runner electronic-warfare state before missile cluster resolution',
    MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  ),
  'artemis-ecm-suite-hydration': integrated(
    'artemis-ecm-suite-hydration',
    'Source-backed UnitHydration maps standard Guardian, Angel, Clan, Watchdog CEWS, and Nova CEWS ECM ids from hydrated BattleMech equipment and critical slots, and createInitialState seeds those suites into IGameState.electronicWarfare',
    MEGAMEK_ECM_SUITE_SOURCE_REFS,
  ),
  'active-probe-counter-hydration': integrated(
    'active-probe-counter-hydration',
    'Source-backed UnitHydration maps Beagle, Bloodhound, Clan, light, Watchdog CEWS, and Nova CEWS active-probe equipment ids; createInitialState seeds active probes for ECM countering before Artemis cluster suppression',
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
