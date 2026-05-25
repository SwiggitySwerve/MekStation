import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';

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
