import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import {
  AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
} from '@/utils/gameplay/movement/runtimeCapability';

import {
  tacticalMapBattlefieldWreckCommitInput,
  tacticalMapBattlefieldWreckHexTerrain,
  tacticalMapBattlefieldWreckMovementRange,
} from '../tactical-map.battlefield-wreck-scenario';
import {
  tacticalMapFrogmanCommitInput,
  tacticalMapFrogmanMovementRange,
} from '../tactical-map.frogman-scenario';
import {
  tacticalMapHoverWaterCommitInput,
  tacticalMapHoverWaterMovementRange,
} from '../tactical-map.hover-water-scenario';
import {
  tacticalMapInfantryMountStateCommitInputs,
  tacticalMapInfantryMountStateMovementRange,
} from '../tactical-map.infantry-mount-state-scenario';
import {
  tacticalMapLamAirborneAirMekCommitInput,
  tacticalMapLamAirborneAirMekMovementRange,
  tacticalMapLamAirborneAirMekMpLegend,
  tacticalMapLamAirborneFighterCommitInput,
  tacticalMapLamAirborneFighterMovementRange,
  tacticalMapLamAirborneFighterMpLegend,
} from '../tactical-map.lam-airborne-fighter-scenario';
import {
  tacticalMapLamAirMekCommitInput,
  tacticalMapLamAirMekLongCruiseCommitInput,
  tacticalMapLamAirMekLongCruiseMovementRange,
  tacticalMapLamAirMekMovementRange,
  tacticalMapLamAirMekMpLegend,
  tacticalMapLamFighterCommitInput,
  tacticalMapLamFighterMovementRange,
  tacticalMapLamFighterMpLegend,
  tacticalMapLamMekCommitInput,
  tacticalMapLamMekMovementRange,
  tacticalMapLamMekMpLegend,
} from '../tactical-map.lam-conversion-scenario';
import {
  tacticalMapBipedOptionCommitInputs,
  tacticalMapBipedOptionMovementRange,
  tacticalMapJumpElevationCommitInput,
  tacticalMapJumpElevationMovementRange,
  tacticalMapLegendSelectionMovementRangeByMode,
  tacticalMapLegendSelectionMpLegend,
  tacticalMapRuntimeHeightCommitInput,
  tacticalMapRuntimeHeightMovementRange,
  tacticalMapVtolElevationCommitInput,
  tacticalMapVtolElevationMovementRange,
} from '../tactical-map.movement-scenarios';
import {
  tacticalMapNavalLandfallCommitInput,
  tacticalMapNavalLandfallMovementRange,
} from '../tactical-map.naval-landfall-scenario';
import {
  tacticalMapOccupiedDestinationCommitInput,
  tacticalMapOccupiedDestinationMovementRange,
} from '../tactical-map.occupied-destination-scenario';
import {
  tacticalMapQuadveeMekCommitInput,
  tacticalMapQuadveeMekMovementRange,
  tacticalMapQuadveeMekMpLegend,
  tacticalMapQuadveeVehicleCommitInput,
  tacticalMapQuadveeVehicleMovementRange,
  tacticalMapQuadveeVehicleMpLegend,
} from '../tactical-map.quadvee-conversion-scenario';
import {
  tacticalMapRunWaterFallbackCommitInput,
  tacticalMapRunWaterFallbackMovementRange,
} from '../tactical-map.run-water-fallback-scenario';
import {
  tacticalMapImpossibleStandUpMovementRange,
  tacticalMapStandUpCommitInput,
  tacticalMapStandUpMovementRange,
} from '../tactical-map.standup-scenario';
import {
  tacticalMapSwimCommitInput,
  tacticalMapSwimMovementRange,
} from '../tactical-map.swim-scenario';
import {
  tacticalMapTrackedElevationCommitInput,
  tacticalMapTrackedElevationMovementRange,
} from '../tactical-map.tracked-elevation-scenario';

