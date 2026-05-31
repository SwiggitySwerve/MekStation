import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

export const MEKSTATION_PHYSICAL_ACTION_HELPER_REFS = {
  'break-grapple': [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canBreakGrapple exposes source-backed optional-rule, airborne, common locked-grapple, chain-whip, Mek/ProtoMek, and grapple-target state gates as helper-only coverage without adding a runtime PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/breakGrappleEligibility.ts#L88-L263',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canBreakGrapple gates, original-attacker automatic success, actuator/AES modifiers, and grapple weight-class branches.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1867-L2030',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  grapple: [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canGrapple exposes source-backed optional-rule, airborne, common locked-grapple, friendly-fire, biped-Mek/ProtoMek target, arm/shoulder, range, elevation, front-arc, prone, weapon-fire, and already-grappled gates as helper-only coverage without adding a runtime PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/grappleEligibility.ts#L122-L352',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canGrapple gates, counter-grapple relaxations, actuator/AES/TSM modifiers, and grapple weight-class branches.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L2033-L2262',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  'jump-jet-attack': [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canJumpJetAttack exposes source-backed optional-rule, LAM mode, selected-leg, Mek-only, leg, jump-jet, movement, weapon-fire, range, elevation, and facing gates consumed by the runtime Jump Jet Attack PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/jumpJetAttackEligibility.ts#L102-L264',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canJumpJetAttack gates, selected-leg jump jet damage, wet-location zero damage, automatic adjacent-building success, and source-specific to-hit modifiers.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L2266-L2481',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  'brush-off': [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canBrushOff exposes source-backed brush-off target, arm, posture, actuator, quirk, and selected-arm weapon-fire gates as helper-only coverage without adding a runtime PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/brushOffEligibility.ts#L95-L252',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canBrushOff gates, dedicated brush-off modifiers, torso-mounted cockpit sensor branches, and punch-equivalent damage.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1714-L1864',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  thrash: [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canThrash exposes source-backed thrash attack legality gates, automatic-success classification, and weight-based damage consumed by the runtime Thrash PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/thrashEligibility.ts#L50-L135',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canThrash gates, terrain exclusions, automatic success, runtime thrash resolution, and weight-based damage.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1589-L1710',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  trip: [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canTrip exposes source-backed trip attack legality gates consumed by the runtime optional TacOps Trip PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/tripEligibility.ts#L47-L136',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canTrip gates, runtime trip resolution, zero damage, and the Trip base to-hit adjustment.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1494-L1585',
      sourceVersion: 'MekStation working-tree',
    },
  ],
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;
