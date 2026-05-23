import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

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

const MEGAMEK_DESIGNATOR_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_NARC_MARKER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcHandler.java#L243-L253',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INARC_VARIANT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcHandler.java#L254-L290',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INARC_POD_TYPE_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/INarcPod.java#L53-L59',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INARC_HOMING_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'Entity.isINarcedBy returns true only for Homing iNarc pods from the firing team.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7325-L7334',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit marks NARC-capable LRM/SRM/MML attacks as iNarc-guided when the target carries a Homing iNarc pod and target ECM does not suppress it.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L348-L360',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit applies the -1 iNarc Homing to-hit modifier to iNarc-guided missile attacks.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L952-L955',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies the NARC cluster modifier to direct NARC-capable missiles when the target is NARCed or iNARC Homing-marked and target ECM does not suppress it.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L232-L260',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INARC_HAYWIRE_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'Entity.isINarcedWith checks attached iNarc pod type from any team.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7336-L7344',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit derives isHaywireINarced from the attacker entity before compiling attacker to-hit modifiers.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L209-L210',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeAttackerToHitMods applies the +1 iNarc Haywire attacker to-hit modifier.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L196-L199',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TAG_DESIGNATION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/TAGHandler.java#L75-L87',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TAG_CLEAR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWPhasePreparationManager.java#L73-L78',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation: 'Game.resetTagInfo clears the tagInfoForTurn collection.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/game/Game.java#L3162-L3167',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_ECM_SUITE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Guardian, Clan, and Angel ECM suites with ECM flags and ECM modes.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5630-L5789',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5867-L5945',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ACTIVE_PROBE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Beagle, Bloodhound, and Clan active probes with BAP flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5404-L5572',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation: 'MiscType defines Light Active Probe with a BAP flag.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5600-L5627',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  MEGAMEK_ECM_SUITE_SOURCE_REFS[1],
  {
    kind: 'megamek-source',
    citation:
      'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L6011-L6056',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L124-L200',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/lrm/LRMHandler.java#L139-L217',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L3442-L3457',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT = {
  'uac-rate-of-fire': integrated(
    'uac-rate-of-fire',
    'UnitHydration.buildCatalogFiringModes exposes single/double Ultra AC modes and runAttackPhase expands selected modes into shots',
  ),
  'uac-jam-on-natural-two': integrated(
    'uac-jam-on-natural-two',
    'shouldJamOnNaturalTwo plus markWeaponJammed handles Ultra AC jam state on natural 2',
  ),
  'rac-rate-of-fire': integrated(
    'rac-rate-of-fire',
    'UnitHydration.buildCatalogFiringModes exposes Rotary AC rate-of-fire modes and AIWeaponModeSelector can select them',
  ),
  'rac-jam-on-natural-two': integrated(
    'rac-jam-on-natural-two',
    'shouldJamOnNaturalTwo plus markWeaponJammed handles Rotary AC jam state on natural 2',
  ),
  'lbx-slug-cluster-modes': integrated(
    'lbx-slug-cluster-modes',
    'UnitHydration.buildCatalogFiringModes exposes LB-X slug/cluster modes and resolveClusterModeHit resolves cluster projectiles',
  ),
  'lbx-cluster-to-hit': integrated(
    'lbx-cluster-to-hit',
    'selectedModeToHitModifier applies the LB-X cluster to-hit adjustment during AttackDeclared math',
  ),
  'streak-lock-no-spend-on-miss': integrated(
    'streak-lock-no-spend-on-miss',
    'shouldSpendAmmoAndHeatOnMiss prevents Streak SRM ammo and heat spending when lock fails',
  ),
  'streak-rack-projectiles': integrated(
    'streak-rack-projectiles',
    'resolveSpecialProjectileHit derives the Streak rack size as projectile count on successful lock',
  ),
  'mml-variable-damage': integrated(
    'mml-variable-damage',
    'resolveCatalogDamage parses variable MML descriptors such as 1-2/missile into nonzero rack damage',
  ),
  'mml-srm-lrm-mode-damage': integrated(
    'mml-srm-lrm-mode-damage',
    'UnitHydration.buildCatalogFiringModes exposes MML SRM/LRM modes and runner selected modes change resolved damage',
  ),
  'mml-srm-lrm-ammo-compatibility': integrated(
    'mml-srm-lrm-ammo-compatibility',
    'MML firing-mode metadata maps selected SRM/LRM modes to distinct srm-N/lrm-N ammo-bin families for runner ammo checks and consumption',
  ),
  'narc-marker-attachment': integrated(
    'narc-marker-attachment',
    'Source-backed standard NARC marker behavior: applyDesignatorMarkerHit attaches attacker-team NARC markers to hit targets without applying damage',
    MEGAMEK_NARC_MARKER_SOURCE_REFS,
  ),
  'narc-cluster-modifier': integrated(
    'narc-cluster-modifier',
    'missileClusterModifier consumes targetNarcedBy and resolveSpecialProjectileHit applies the NARC cluster bonus to NARC-compatible missiles',
  ),
  'inarc-pod-variants': helperOnly(
    'inarc-pod-variants',
    'Source-backed iNarc pod variants are cataloged as separate ECM, Haywire, Nemesis, and Homing marker shapes; selected ammo can attach each runner pod type, Homing has runner marker and missile guidance coverage, and Haywire has attacker to-hit coverage',
    'iNarc ECM and Nemesis pod effects are not represented in runner missile resolution',
    MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
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
  ),
  'ams-streak-cluster-parity': integrated(
    'ams-streak-cluster-parity',
    'resolveSpecialProjectileHit treats Streak hits as cluster-roll 11 when target AMS engages, then applies the AMS -4 cluster-table modifier',
  ),
  'ams-single-missile-parity': integrated(
    'ams-single-missile-parity',
    'resolveSingleMissileAMSInterception mirrors MegaMek NARC/Thunderbolt handlers by rolling 1d6 and destroying the single incoming pod or missile on 1-3',
  ),
  'ams-ammo-consumption': integrated(
    'ams-ammo-consumption',
    'runAttackPhase passes defender ammo state into missile resolution and consumes the target-mounted AMS ammo bin during cluster or single-missile interception',
  ),
  'ams-interception-events': integrated(
    'ams-interception-events',
    'runAttackPhase emits AMSInterception payloads with incoming, intercepted, and remaining projectile counts before damage resolution',
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
  'tag-semi-guided-cluster-bonus': integrated(
    'tag-semi-guided-cluster-bonus',
    'isSemiGuidedAmmoSelectedForWeapon plus targetTagDesignated applies semi-guided LRM cluster bonuses',
  ),
  'tag-intent-wire-state-replay': integrated(
    'tag-intent-wire-state-replay',
    'Generic Attack game and wire intents carry TAG weapon ids through declareAttack, runner TAG hits emit DesignatorMarkerApplied, the replay reducer reapplies tagDesignated target state, and TurnStarted clears transient TAG state',
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
