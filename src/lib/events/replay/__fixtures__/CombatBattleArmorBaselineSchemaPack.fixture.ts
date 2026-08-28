/**
 * Valid per-variant payload fixtures for the combat battle-armor
 * baseline schema pack (replay-safety PR 10).
 *
 * Resolved inputs (swarm roll totals and target numbers, cluster
 * missile hits, leg-attack hit locations + crit modifiers, and
 * stealth/mimetic bonus values) are stored data the schemas retain.
 */

export const VALID_COMBAT_BATTLE_ARMOR_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  trooper_killed: {
    unitId: 'opponent-4-elemental-squad',
    trooperIndex: 2,
    survivingTroopers: 4,
  },
  squad_eliminated: { unitId: 'opponent-4-elemental-squad' },
  swarm_attached: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-1-atlas-as7-d',
    rollTotal: 9,
    targetNumber: 7,
  },
  swarm_damage: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-1-atlas-as7-d',
    damage: 20,
    locationLabel: 'Rear Center Torso',
  },
  swarm_dismounted: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-1-atlas-as7-d',
    cause: 'dismount_roll',
    dismountDamage: 0,
  },
  leg_attack: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-1-atlas-as7-d',
    success: true,
    damageToLeg: 4,
    selfDamage: 0,
    survivingTroopers: 5,
  },
  leg_attack_resolved: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-1-atlas-as7-d',
    hit: true,
    damage: 4,
    hitLocation: 'Left Leg',
    critModifier: -2,
    survivingTroopers: 5,
  },
  vibro_claw_attack_resolved: {
    unitId: 'opponent-4-elemental-squad',
    targetUnitId: 'player-2-locust-lct-1v',
    damage: 6,
    missileHits: 3,
    vibroClawCount: 2,
    survivingTroopers: 4,
  },
  mimetic_bonus: {
    unitId: 'opponent-4-elemental-squad',
    attackerId: 'player-1-atlas-as7-d',
    toHitBonus: 3,
  },
  stealth_bonus: {
    unitId: 'opponent-4-elemental-squad',
    attackerId: 'player-1-atlas-as7-d',
    toHitBonus: 2,
    source: 'stealth_improved',
  },
});
