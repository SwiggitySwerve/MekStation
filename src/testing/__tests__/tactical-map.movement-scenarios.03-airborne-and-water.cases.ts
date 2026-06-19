import * as movementScenario from './tactical-map.movement-scenarios.test-context';

it('keeps grounded LAM Fighter runtime conversion mode aligned between browser projection and commit validation', () => {
  const fighterProjection =
    movementScenario.tacticalMapLamFighterMovementRange[0];

  expect(fighterProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    mpCost: Infinity,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 4,
    heatGenerated: 0,
    movementMode: 'wheeled',
    movementType: 'walk',
    blockedReason: 'Elevation change of 2 exceeds Wheeled movement limit',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 2 exceeds Wheeled movement limit',
  });
  expect(movementScenario.tacticalMapLamFighterMpLegend).toMatchObject({
    movementMode: 'wheeled',
    walkMP: 1,
    runMP: 1,
    jumpMP: 0,
    jumpAvailable: false,
  });

  const fighterResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamFighterCommitInput(),
  );

  expect(fighterResult.valid).toBe(false);
  if (fighterResult.valid) {
    throw new Error('Expected grounded LAM Fighter climb to be blocked');
  }
  expect(fighterResult.reason).toBe(fighterProjection.movementInvalidReason);
  expect(fighterResult.details).toBe(fighterProjection.movementInvalidDetails);
  expect(fighterResult.mpCost).toBe(fighterProjection.mpCost);
  expect(fighterResult.heatGenerated).toBe(fighterProjection.heatGenerated);
});

it('keeps airborne LAM Fighter ground movement blocked between browser projection and commit validation', () => {
  const fighterProjection =
    movementScenario.tacticalMapLamAirborneFighterMovementRange[0];

  expect(fighterProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    mpCost: Infinity,
    terrainCost: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'walk',
    movementType: 'walk',
    blockedReason:
      movementScenario.AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      movementScenario.AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
  });
  expect(movementScenario.tacticalMapLamAirborneFighterMpLegend).toMatchObject({
    movementMode: 'walk',
    walkMP: 2,
    runMP: 3,
    jumpMP: 0,
    jumpAvailable: false,
  });

  const fighterResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamAirborneFighterCommitInput(),
  );

  expect(fighterResult.valid).toBe(false);
  if (fighterResult.valid) {
    throw new Error('Expected airborne LAM Fighter movement to be blocked');
  }
  expect(fighterResult.reason).toBe(fighterProjection.movementInvalidReason);
  expect(fighterResult.details).toBe(fighterProjection.movementInvalidDetails);
  expect(fighterResult.mpCost).toBe(fighterProjection.mpCost);
  expect(fighterResult.heatGenerated).toBe(fighterProjection.heatGenerated);
});

it('keeps airborne LAM AirMek ground movement blocked between browser projection and commit validation', () => {
  const airMekProjection =
    movementScenario.tacticalMapLamAirborneAirMekMovementRange[0];

  expect(airMekProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    mpCost: Infinity,
    terrainCost: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'wige',
    movementType: 'walk',
    blockedReason:
      movementScenario.AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails:
      movementScenario.AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  });
  expect(movementScenario.tacticalMapLamAirborneAirMekMpLegend).toMatchObject({
    movementMode: 'wige',
    walkMP: 6,
    runMP: 9,
    jumpMP: 2,
    jumpAvailable: true,
  });

  const airMekResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamAirborneAirMekCommitInput(),
  );

  expect(airMekResult.valid).toBe(false);
  if (airMekResult.valid) {
    throw new Error('Expected airborne LAM AirMek movement to be blocked');
  }
  expect(airMekResult.reason).toBe(airMekProjection.movementInvalidReason);
  expect(airMekResult.details).toBe(airMekProjection.movementInvalidDetails);
  expect(airMekResult.mpCost).toBe(airMekProjection.mpCost);
  expect(airMekResult.heatGenerated).toBe(airMekProjection.heatGenerated);
});

it('keeps run-selected water fallback committed as walking when running is blocked', () => {
  const projection =
    movementScenario.tacticalMapRunWaterFallbackMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 2, r: 0 },
    reachable: true,
    movementMode: 'walk',
    movementType: 'walk',
    mpCost: 5,
    terrainCost: 3,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 1,
    movementModeOptions: [
      {
        movementType: 'walk',
        movementMode: 'walk',
        reachable: true,
        mpCost: 5,
        terrainCost: 3,
        heatGenerated: 1,
      },
      {
        movementType: 'run',
        movementMode: 'run',
        reachable: false,
        mpCost: Infinity,
        blockedReason: 'Water blocks ground movement',
        movementInvalidReason: 'TerrainBlocked',
        movementInvalidDetails: 'Water blocks ground movement',
      },
    ],
  });

  const commitInput = movementScenario.tacticalMapRunWaterFallbackCommitInput();
  expect(commitInput.movementType).toBe(projection.movementType);
  expect(commitInput.path).toEqual(projection.path);

  const result = movementScenario.validateCommittedMovement(commitInput);

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps tracked vehicle abrupt elevation blocked between browser projection and commit validation', () => {
  const projection =
    movementScenario.tacticalMapTrackedElevationMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    movementMode: 'tracked',
    movementType: 'walk',
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 4,
    heatGenerated: 0,
    blockedReason: 'Elevation change of 2 exceeds Tracked movement limit',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 2 exceeds Tracked movement limit',
  });
  expect(Number.isFinite(projection.mpCost)).toBe(false);

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapTrackedElevationCommitInput(),
  );

  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error('Expected tracked elevation movement to be blocked');
  }

  expect(result.reason).toBe(projection.movementInvalidReason);
  expect(result.details).toBe(projection.movementInvalidDetails);
  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
});