describe('tactical map movement scenarios', () => {
  it('keeps biped walk run and jump browser options aligned with commit validation', () => {
    expect(tacticalMapBipedOptionMovementRange).toHaveLength(3);
    expect(tacticalMapBipedOptionMovementRange).toMatchObject([
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

    const commitInputs = tacticalMapBipedOptionCommitInputs();
    expect(commitInputs).toHaveLength(
      tacticalMapBipedOptionMovementRange.length,
    );

    tacticalMapBipedOptionMovementRange.forEach((projection, index) => {
      const result = validateCommittedMovement(commitInputs[index]);

      expect(result.valid).toBe(true);
      if (!result.valid) {
        throw new Error(result.details);
      }

      expect(result.mpCost).toBe(projection.mpCost);
      expect(result.heatGenerated).toBe(projection.heatGenerated);
      expect(result.path).toEqual(projection.path);
    });
  });

  it('keeps selectable legend projections aligned with the biped option source projections', () => {
    expect(tacticalMapLegendSelectionMovementRangeByMode.walk).toEqual([
      tacticalMapBipedOptionMovementRange[0],
    ]);
    expect(tacticalMapLegendSelectionMovementRangeByMode.run).toEqual([
      tacticalMapBipedOptionMovementRange[1],
    ]);
    expect(tacticalMapLegendSelectionMovementRangeByMode.jump).toEqual([
      tacticalMapBipedOptionMovementRange[2],
    ]);
    expect(tacticalMapLegendSelectionMpLegend('jump')).toMatchObject({
      active: 'jump',
      jumpAvailable: true,
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
    });
  });

  it('keeps the jump elevation browser projection aligned with commit validation', () => {
    const projection = tacticalMapJumpElevationMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapJumpElevationCommitInput(),
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
    const projection = tacticalMapVtolElevationMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapVtolElevationCommitInput(),
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
    const projection = tacticalMapRuntimeHeightMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapRuntimeHeightCommitInput(),
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

  it('keeps infantry mount-state height changes aligned between browser projection and commit validation', () => {
    const [mountedProjection, dismountedProjection] =
      tacticalMapInfantryMountStateMovementRange;
    const [mountedInput, dismountedInput] =
      tacticalMapInfantryMountStateCommitInputs();

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

    const mountedResult = validateCommittedMovement(mountedInput);

    expect(mountedResult.valid).toBe(false);
    if (mountedResult.valid) {
      throw new Error('Expected mounted infantry height to block clearance');
    }
    expect(mountedResult.reason).toBe(mountedProjection.movementInvalidReason);
    expect(mountedResult.details).toBe(
      mountedProjection.movementInvalidDetails,
    );
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

    const dismountedResult = validateCommittedMovement(dismountedInput);

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
    const projection = tacticalMapOccupiedDestinationMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapOccupiedDestinationCommitInput(),
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
    const mekProjection = tacticalMapQuadveeMekMovementRange[0];
    const vehicleProjection = tacticalMapQuadveeVehicleMovementRange[0];

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
    expect(tacticalMapQuadveeMekMpLegend).toMatchObject({
      movementMode: 'walk',
      jumpMP: 3,
      jumpAvailable: true,
    });

    const mekResult = validateCommittedMovement(
      tacticalMapQuadveeMekCommitInput(),
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
    expect(tacticalMapQuadveeVehicleMpLegend).toMatchObject({
      movementMode: 'tracked',
      jumpMP: 0,
      jumpAvailable: false,
    });

    const vehicleResult = validateCommittedMovement(
      tacticalMapQuadveeVehicleCommitInput(),
    );

    expect(vehicleResult.valid).toBe(false);
    if (vehicleResult.valid) {
      throw new Error('Expected QuadVee vehicle-mode climb to be blocked');
    }
    expect(vehicleResult.reason).toBe(vehicleProjection.movementInvalidReason);
    expect(vehicleResult.details).toBe(
      vehicleProjection.movementInvalidDetails,
    );
    expect(vehicleResult.mpCost).toBe(vehicleProjection.mpCost);
    expect(vehicleResult.heatGenerated).toBe(vehicleProjection.heatGenerated);
  });

  it('keeps LAM AirMek runtime conversion mode aligned between browser projection and commit validation', () => {
    const mekProjection = tacticalMapLamMekMovementRange[0];
    const airMekProjection = tacticalMapLamAirMekMovementRange[0];

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
    expect(tacticalMapLamMekMpLegend).toMatchObject({
      movementMode: 'walk',
      walkMP: 4,
      runMP: 6,
      jumpMP: 2,
      jumpAvailable: true,
    });

    const mekResult = validateCommittedMovement(tacticalMapLamMekCommitInput());

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
    expect(tacticalMapLamAirMekMpLegend).toMatchObject({
      movementMode: 'wige',
      walkMP: 6,
      runMP: 9,
      jumpMP: 2,
      jumpAvailable: true,
    });

    const airMekResult = validateCommittedMovement(
      tacticalMapLamAirMekCommitInput(),
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
    const airMekProjection = tacticalMapLamAirMekLongCruiseMovementRange[0];

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

    const airMekResult = validateCommittedMovement(
      tacticalMapLamAirMekLongCruiseCommitInput(),
    );

    expect(airMekResult.valid).toBe(true);
    if (!airMekResult.valid) {
      throw new Error(airMekResult.details);
    }
    expect(airMekResult.mpCost).toBe(airMekProjection.mpCost);
    expect(airMekResult.heatGenerated).toBe(airMekProjection.heatGenerated);
    expect(airMekResult.path).toEqual(airMekProjection.path);
  });

  it('keeps grounded LAM Fighter runtime conversion mode aligned between browser projection and commit validation', () => {
    const fighterProjection = tacticalMapLamFighterMovementRange[0];

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
    expect(tacticalMapLamFighterMpLegend).toMatchObject({
      movementMode: 'wheeled',
      walkMP: 1,
      runMP: 1,
      jumpMP: 0,
      jumpAvailable: false,
    });

    const fighterResult = validateCommittedMovement(
      tacticalMapLamFighterCommitInput(),
    );

    expect(fighterResult.valid).toBe(false);
    if (fighterResult.valid) {
      throw new Error('Expected grounded LAM Fighter climb to be blocked');
    }
    expect(fighterResult.reason).toBe(fighterProjection.movementInvalidReason);
    expect(fighterResult.details).toBe(
      fighterProjection.movementInvalidDetails,
    );
    expect(fighterResult.mpCost).toBe(fighterProjection.mpCost);
    expect(fighterResult.heatGenerated).toBe(fighterProjection.heatGenerated);
  });

  it('keeps airborne LAM Fighter ground movement blocked between browser projection and commit validation', () => {
    const fighterProjection = tacticalMapLamAirborneFighterMovementRange[0];

    expect(fighterProjection).toMatchObject({
      hex: { q: 1, r: 0 },
      reachable: false,
      mpCost: Infinity,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementMode: 'walk',
      movementType: 'walk',
      blockedReason: AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON,
    });
    expect(tacticalMapLamAirborneFighterMpLegend).toMatchObject({
      movementMode: 'walk',
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
      jumpAvailable: false,
    });

    const fighterResult = validateCommittedMovement(
      tacticalMapLamAirborneFighterCommitInput(),
    );

    expect(fighterResult.valid).toBe(false);
    if (fighterResult.valid) {
      throw new Error('Expected airborne LAM Fighter movement to be blocked');
    }
    expect(fighterResult.reason).toBe(fighterProjection.movementInvalidReason);
    expect(fighterResult.details).toBe(
      fighterProjection.movementInvalidDetails,
    );
    expect(fighterResult.mpCost).toBe(fighterProjection.mpCost);
    expect(fighterResult.heatGenerated).toBe(fighterProjection.heatGenerated);
  });

  it('keeps airborne LAM AirMek ground movement blocked between browser projection and commit validation', () => {
    const airMekProjection = tacticalMapLamAirborneAirMekMovementRange[0];

    expect(airMekProjection).toMatchObject({
      hex: { q: 1, r: 0 },
      reachable: false,
      mpCost: Infinity,
      terrainCost: 0,
      elevationCost: 0,
      heatGenerated: 0,
      movementMode: 'wige',
      movementType: 'walk',
      blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails:
        AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
    });
    expect(tacticalMapLamAirborneAirMekMpLegend).toMatchObject({
      movementMode: 'wige',
      walkMP: 6,
      runMP: 9,
      jumpMP: 2,
      jumpAvailable: true,
    });

    const airMekResult = validateCommittedMovement(
      tacticalMapLamAirborneAirMekCommitInput(),
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
    const projection = tacticalMapRunWaterFallbackMovementRange[0];

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

    const commitInput = tacticalMapRunWaterFallbackCommitInput();
    expect(commitInput.movementType).toBe(projection.movementType);
    expect(commitInput.path).toEqual(projection.path);

    const result = validateCommittedMovement(commitInput);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.details);
    }

    expect(result.mpCost).toBe(projection.mpCost);
    expect(result.heatGenerated).toBe(projection.heatGenerated);
    expect(result.path).toEqual(projection.path);
  });

  it('keeps tracked vehicle abrupt elevation blocked between browser projection and commit validation', () => {
    const projection = tacticalMapTrackedElevationMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapTrackedElevationCommitInput(),
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

  it('keeps hover water crossing legal between browser projection and commit validation', () => {
    const projection = tacticalMapHoverWaterMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapHoverWaterCommitInput(),
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
    const projection = tacticalMapSwimMovementRange[0];

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

    const result = validateCommittedMovement(tacticalMapSwimCommitInput());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.details);
    }

    expect(result.mpCost).toBe(projection.mpCost);
    expect(result.heatGenerated).toBe(projection.heatGenerated);
    expect(result.path).toEqual(projection.path);
  });

  it('keeps Frogman deep-water movement legal between browser projection and commit validation', () => {
    const projection = tacticalMapFrogmanMovementRange[0];

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

    const result = validateCommittedMovement(tacticalMapFrogmanCommitInput());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.details);
    }

    expect(result.mpCost).toBe(projection.mpCost);
    expect(result.heatGenerated).toBe(projection.heatGenerated);
    expect(result.path).toEqual(projection.path);
  });

  it('keeps TacOps battlefield wreck rough terrain aligned with commit validation', () => {
    expect(tacticalMapBattlefieldWreckHexTerrain).toMatchObject([
      {
        coordinate: { q: 1, r: 0 },
        elevation: 0,
        features: [{ type: 'rough', level: 1 }],
      },
    ]);

    const projection = tacticalMapBattlefieldWreckMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapBattlefieldWreckCommitInput(),
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
    const projection = tacticalMapStandUpMovementRange[0];

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

    const result = validateCommittedMovement(tacticalMapStandUpCommitInput());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error(result.details);
    }

    expect(result.mpCost).toBe(projection.mpCost);
    expect(result.heatGenerated).toBe(projection.heatGenerated);
    expect(result.path).toEqual(projection.path);
  });

  it('projects impossible stand-up reasons for the browser harness', () => {
    const reason = 'Cannot stand with a destroyed leg and both arms destroyed';
    const projection = tacticalMapImpossibleStandUpMovementRange[0];

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
    const projection = tacticalMapNavalLandfallMovementRange[0];

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

    const result = validateCommittedMovement(
      tacticalMapNavalLandfallCommitInput(),
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
});
