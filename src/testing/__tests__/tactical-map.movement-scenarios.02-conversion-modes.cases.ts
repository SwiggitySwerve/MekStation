import * as movementScenario from './tactical-map.movement-scenarios.test-context';

it('keeps infantry mount-state height changes aligned between browser projection and commit validation', () => {
  const [mountedProjection, dismountedProjection] =
    movementScenario.tacticalMapInfantryMountStateMovementRange;
  const [mountedInput, dismountedInput] =
    movementScenario.tacticalMapInfantryMountStateCommitInputs();

  expect(mountedProjection).toMatchObject({
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

  const mountedResult =
    movementScenario.validateCommittedMovement(mountedInput);

  expect(mountedResult.valid).toBe(false);
  if (mountedResult.valid) {
    throw new Error('Expected mounted infantry height to block clearance');
  }
  expect(mountedResult.reason).toBe(mountedProjection.movementInvalidReason);
  expect(mountedResult.details).toBe(mountedProjection.movementInvalidDetails);
  expect(mountedResult.mpCost).toBe(mountedProjection.mpCost);
  expect(mountedResult.heatGenerated).toBe(mountedProjection.heatGenerated);

  expect(dismountedProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'naval',
    movementType: 'walk',
  });

  const dismountedResult =
    movementScenario.validateCommittedMovement(dismountedInput);

  expect(dismountedResult.valid).toBe(true);
  if (!dismountedResult.valid) {
    throw new Error(dismountedResult.details);
  }
  expect(dismountedResult.mpCost).toBe(dismountedProjection.mpCost);
  expect(dismountedResult.heatGenerated).toBe(
    dismountedProjection.heatGenerated,
  );
  expect(dismountedResult.path).toEqual(dismountedProjection.path);
});

it('keeps occupied destination blocking aligned between browser projection and commit validation', () => {
  const projection =
    movementScenario.tacticalMapOccupiedDestinationMovementRange[0];

  expect(projection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'walk',
    movementType: 'walk',
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
  });

  const result = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapOccupiedDestinationCommitInput(),
  );

  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error('Expected occupied destination movement to be blocked');
  }

  expect(result.reason).toBe(projection.movementInvalidReason);
  expect(result.details).toBe(projection.movementInvalidDetails);
  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
});

it('keeps QuadVee runtime conversion mode aligned between browser projection and commit validation', () => {
  const mekProjection = movementScenario.tacticalMapQuadveeMekMovementRange[0];
  const vehicleProjection =
    movementScenario.tacticalMapQuadveeVehicleMovementRange[0];

  expect(mekProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: true,
    mpCost: 3,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 2,
    heatGenerated: 1,
    movementMode: 'walk',
    movementType: 'walk',
  });
  expect(movementScenario.tacticalMapQuadveeMekMpLegend).toMatchObject({
    movementMode: 'walk',
    jumpMP: 3,
    jumpAvailable: true,
  });

  const mekResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapQuadveeMekCommitInput(),
  );

  expect(mekResult.valid).toBe(true);
  if (!mekResult.valid) {
    throw new Error(mekResult.details);
  }
  expect(mekResult.mpCost).toBe(mekProjection.mpCost);
  expect(mekResult.heatGenerated).toBe(mekProjection.heatGenerated);
  expect(mekResult.path).toEqual(mekProjection.path);

  expect(vehicleProjection).toMatchObject({
    hex: { q: 1, r: 0 },
    reachable: false,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 4,
    heatGenerated: 0,
    movementMode: 'tracked',
    movementType: 'walk',
    blockedReason: 'Elevation change of 2 exceeds Tracked movement limit',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails:
      'Elevation change of 2 exceeds Tracked movement limit',
  });
  expect(movementScenario.tacticalMapQuadveeVehicleMpLegend).toMatchObject({
    movementMode: 'tracked',
    jumpMP: 0,
    jumpAvailable: false,
  });

  const vehicleResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapQuadveeVehicleCommitInput(),
  );

  expect(vehicleResult.valid).toBe(false);
  if (vehicleResult.valid) {
    throw new Error('Expected QuadVee vehicle-mode climb to be blocked');
  }
  expect(vehicleResult.reason).toBe(vehicleProjection.movementInvalidReason);
  expect(vehicleResult.details).toBe(vehicleProjection.movementInvalidDetails);
  expect(vehicleResult.mpCost).toBe(vehicleProjection.mpCost);
  expect(vehicleResult.heatGenerated).toBe(vehicleProjection.heatGenerated);
});

