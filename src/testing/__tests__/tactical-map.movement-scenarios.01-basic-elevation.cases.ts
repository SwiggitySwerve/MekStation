import * as movementScenario from './tactical-map.movement-scenarios.test-context';

it('keeps biped walk run and jump browser options aligned with commit validation', () => {
  expect(movementScenario.tacticalMapBipedOptionMovementRange).toHaveLength(3);
  expect(movementScenario.tacticalMapBipedOptionMovementRange).toMatchObject([
    {
      hex: { q: 0, r: 1 },
      reachable: true,
      mpCost: 3,
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
      heatGenerated: 1,
      movementMode: 'walk',
      movementType: 'walk',
    },
    {
      hex: { q: 0, r: 1 },
      reachable: true,
      mpCost: 3,
      terrainCost: 1,
      elevationDelta: 1,
      elevationCost: 1,
      heatGenerated: 2,
      movementMode: 'run',
      movementType: 'run',
    },
    {
      hex: { q: 0, r: 1 },
      reachable: true,
      mpCost: 1,
      terrainCost: 0,
      elevationDelta: 1,
      elevationCost: 0,
      heatGenerated: 3,
      movementMode: 'jump',
      movementType: 'jump',
    },
  ]);

  const commitInputs = movementScenario.tacticalMapBipedOptionCommitInputs();
  expect(commitInputs).toHaveLength(
    movementScenario.tacticalMapBipedOptionMovementRange.length,
  );

  movementScenario.tacticalMapBipedOptionMovementRange.forEach(
    (projection, index) => {
      const result = movementScenario.validateCommittedMovement(
        commitInputs[index],
      );

      expect(result.valid).toBe(true);
      if (!result.valid) {
        throw new Error(result.details);
      }

      expect(result.mpCost).toBe(projection.mpCost);
      expect(result.heatGenerated).toBe(projection.heatGenerated);
      expect(result.path).toEqual(projection.path);
    },
  );
});

it('keeps selectable legend projections aligned with the biped option source projections', () => {
  expect(
    movementScenario.tacticalMapLegendSelectionMovementRangeByMode.walk,
  ).toEqual([movementScenario.tacticalMapBipedOptionMovementRange[0]]);
  expect(
    movementScenario.tacticalMapLegendSelectionMovementRangeByMode.run,
  ).toEqual([movementScenario.tacticalMapBipedOptionMovementRange[1]]);
  expect(
    movementScenario.tacticalMapLegendSelectionMovementRangeByMode.jump,
  ).toEqual([movementScenario.tacticalMapBipedOptionMovementRange[2]]);
  expect(
    movementScenario.tacticalMapLegendSelectionMpLegend('jump'),
  ).toMatchObject({
    active: 'jump',
    jumpAvailable: true,
    walkMP: 4,
    runMP: 6,
    jumpMP: 3,
  });
});

it('keeps the jump elevation browser projection aligned with commit validation', () => {
  const projection = movementScenario.tacticalMapJumpElevationMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 0, r: 1 },
    reachable: true,
    mpCost: 2,
    terrainCost: 0,
    elevationDelta: -4,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    movementType: 'jump',
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapJumpElevationCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps the VTOL elevation browser projection aligned with commit validation', () => {
  const projection = movementScenario.tacticalMapVtolElevationMovementRange[0];

  expect(projection).toMatchObject({
    reachable: true,
    mpCost: 2,
    terrainCost: 0,
    elevationDelta: 4,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'vtol',
    movementType: 'run',
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapVtolElevationCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps runtime-height bridge clearance blocked between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapRuntimeHeightMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    mpCost: Infinity,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'naval',
    movementType: 'walk',
    blockedReason: 'Naval movement lacks bridge clearance',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement lacks bridge clearance',
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapRuntimeHeightCommitInput(),
  );

  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error('Expected runtime-height bridge clearance to be blocked');
  }

  expect(result.reason).toBe(projection.movementInvalidReason);
  expect(result.details).toBe(projection.movementInvalidDetails);
  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
});
