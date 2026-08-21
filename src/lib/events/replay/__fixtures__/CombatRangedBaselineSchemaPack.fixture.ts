/**
 * Valid per-variant payload fixtures for the combat ranged/indirect
 * baseline schema pack (replay-safety PR 6).
 *
 * `attack_resolved` ships BOTH stored forms: the public payload (with
 * the full Edge/ammo/cluster audit surface) and the fog-of-war REDACTED
 * form whose attacker/weapon identifiers are intentionally absent.
 * Resolved inputs (to-hit rolls, consumed d6 arrays, hit locations,
 * cluster rolls, ammo bin references, spotter/basis decisions) are
 * stored data the schemas retain byte-for-byte.
 */

export const VALID_COMBAT_RANGED_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  attack_declared: {
    attackerId: 'player-1-atlas-as7-d',
    targetId: 'opponent-1-marauder-mad-3r',
    weapons: ['weapon-ac20-1', 'weapon-mlas-2'],
    weaponModes: { 'weapon-mml-3': 'Indirect' },
    selectedAMSWeaponIds: { 'weapon-lrm20-9': 'ams-1' },
    selectedAMSWeaponMounts: {
      'weapon-lrm20-9': {
        weaponId: 'ams-1',
        weaponName: 'Anti-Missile System',
        heat: 1,
        ammoWeaponType: 'AMS',
        mountingArc: 'front',
        mountingArcs: ['front', 'left'],
        amsMultiUse: false,
      },
    },
    weaponAttacks: [
      {
        weaponId: 'weapon-ac20-1',
        weaponName: 'AC/20',
        damage: 20,
        heat: 7,
      },
    ],
    toHitNumber: 8,
    modifiers: [
      { name: 'Gunnery', value: 4, source: 'pilot' },
      {
        name: 'Target movement',
        value: 2,
        source: 'tmm',
        description: 'target moved 5 hexes',
      },
    ],
    range: 'medium',
    firingArc: 'front',
  },
  attack_invalid: {
    attackerId: 'player-1-atlas-as7-d',
    targetId: 'opponent-1-marauder-mad-3r',
    weaponId: 'weapon-ac20-1',
    reason: 'OutOfAmmo',
    details: 'bin bin-ac20-1 empty',
  },
  attack_locked: { unitId: 'player-1-atlas-as7-d' },
  attacks_revealed: {
    unitIds: ['player-1-atlas-as7-d', 'opponent-1-marauder-mad-3r'],
    attackCount: 3,
  },
  attack_resolved: {
    attackerId: 'player-1-atlas-as7-d',
    targetId: 'opponent-1-marauder-mad-3r',
    weaponId: 'weapon-ac20-1',
    roll: 9,
    toHitNumber: 8,
    hit: true,
    location: 'CT',
    damage: 20,
    heat: 7,
    attackerArc: 'front',
    ammoBinId: 'bin-ac20-1',
    visualCategory: 'ballistic',
    visualSubtype: 'ac-20',
    projectileCount: 1,
    rolls: [4, 5, 3, 4],
    edgeReroll: true,
    edgeSuperseded: true,
    edgeTrigger: 'edge_reroll_headhit',
    edgePointsRemaining: 0,
    edgeSupersededLocation: 'HD',
    edgeSupersededRoll: 12,
  },
  spotting_declared: {
    unitId: 'player-2-locust-lct-1v',
    targetId: 'opponent-1-marauder-mad-3r',
    turn: 2,
  },
  indirect_fire_spotter_selected: {
    attackerId: 'player-1-atlas-as7-d',
    spotterId: 'player-2-locust-lct-1v',
    weaponId: 'weapon-lrm20-4',
    ammoId: 'bin-lrm20-1',
    targetHex: { q: 5, r: 3 },
    toHitPenalty: 1,
    basis: 'los',
    spotterAttackedThisTurn: true,
  },
  indirect_fire_spotter_lost: {
    attackerId: 'player-1-atlas-as7-d',
    spotterId: 'player-2-locust-lct-1v',
    weaponId: 'weapon-lrm20-4',
    targetHex: { q: 5, r: 3 },
    toHitPenalty: 1,
    basis: 'los',
    reason: 'spotter destroyed by return fire',
  },
  indirect_fire_forward_observer: {
    attackerId: 'player-1-atlas-as7-d',
    spotterId: 'player-2-locust-lct-1v',
    weaponId: 'weapon-lrm20-4',
    ammoId: 'bin-lrm20-1',
    targetHex: { q: 5, r: 3 },
    toHitPenalty: 0,
    basis: 'los',
    penaltyCancelled: 1,
  },
  indirect_fire_narc_override: {
    attackerId: 'player-1-atlas-as7-d',
    spotterId: null,
    weaponId: 'weapon-lrm20-4',
    ammoId: 'bin-lrm20-1',
    targetHex: { q: 5, r: 3 },
    toHitPenalty: 0,
    basis: 'narc',
  },
  ammo_consumed: {
    unitId: 'player-1-atlas-as7-d',
    binId: 'bin-ac20-1',
    weaponType: 'AC/20',
    roundsConsumed: 1,
    roundsRemaining: 4,
  },
  ams_interception: {
    defenderId: 'opponent-1-marauder-mad-3r',
    targetId: 'opponent-1-marauder-mad-3r',
    attackerId: 'player-1-atlas-as7-d',
    incomingWeaponId: 'weapon-lrm20-4',
    amsWeaponId: 'ams-1',
    resolution: 'cluster-table',
    incomingProjectiles: 20,
    projectilesIntercepted: 4,
    projectilesRemaining: 16,
    ammoConsumed: 1,
    roll: [3, 4],
    clusterRoll: 7,
    clusterModifier: -4,
    modifiedClusterRoll: 3,
    ammoBinId: 'bin-ams-1',
    ammoRemaining: 11,
  },
  designator_marker_applied: {
    attackerId: 'player-2-locust-lct-1v',
    targetId: 'opponent-1-marauder-mad-3r',
    weaponId: 'weapon-narc-1',
    marker: 'narc',
    persistent: true,
    turn: 2,
    location: 'LT',
    teamId: 'player',
  },
});

/**
 * The fog-of-war redacted `attack_resolved` stored form — attacker and
 * weapon identifiers intentionally absent (`IRedactedAttackResolvedPayload`).
 */
export const REDACTED_ATTACK_RESOLVED_PAYLOAD: Readonly<
  Record<string, unknown>
> = Object.freeze({
  targetId: 'opponent-1-marauder-mad-3r',
  roll: 6,
  toHitNumber: 8,
  hit: false,
  rolls: [3, 3],
});