it('keeps LAM AirMek runtime conversion mode aligned between browser projection and commit validation', () => {
  const mekProjection = movementScenario.tacticalMapLamMekMovementRange[0];
  const airMekProjection =
    movementScenario.tacticalMapLamAirMekMovementRange[0];

  expect(mekProjection).toMatchObject({
    hex: { q: 3, r: 0 },
    reachable: false,
    mpCost: 5,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 2,
    heatGenerated: 0,
    movementMode: 'walk',
    movementType: 'walk',
    blockedReason: 'Path costs 5 MP, but only 4 MP is available',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Path costs 5 MP, but only 4 MP is available',
  });
  expect(movementScenario.tacticalMapLamMekMpLegend).toMatchObject({
    movementMode: 'walk',
    walkMP: 4,
    runMP: 6,
    jumpMP: 2,
    jumpAvailable: true,
  });

  const mekResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamMekCommitInput(),
  );

  expect(mekResult.valid).toBe(false);
  if (mekResult.valid) {
    throw new Error('Expected LAM Mek-mode climb to exceed walk MP');
  }
  expect(mekResult.reason).toBe(mekProjection.movementInvalidReason);
  expect(mekResult.details).toBe(mekProjection.movementInvalidDetails);
  expect(mekResult.mpCost).toBe(mekProjection.mpCost);
  expect(mekResult.heatGenerated).toBe(mekProjection.heatGenerated);

  expect(airMekProjection).toMatchObject({
    hex: { q: 3, r: 0 },
    reachable: true,
    mpCost: 3,
    terrainCost: 0,
    elevationDelta: 2,
    elevationCost: 0,
    heatGenerated: 1,
    movementMode: 'wige',
    movementType: 'walk',
  });
  expect(movementScenario.tacticalMapLamAirMekMpLegend).toMatchObject({
    movementMode: 'wige',
    walkMP: 6,
    runMP: 9,
    jumpMP: 2,
    jumpAvailable: true,
  });

  const airMekResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamAirMekCommitInput(),
  );

  expect(airMekResult.valid).toBe(true);
  if (!airMekResult.valid) {
    throw new Error(airMekResult.details);
  }
  expect(airMekResult.mpCost).toBe(airMekProjection.mpCost);
  expect(airMekResult.heatGenerated).toBe(airMekProjection.heatGenerated);
  expect(airMekResult.path).toEqual(airMekProjection.path);
});

it('keeps LAM AirMek long cruise heat aligned between browser projection and commit validation', () => {
  const airMekProjection =
    movementScenario.tacticalMapLamAirMekLongCruiseMovementRange[0];

  expect(airMekProjection).toMatchObject({
    hex: { q: 6, r: 0 },
    reachable: true,
    mpCost: 6,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 2,
    movementMode: 'wige',
    movementType: 'walk',
  });

  const airMekResult = movementScenario.validateCommittedMovement(
    movementScenario.tacticalMapLamAirMekLongCruiseCommitInput(),
  );

  expect(airMekResult.valid).toBe(true);
  if (!airMekResult.valid) {
    throw new Error(airMekResult.details);
  }
  expect(airMekResult.mpCost).toBe(airMekProjection.mpCost);
  expect(airMekResult.heatGenerated).toBe(airMekProjection.heatGenerated);
  expect(airMekResult.path).toEqual(airMekProjection.path);
});
