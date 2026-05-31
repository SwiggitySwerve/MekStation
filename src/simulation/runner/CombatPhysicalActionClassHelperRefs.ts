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
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1765-L1930',
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
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1609-L1761',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  thrash: [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canThrash exposes source-backed thrash attack legality gates, automatic-success classification, and weight-based damage as helper-only coverage without adding a runtime PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/thrashEligibility.ts#L50-L135',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canThrash gates, terrain exclusions, automatic success, and weight-based damage.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1538-L1605',
      sourceVersion: 'MekStation working-tree',
    },
  ],
  trip: [
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation canTrip exposes source-backed trip attack legality gates as helper-only coverage without adding a runtime PhysicalAttackType.',
      url: 'src/utils/gameplay/physicalAttacks/tripEligibility.ts#L47-L136',
      sourceVersion: 'MekStation working-tree',
    },
    {
      kind: 'mekstation-deviation',
      citation:
        'MekStation physical attack tests cover source-backed canTrip gates and the Trip base to-hit adjustment.',
      url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L1474-L1534',
      sourceVersion: 'MekStation working-tree',
    },
  ],
} satisfies Record<string, readonly ICombatFeatureSourceReference[]>;
