import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_PHYSICAL_SOURCE_VERSION,
  megamekPhysicalSourceRef,
} from './CombatRuleSupport.sourceRefs';

const MEGAMEK_TSM_PHYSICAL_DAMAGE_SOURCE_REFS = [
  megamekPhysicalSourceRef(
    'MegaMek KickAttackAction.getDamageFor doubles kick damage with active TSM before talon, melee-specialist, underwater, and infantry adjustments.',
    'common/actions/KickAttackAction.java',
    'L123-L138',
  ),
  megamekPhysicalSourceRef(
    'MegaMek PunchAttackAction.getDamageFor doubles punch damage with active TSM before melee-specialist, underwater, and infantry adjustments.',
    'common/actions/PunchAttackAction.java',
    'L452-L460',
  ),
  megamekPhysicalSourceRef(
    'MegaMek ClubAttackAction.getDamageFor doubles active-TSM club damage while explicitly excluding saws, pile drivers, shields, wrecking balls, flails, active vibroblades, and other fixed-damage tools.',
    'common/actions/ClubAttackAction.java',
    'L187-L202',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_UNDERWATER_PHYSICAL_DAMAGE_SOURCE_REFS = [
  megamekPhysicalSourceRef(
    'MegaMek KickAttackAction.getDamageFor halves wet-location kick damage and rounds up.',
    'common/actions/KickAttackAction.java',
    'L135-L138',
  ),
  megamekPhysicalSourceRef(
    'MegaMek PunchAttackAction.getDamageFor halves wet-location punch damage and rounds up.',
    'common/actions/PunchAttackAction.java',
    'L457-L460',
  ),
  megamekPhysicalSourceRef(
    'MegaMek ClubAttackAction.getDamageFor halves wet-location club damage after resolving the mounted club location.',
    'common/actions/ClubAttackAction.java',
    'L203-L211',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT = {
  tsm: integrated(
    'tsm',
    'UnitHydration, game/session physical contexts, and runPhysicalAttackPhase thread hasTSM into resolvePhysicalAttack so active TSM doubles physical damage at heat 9+',
    MEGAMEK_TSM_PHYSICAL_DAMAGE_SOURCE_REFS,
  ),
  claws: integrated(
    'claws',
    'calculatePunchDamage, calculatePunchToHit, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume claw arm state for source-backed punch damage/to-hit modifiers; PLAYTEST_3 removes only the claw punch to-hit penalty while preserving claw punch damage; critical-event replay removes claw state when the mount is destroyed, missing, or breached, and destroyed arm state clears the represented modifier',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L390-L405`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-equipment-lifecycle': outOfScope(
    'claw-equipment-lifecycle',
    'Represented runtime claw lifecycle paths are covered: core claw punch damage, punch to-hit, PLAYTEST_3 to-hit relief, destroyed/missing/breached CriticalHitResolved replay cleanup, physical-phase destroyed Claw critical production, explicit missing/breached physical critical-manifest cleanup, destroyed-location replay, UnitHydration, and runner/session consumption are integrated under the claws row and claw split rows',
    'The remaining claw-only residual is outside the BattleMech combat runtime validation matrix: source-construction/editor authoring of automatic claw mounted-equipment lifecycle events when no represented CriticalHitResolved payload, physical critical-manifest entry, or destroyed-location event exists, plus claw club-with-hand interactions; this row must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-physical-critical-production': integrated(
    'claw-physical-critical-production',
    'runPhysicalAttackPhase receives the runner critical-manifest side table, physicalAttackDamageApplication threads physical damage through resolveDamage criticalContext, emits physical-phase CriticalHit/CriticalHitResolved/ComponentDestroyed events for destroyed Claw equipment slots, persists the updated manifest, and applies physical equipment lifecycle cleanup to remove the hit arm claw modifier',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-represented-equipment-cleanup': integrated(
    'claw-represented-equipment-cleanup',
    'applyDamagedPhysicalEquipmentCritical, applyPhysicalEquipmentCriticalEvents, reducer event replay, destroyed-location replay, and runner/unit-state consumers clear represented left/right arm claw modifier state when CriticalHitResolved marks Claws destroyed, missing, or breached, or when the arm location is destroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-source-mount-missing-breached-cleanup': integrated(
    'claw-source-mount-missing-breached-cleanup',
    'physical critical manifest entries that explicitly mark Claw equipment missing or breached are skipped by critical-slot selection, emitted as PhysicalAttack CriticalHitResolved lifecycle events when the represented claw modifier is still active, and replayed through applyPhysicalEquipmentCriticalEvents without producing ComponentDestroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
    ],
  ),
  talons: integrated(
    'talons',
    'calculateKickDamage, calculateDFADamageToTarget, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume biped leg plus quad/non-biped arm-location talon state for source-backed +50% kick/DFA damage; critical-event replay removes talon state when the mount is destroyed, missing, or breached, and destroyed location state clears the represented modifier',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/KickAttackAction.java#L95-L122',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.getDamageFor and hasTalons apply 1.5 DFA damage when a qualifying talon leg has a working foot actuator',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L95-L104',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'talon-equipment-lifecycle': outOfScope(
    'talon-equipment-lifecycle',
    'Represented runtime talon lifecycle paths are covered: core talon kick/DFA damage, biped and quad/non-biped location mapping, destroyed/missing/breached CriticalHitResolved replay cleanup, physical-phase destroyed Talons critical production, explicit missing/breached physical critical-manifest cleanup, destroyed-location replay, UnitHydration, and runner/session consumption are integrated under the talons row and talon split rows',
    'The remaining talon-only residual is outside the BattleMech combat runtime validation matrix: source-construction/editor authoring of automatic talon mounted-equipment lifecycle events when no represented CriticalHitResolved payload, physical critical-manifest entry, or destroyed-location event exists; this row must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/KickAttackAction.java#L95-L122',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'talon-physical-critical-production': integrated(
    'talon-physical-critical-production',
    'runPhysicalAttackPhase receives the runner critical-manifest side table, physicalAttackDamageApplication threads physical damage through resolveDamage criticalContext, emits physical-phase CriticalHit/CriticalHitResolved/ComponentDestroyed events for destroyed Talons equipment slots, persists the updated manifest, and applies physical equipment lifecycle cleanup to remove the hit leg or quad/non-biped arm talon modifier',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'talon-represented-equipment-cleanup': integrated(
    'talon-represented-equipment-cleanup',
    'applyDamagedPhysicalEquipmentCritical, applyPhysicalEquipmentCriticalEvents, reducer event replay, destroyed-location replay, and runner/unit-state consumers clear represented biped leg and quad/non-biped arm-location talon modifier state when CriticalHitResolved marks Talons destroyed, missing, or breached, or when the represented leg/arm location is destroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'talon-source-mount-missing-breached-cleanup': integrated(
    'talon-source-mount-missing-breached-cleanup',
    'physical critical manifest entries that explicitly mark Talons equipment missing or breached are skipped by critical-slot selection, emitted as PhysicalAttack CriticalHitResolved lifecycle events when the represented talon modifier is still active, and replayed through applyPhysicalEquipmentCriticalEvents without producing ComponentDestroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
    ],
  ),
  underwater: integrated(
    'underwater',
    'runPhysicalAttackPhase and session physical contexts derive isUnderwater from water-tagged hexes before calculatePhysicalDamage/applyUnderwaterModifier halves physical damage',
    MEGAMEK_UNDERWATER_PHYSICAL_DAMAGE_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
