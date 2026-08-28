/**
 * Valid per-variant payload fixtures for the combat movement baseline
 * schema pack (replay-safety PR 5).
 *
 * The `movement_declared` fixture carries the ENRICHED decomposition
 * surface (animation mode, full path, hex/straight/turning split, and a
 * step chain touching six of the twelve `IMovementStep` kinds) — while
 * `movement_declared` legacy compatibility is proven by the pack test's
 * dedicated legacy fixture, which omits every optional enrichment field
 * exactly as pre-enrichment event streams do.
 */

export const VALID_COMBAT_MOVEMENT_EVENT_PAYLOADS: Readonly<
  Record<string, unknown>
> = Object.freeze({
  movement_declared: {
    unitId: 'player-1-atlas-as7-d',
    from: { q: 0, r: 0 },
    to: { q: 2, r: 1 },
    facing: 2,
    movementType: 'run',
    mode: 'run',
    path: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 2, r: 1 },
    ],
    mpUsed: 6,
    heatGenerated: 2,
    standUpAttempt: true,
    standUpSucceeded: true,
    standUpMode: 'careful',
    hexesMoved: 3,
    straightHexes: 2,
    turningMpCost: 1,
    netDisplacement: 3,
    steps: [
      {
        kind: 'standUp',
        index: 0,
        at: { q: 0, r: 0 },
        mpCost: 2,
        psrTriggered: true,
        mode: 'careful',
      },
      {
        kind: 'forward',
        index: 1,
        direction: 'forward',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
      {
        kind: 'turn',
        index: 2,
        at: { q: 1, r: 0 },
        fromFacing: 1,
        toFacing: 2,
        mpCost: 1,
      },
      {
        kind: 'lateral',
        index: 3,
        direction: 'right',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        mpCost: 1,
        terrainEntered: 'rough',
      },
      {
        kind: 'jump',
        index: 4,
        from: { q: 2, r: 0 },
        to: { q: 2, r: 1 },
        mpCost: 1,
        terrainEntered: 'light_woods',
        usesMechanicalJumpBooster: false,
      },
      {
        kind: 'chargeDeclared',
        index: 5,
        at: { q: 2, r: 1 },
        targetId: 'opponent-1-marauder-mad-3r',
        straightLineHexes: 2,
      },
    ],
  },
  movement_invalid: {
    unitId: 'player-1-atlas-as7-d',
    from: { q: 0, r: 0 },
    to: { q: 9, r: 9 },
    facing: 0,
    movementType: 'walk',
    reason: 'InsufficientMP',
    details: 'needs 11 MP, has 4',
    mpCost: 11,
    heatGenerated: 0,
  },
  movement_locked: { unitId: 'player-1-atlas-as7-d' },
  runtime_movement_state_changed: {
    unitId: 'opponent-2-lam',
    source: 'conversion_action',
    conversionMode: 'airmek',
    conversionStepCount: 1,
    conversionMpCost: 2,
    unitHeight: 1,
    lamAirMekAltitude: 2,
    lamAirMekLandingControlRequired: true,
    lamAirMekLandingControlReason: 'damaged gyro',
    lamAirMekLandingControlModifier: 2,
    lamAirMekLandingControlModifierDetails: ['gyro hit +2'],
    lamAirMekLandingControlFallHeight: 2,
  },
  movement_enhancement_activated: {
    unitId: 'player-1-atlas-as7-d',
    enhancement: 'MASC',
  },
  facing_changed: {
    unitId: 'player-1-atlas-as7-d',
    secondaryFacing: 3,
    torsoTwist: 'right',
  },
});

/**
 * A pre-enrichment `movement_declared` payload: only the fields legacy
 * event streams serialized (no mode/path/steps/decomposition). The pack
 * test proves the baseline accepts it unchanged — legacy movement
 * compatibility is explicit in the schema, not reconstructed (task 5.3).
 */
export const LEGACY_MOVEMENT_DECLARED_PAYLOAD: Readonly<
  Record<string, unknown>
> = Object.freeze({
  unitId: 'legacy-unit-1',
  from: { q: 3, r: 3 },
  to: { q: 4, r: 3 },
  facing: 1,
  movementType: 'walk',
  mpUsed: 1,
  heatGenerated: 1,
});
