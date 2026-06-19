import * as movementScenario from './tactical-map.movement-scenarios.test-context';

it('projects impossible stand-up reasons for the browser harness', () => {
  const reason = 'Cannot stand with a destroyed leg and both arms destroyed';
  const projection =
    movementScenario.tacticalMapImpossibleStandUpMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    movementMode: 'walk',
    movementType: 'walk',
    mpCost: 2,
    heatGenerated: 0,
    blockedReason: reason,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: reason,
    standUpRequired: true,
    standUpMode: 'normal',
    standUpCost: 2,
    standUpPsrRequired: true,
    standUpPsrReason: 'Standing up',
    standUpPsrImpossibleReason: reason,
  });
});

it('keeps naval landfall blocked between browser projection and commit validation', () => {
  const projection = movementScenario.tacticalMapNavalLandfallMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    movementMode: 'naval',
    movementType: 'walk',
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    blockedReason: 'Naval movement requires water terrain',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Naval movement requires water terrain',
  });
  expect(Number.isFinite(projection.mpCost)).toBe(false);

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapNavalLandfallCommitInput(),
  );

  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error('Expected naval landfall movement to be blocked');
  }

  expect(result.reason).toBe(projection.movementInvalidReason);
  expect(result.details).toBe(projection.movementInvalidDetails);
  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
});
