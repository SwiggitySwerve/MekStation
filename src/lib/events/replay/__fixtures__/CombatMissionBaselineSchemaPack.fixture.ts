/**
 * Valid per-variant payload fixtures for the combat terrain/mission/
 * morale/withdrawal baseline schema pack (replay-safety PR 9B).
 *
 * The `command_result_published` fixture stores the projected
 * player-safe command-result envelope with a domain-specific JSON
 * `publicEffect` (the concretization the pack header documents). The
 * minefield fixture exercises the multi-entry `minefields` map form.
 */

export const VALID_COMBAT_MISSION_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  command_result_published: {
    source: 'host-command',
    result: {
      commandId: 'cmd-42',
      previewId: 'preview-42',
      domain: 'combat',
      status: 'committed',
      subjectRefs: [
        { id: 'player-1-atlas-as7-d', type: 'unit', label: 'Atlas AS7-D' },
      ],
      publicEffect: {
        kind: 'movement-committed',
        hexes: 3,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
        flags: [true, false, null],
      },
      resultingState: {
        label: 'Atlas at (2,0)',
        entityRefs: [{ id: 'player-1-atlas-as7-d', type: 'unit' }],
        fields: { hex: '2,0', mpRemaining: 2, prone: false, note: null },
      },
      ledgerRef: 'ledger-77',
      diagnosticEvent: 'command_commit_succeeded',
      committedAt: '3025-02-01T10:00:00.000Z',
    },
    publicSummary: 'Atlas moved 3 hexes',
  },
  terrain_changed: {
    hex: { q: 4, r: 2 },
    terrain: 'rubble',
    elevation: 0,
    previousTerrain: 'building',
    previousElevation: 2,
    reason: 'battlefield_wreckage',
    sourceEventId: 'event-91',
    sourceUnitId: 'opponent-1-marauder-mad-3r',
  },
  minefield_changed: {
    operation: 'set',
    minefields: {
      '4,4': { type: 'conventional', damagePerLeg: 6, density: 10 },
      '5,4': { type: 'vibrabomb', damagePerLeg: 10, setting: 40 },
    },
    reason: 'scenario_setup',
  },
  emp_minefield_effect_applied: {
    unitId: 'player-1-atlas-as7-d',
    hex: { q: 4, r: 4 },
    roll: 7,
    modifier: 2,
    modifiedRoll: 9,
    effect: 'interference',
    durationTurns: 1,
    source: 'minefield',
  },
  retreat_triggered: {
    unitId: 'opponent-1-marauder-mad-3r',
    edge: 'north',
    reason: 'structural_threshold',
  },
  unit_retreated: {
    unitId: 'opponent-1-marauder-mad-3r',
    retreatEdge: 'north',
    turn: 6,
  },
  unit_ejected: {
    unitId: 'opponent-2-warhammer-whm-6r',
    turn: 5,
    reason: 'pilot_survival',
  },
  objective_captured: {
    objectiveId: 'objective-1',
    hexKey: '2,3',
    capturingSide: 'player',
    turn: 4,
  },
  objective_lost: {
    objectiveId: 'objective-1',
    hexKey: '2,3',
    losingSide: 'player',
    turn: 5,
  },
  objective_progress: {
    objectiveId: 'objective-1',
    hexKey: '2,3',
    controlSide: 'player',
    holdProgress: 1,
    holdTurnsRequired: 2,
    turn: 4,
  },
  morale_shifted: {
    side: 'opponent',
    from: 'STEADY',
    to: 'SHAKEN',
    cause: 'enemy unit destroyed',
    turn: 4,
  },
  withdrawal_declared: {
    unitId: 'opponent-1-marauder-mad-3r',
    edge: 'north',
    declaredBy: 'forced',
    turn: 6,
  },
  forced_withdrawal_triggered: {
    unitId: 'opponent-1-marauder-mad-3r',
    reason: 'morale-broken',
    turn: 6,
  },
});
