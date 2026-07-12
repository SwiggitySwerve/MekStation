import {
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  INARC_POD_BRUSH_OFF_REMOVAL_SOURCE_REFS,
  INARC_POD_BRUSH_OFF_TARGET_SELECTION_SOURCE_REFS,
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
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatSpecialWeaponSourceRefs';

export const SPECIAL_WEAPON_DESIGNATOR_COMBAT_SUPPORT = {
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
} satisfies Record<string, ICombatFeatureSupportEntry>;
