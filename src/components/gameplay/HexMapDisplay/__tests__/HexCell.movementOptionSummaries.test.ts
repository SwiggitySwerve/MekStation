import type { IMovementRangeModeOption } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import {
  formatMovementModeLabel,
  formatMovementModeTitleLabel,
  formatMovementOptionTitle,
  formatMovementTypeLabel,
  movementOptionAltitudeControlMpCostsAttribute,
  movementOptionAltitudeControlStepCountsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionConversionMpCostsAttribute,
  movementOptionConversionStepCountsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionHeatGeneratedAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionTerrainCostsAttribute,
} from '../HexCell.movementOptionSummaries';

describe('HexCell movement option summaries', () => {
  it('formats movement type and mode labels from lookup data', () => {
    expect(formatMovementTypeLabel(MovementType.Walk)).toBe('W');
    expect(formatMovementTypeLabel(MovementType.Run)).toBe('R');
    expect(formatMovementTypeLabel(MovementType.Sprint)).toBe('SPR');
    expect(formatMovementTypeLabel(MovementType.Evade)).toBe('EVD');
    expect(formatMovementTypeLabel(MovementType.Jump)).toBe('J');
    expect(formatMovementTypeLabel(MovementType.Stationary)).toBe('S');

    expect(formatMovementModeLabel('tracked')).toBe('TRK');
    expect(formatMovementModeLabel('wheeled')).toBe('WHL');
    expect(formatMovementModeLabel('hover')).toBe('HOV');
    expect(formatMovementModeLabel('vtol')).toBe('VTOL');
    expect(formatMovementModeLabel('naval')).toBe('NAV');
    expect(formatMovementModeLabel('hydrofoil')).toBe('HYD');
    expect(formatMovementModeLabel('submarine')).toBe('SUB');
    expect(formatMovementModeLabel('umu')).toBe('UMU');
    expect(formatMovementModeLabel('biped_swim')).toBe('BSW');
    expect(formatMovementModeLabel('quad_swim')).toBe('QSW');
    expect(formatMovementModeLabel('wige')).toBe('WiGE');
    expect(formatMovementModeLabel('rail')).toBe('RAIL');
    expect(formatMovementModeLabel('maglev')).toBe('MAG');
    expect(formatMovementModeLabel('unknown')).toBeNull();
    expect(formatMovementModeLabel(undefined)).toBeNull();

    expect(formatMovementModeTitleLabel('vtol')).toBe('VTOL');
    expect(formatMovementModeTitleLabel('wige')).toBe('WiGE');
    expect(formatMovementModeTitleLabel('umu')).toBe('UMU');
    expect(formatMovementModeTitleLabel('biped_swim')).toBe('biped swim');
    expect(formatMovementModeTitleLabel('quad_swim')).toBe('quad swim');
    expect(formatMovementModeTitleLabel('unknown_mode')).toBe('unknown mode');
  });

  it('preserves detailed movement option title strings', () => {
    const option: IMovementRangeModeOption = {
      movementType: MovementType.Run,
      movementMode: 'wige',
      reachable: false,
      mpCost: Infinity,
      terrainCost: 2,
      elevationDelta: -1,
      elevationCost: 1,
      heatGenerated: 3,
      conversionStepCount: 1,
      conversionMpCost: 1,
      altitudeControlStepCount: 2,
      altitudeControlMpCost: 2,
      altitudeControlRequired: true,
      altitudeControlMode: 'wige',
      altitudeControlAltitude: 5,
      automaticLandingRequired: true,
      automaticLandingMode: 'wige',
      automaticLandingDistance: 2,
      automaticLandingMinimumDistance: 3,
      automaticLandingReason: 'must stay airborne',
      movementInvalidDetails: 'cannot stop here',
    };

    expect(formatMovementOptionTitle(option)).toBe(
      'run via WiGE blocked X MP, terrain +2, elevation delta -1 cost +1, conversion 1 step 1 MP, altitude control 2 steps 2 MP, WiGE altitude 5 uses altitude controls, automatic WiGE landing 2/3 hexes: must stay airborne, heat +3, blocked: cannot stop here',
    );
  });

  it('preserves movement option attribute summaries including zero costs', () => {
    const options: readonly IMovementRangeModeOption[] = [
      {
        movementType: MovementType.Walk,
        reachable: true,
        mpCost: 1,
        terrainCost: 0,
        heatGenerated: 0,
        conversionStepCount: 0,
        altitudeControlMpCost: 0,
        movementInvalidDetails: '',
      },
      {
        movementType: MovementType.Run,
        reachable: false,
        mpCost: 2,
        terrainCost: 2,
        elevationDelta: -1,
        elevationCost: 0,
        heatGenerated: 3,
        conversionStepCount: 2,
        conversionMpCost: 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 2,
        movementInvalidDetails: 'blocked by woods',
      },
    ];

    expect(movementOptionTerrainCostsAttribute(options)).toBe('walk:0|run:2');
    expect(movementOptionElevationDeltasAttribute(options)).toBe('run:-1');
    expect(movementOptionElevationCostsAttribute(options)).toBe('run:0');
    expect(movementOptionHeatGeneratedAttribute(options)).toBe('walk:0|run:3');
    expect(movementOptionConversionStepCountsAttribute(options)).toBe(
      'walk:0|run:2',
    );
    expect(movementOptionConversionMpCostsAttribute(options)).toBe('run:1');
    expect(movementOptionAltitudeControlStepCountsAttribute(options)).toBe(
      'run:1',
    );
    expect(movementOptionAltitudeControlMpCostsAttribute(options)).toBe(
      'walk:0|run:2',
    );
    expect(movementOptionInvalidDetailsAttribute(options)).toBe(
      'run:blocked by woods',
    );
    expect(movementOptionBlockedReasonsAttribute(options)).toBe(
      'run:blocked by woods',
    );
  });
});
