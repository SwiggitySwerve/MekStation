/**
 * Valid per-variant payload fixtures for the combat vehicle and
 * represented-system-state baseline schema pack (replay-safety PR 9A).
 *
 * Resolved inputs (shutdown/startup target numbers + consumed d6 pairs,
 * motive severities and MP deltas, immobilization causes, VTOL crash
 * altitude and fall damage) are stored data the schemas retain.
 */

export const VALID_COMBAT_VEHICLE_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  shutdown_check: {
    unitId: 'player-1-atlas-as7-d',
    heatLevel: 16,
    targetNumber: 6,
    roll: 8,
    shutdownOccurred: false,
    automatic: false,
    rolls: [4, 4],
  },
  startup_attempt: {
    unitId: 'player-1-atlas-as7-d',
    targetNumber: 4,
    roll: 3,
    success: false,
    rolls: [1, 2],
  },
  neural_interface_state_changed: {
    unitId: 'player-1-atlas-as7-d',
    active: false,
    turn: 4,
    reason: 'shutdown',
  },
  motive_damaged: {
    unitId: 'opponent-1-vedette',
    severity: 'moderate',
    mpPenalty: 2,
    rolls: [5, 5],
  },
  motive_penalty_applied: {
    unitId: 'opponent-1-vedette',
    previousCruiseMP: 5,
    newCruiseMP: 3,
    newFlankMP: 5,
  },
  vehicle_immobilized: {
    unitId: 'opponent-1-vedette',
    cause: 'motive_roll',
  },
  turret_locked: {
    unitId: 'opponent-1-vedette',
    secondary: false,
  },
  vehicle_crew_stunned: {
    unitId: 'opponent-1-vedette',
    phasesStunned: 2,
  },
  vtol_crash_check: {
    unitId: 'opponent-3-warrior-h7',
    altitude: 3,
    fallDamage: 30,
  },
});
