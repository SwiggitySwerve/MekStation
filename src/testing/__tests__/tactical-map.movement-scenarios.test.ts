import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';

import {
  tacticalMapBipedOptionCommitInputs,
  tacticalMapBipedOptionMovementRange,
  tacticalMapJumpElevationCommitInput,
  tacticalMapJumpElevationMovementRange,
  tacticalMapVtolElevationCommitInput,
  tacticalMapVtolElevationMovementRange,
} from '../tactical-map.movement-scenarios';

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
});
