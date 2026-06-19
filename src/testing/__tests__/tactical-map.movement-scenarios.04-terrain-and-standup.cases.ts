import * as movementScenario from './tactical-map.movement-scenarios.test-context';

it('keeps hover water crossing legal between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapHoverWaterMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    movementMode: 'hover',
    movementType: 'walk',
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapHoverWaterCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps Mek swim elevation movement legal between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapSwimMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    movementMode: 'biped_swim',
    movementType: 'walk',
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 3,
    elevationCost: 0,
    heatGenerated: 1,
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapSwimCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps Frogman deep-water movement legal between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapFrogmanMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    movementMode: 'walk',
    movementType: 'walk',
    mpCost: 3,
    terrainCost: 2,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 1,
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapFrogmanCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps TacOps battlefield wreck rough terrain aligned with commit validation', () => {
  expect(movementScenario.tacticalMapBattlefieldWreckHexTerrain).toMatchObject([
    {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: 'rough', level: 1 }],
    },
  ]);

  const projection =
    movementScenario.tacticalMapBattlefieldWreckMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    movementMode: 'walk',
    movementType: 'walk',
    mpCost: 2,
    terrainCost: 1,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 1,
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapBattlefieldWreckCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});

it('keeps prone stand-up movement legal between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapStandUpMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 2, r: 0 },
    reachable: true,
    movementMode: 'walk',
    movementType: 'walk',
    mpCost: 4,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 1,
    standUpRequired: true,
    standUpMode: 'normal',
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrReason: 'Standing up',
    standUpPsrTargetNumber: 5,
    standUpPsrModifier: 0,
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapStandUpCommitInput(),
  );

  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  expect(result.path).toEqual(projection.path);
});
