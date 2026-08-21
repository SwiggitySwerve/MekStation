/**
 * Valid per-variant payload fixtures for the combat physical/PSR/
 * ground-object baseline schema pack (replay-safety PR 8).
 *
 * The physical fixtures exercise the deep optional surface: a kick
 * declaration with limb + hit table, a resolved DFA with per-cluster
 * (damage, location) pairs, displacement chains, and a domino step-out
 * decision. PSR fixtures retain targets, rolls, consumed d6 sequences,
 * and the machine-readable `reasonCode` alongside the display string.
 */

export const VALID_COMBAT_PHYSICAL_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  psr_triggered: {
    unitId: 'opponent-1-marauder-mad-3r',
    reason: 'took 20+ damage this phase',
    additionalModifier: 1,
    triggerSource: 'damage',
    basePilotingSkill: 5,
    reasonCode: '20+_damage',
  },
  psr_resolved: {
    unitId: 'opponent-1-marauder-mad-3r',
    targetNumber: 6,
    roll: 5,
    modifiers: 1,
    passed: false,
    reason: 'took 20+ damage this phase',
    edgeReroll: false,
    rolls: [2, 3],
    reasonCode: '20+_damage',
  },
  unit_fell: {
    unitId: 'opponent-1-marauder-mad-3r',
    fallDamage: 8,
    newFacing: 3,
    pilotDamage: 1,
    rolls: [4, 2, 6],
    location: 'center_torso',
    reason: 'took-20-damage',
    reasonCode: '20+_damage',
  },
  unit_stuck: {
    unitId: 'player-1-atlas-as7-d',
    reason: 'bogged down in swamp',
    reasonCode: 'swamp_bog_down',
  },
  unit_stood: {
    unitId: 'opponent-1-marauder-mad-3r',
    turn: 3,
    roll: 9,
    targetNumber: 7,
    rolls: [5, 4],
  },
  physical_attack_locked: { unitId: 'player-1-atlas-as7-d' },
  physical_attack_declared: {
    attackerId: 'player-1-atlas-as7-d',
    targetId: 'opponent-1-marauder-mad-3r',
    attackType: 'kick',
    toHitNumber: 6,
    limb: 'rightLeg',
    hitTable: 'kick',
    blockerStepOutDecision: {
      blockerUnitId: 'opponent-2-warhammer-whm-6r',
      from: { q: 2, r: 2 },
      response: 'move',
      psrPassed: true,
      context: {
        sideEntered: false,
        blockerJumped: false,
        legalStepOptions: [{ kind: 'forward', to: { q: 3, r: 2 } }],
      },
      path: [
        { q: 2, r: 2 },
        { q: 3, r: 2 },
      ],
    },
  },
  physical_attack_resolved: {
    attackerId: 'player-1-atlas-as7-d',
    targetId: 'opponent-1-marauder-mad-3r',
    attackType: 'dfa',
    roll: 8,
    toHitNumber: 7,
    hit: true,
    damage: 21,
    clusters: [
      { damage: 5, location: 'CT' },
      { damage: 5, location: 'LT' },
      { damage: 5, location: 'RA' },
      { damage: 5, location: 'LL' },
      { damage: 1, location: 'CT' },
    ],
    displacements: [
      {
        unitId: 'opponent-1-marauder-mad-3r',
        from: { q: 4, r: 4 },
        to: { q: 5, r: 4 },
        reason: 'dfa',
      },
      {
        unitId: 'player-1-atlas-as7-d',
        from: { q: 3, r: 4 },
        to: { q: 4, r: 4 },
        reason: 'dfa',
      },
    ],
    rolls: [4, 4, 3, 5, 2, 6, 1, 4, 6, 2, 3, 3],
  },
  ground_object_picked_up: {
    unitId: 'player-1-atlas-as7-d',
    objectId: 'cargo-1',
    object: {
      id: 'cargo-1',
      name: 'Supply Crate',
      tonnage: 2,
      carriedByUnitId: 'player-1-atlas-as7-d',
      carryLocation: 'leftArm',
    },
    from: { q: 1, r: 1 },
    carryLocation: 'leftArm',
    capacityTonnage: 10,
    capacityMarginTonnage: 8,
  },
  ground_object_dropped: {
    unitId: 'player-1-atlas-as7-d',
    objectId: 'cargo-1',
    to: { q: 2, r: 1 },
    reason: 'drop',
  },
});
