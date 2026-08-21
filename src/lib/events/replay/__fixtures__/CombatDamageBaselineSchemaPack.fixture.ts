/**
 * Valid per-variant payload fixtures for the combat damage/heat/critical
 * baseline schema pack (replay-safety PR 7).
 *
 * `unit_destroyed` ships BOTH stored forms (public cause/killer payload
 * and the fog-of-war redacted unit-id-only notice). The heat fixtures
 * exercise both discriminants of the shared `IHeatPayload` shape,
 * including the dissipation breakdown. Resolved inputs (armor/structure
 * remainders, crit slot outcomes, consumed d6 sequences, Edge audit
 * fields, explosion sources) are stored data the schemas retain.
 */

export const VALID_COMBAT_DAMAGE_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  damage_applied: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'CT',
    damage: 20,
    armorRemaining: 4,
    structureRemaining: 16,
    locationDestroyed: false,
    criticals: ['engine'],
    sourceUnitId: 'player-1-atlas-as7-d',
    attackId: 'attack-7',
  },
  heat_generated: {
    unitId: 'player-1-atlas-as7-d',
    amount: 9,
    source: 'firing',
    newTotal: 12,
    previousTotal: 3,
    previousThreshold: 'normal',
    currentThreshold: 'warm',
    ammoExplosionRisk: false,
  },
  heat_dissipated: {
    unitId: 'player-1-atlas-as7-d',
    amount: -14,
    source: 'dissipation',
    newTotal: 0,
    previousTotal: 14,
    breakdown: {
      baseDissipation: 10,
      waterBonus: 4,
      environmentalModifier: 0,
      heatGenerationReduction: 0,
    },
  },
  heat_effect_applied: {
    unitId: 'player-1-atlas-as7-d',
    threshold: 14,
    effect: 'shutdown_check',
    heatLevel: 15,
  },
  pilot_hit: {
    unitId: 'opponent-1-marauder-mad-3r',
    wounds: 1,
    totalWounds: 2,
    source: 'head_hit',
    consciousnessCheckRequired: true,
    consciousnessCheckPassed: false,
    edgeReroll: false,
    rolls: [2, 3],
  },
  unit_destroyed: {
    unitId: 'opponent-1-marauder-mad-3r',
    cause: 'ct_destroyed',
    killerUnitId: 'player-1-atlas-as7-d',
  },
  ammo_explosion: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'LT',
    binId: 'bin-lrm20-1',
    weaponType: 'LRM 20',
    roundsDestroyed: 4,
    damage: 20,
    caseProtection: 'case',
    source: 'CritInduced',
  },
  critical_hit: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'CT',
    sourceUnitId: 'player-1-atlas-as7-d',
    component: 'engine',
    count: 1,
  },
  critical_hit_resolved: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'CT',
    slotIndex: 2,
    componentType: 'engine',
    componentName: 'Fusion Engine',
    effect: 'engine hit: +5 heat per turn',
    destroyed: false,
    breached: false,
    edgePointsRemaining: 1,
    rolls: [5, 4, 3, 6],
  },
  location_destroyed: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'LT',
    cascadedTo: 'LA',
    viaTransfer: false,
  },
  transfer_damage: {
    unitId: 'opponent-1-marauder-mad-3r',
    fromLocation: 'LA',
    toLocation: 'LT',
    damage: 6,
  },
  component_destroyed: {
    unitId: 'opponent-1-marauder-mad-3r',
    location: 'LT',
    componentType: 'ammo',
    slotIndex: 4,
    componentName: 'LRM 20 Ammo',
    ammoBinId: 'bin-lrm20-1',
  },
});

/**
 * The fog-of-war redacted `unit_destroyed` stored form — unit id only
 * (`IRedactedUnitDestroyedPayload`).
 */
export const REDACTED_UNIT_DESTROYED_PAYLOAD: Readonly<
  Record<string, unknown>
> = Object.freeze({ unitId: 'opponent-1-marauder-mad-3r' });
