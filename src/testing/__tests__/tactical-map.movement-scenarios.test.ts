import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';

import {
  tacticalMapBipedOptionCommitInputs,
  tacticalMapBipedOptionMovementRange,
  tacticalMapJumpElevationCommitInput,
  tacticalMapJumpElevationMovementRange,
  tacticalMapRuntimeHeightCommitInput,
  tacticalMapRuntimeHeightMovementRange,
  tacticalMapVtolElevationCommitInput,
  tacticalMapVtolElevationMovementRange,
} from '../tactical-map.movement-scenarios';
import {
  tacticalMapRunWaterFallbackCommitInput,
  tacticalMapRunWaterFallbackMovementRange,
} from '../tactical-map.run-water-fallback-scenario';
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
});
