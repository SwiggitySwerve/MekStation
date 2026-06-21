import type { IMovementRangeHex, MovementTravelMode } from '@/types/gameplay';
import type {
  ICommittedMovementValidationInput,
  CommittedMovementValidationResult,
} from '@/utils/gameplay/movement/commitValidation';

import * as movementScenario from '@/testing/__tests__/tactical-map.movement-scenarios.test-context';

type MovementAgreementCase = {
  readonly label: string;
  readonly projections: readonly IMovementRangeHex[];
  readonly inputs: () => readonly ICommittedMovementValidationInput[];
};

const ALL_AGREEMENT_MODES = [
  'walk',
  'run',
  'jump',
  'tracked',
  'wheeled',
  'hover',
  'vtol',
  'naval',
  'hydrofoil',
  'submarine',
  'umu',
  'biped_swim',
  'quad_swim',
  'wige',
  'rail',
  'maglev',
] as const satisfies readonly MovementTravelMode[];

const EXPECTED_COVERED_AGREEMENT_MODES = [
  'biped_swim',
  'hover',
  'jump',
  'naval',
  'run',
  'tracked',
  'vtol',
  'walk',
  'wheeled',
  'wige',
] as const satisfies readonly MovementTravelMode[];

export const UNSUPPORTED_AGREEMENT_MODES = [
  'hydrofoil',
  'maglev',
  'quad_swim',
  'rail',
  'submarine',
  'umu',
] as const satisfies readonly MovementTravelMode[];

const MOVEMENT_AGREEMENT_CASES: readonly MovementAgreementCase[] = [
  {
    label: 'biped walk run and jump browser options',
    projections: movementScenario.tacticalMapBipedOptionMovementRange,
    inputs: movementScenario.tacticalMapBipedOptionCommitInputs,
  },
  singleProjectionCase(
    'jump elevation',
    movementScenario.tacticalMapJumpElevationMovementRange,
    movementScenario.tacticalMapJumpElevationCommitInput,
  ),
  singleProjectionCase(
    'VTOL elevation',
    movementScenario.tacticalMapVtolElevationMovementRange,
    movementScenario.tacticalMapVtolElevationCommitInput,
  ),
  singleProjectionCase(
    'runtime-height bridge clearance',
    movementScenario.tacticalMapRuntimeHeightMovementRange,
    movementScenario.tacticalMapRuntimeHeightCommitInput,
  ),
  {
    label: 'infantry mount-state height changes',
    projections: movementScenario.tacticalMapInfantryMountStateMovementRange,
    inputs: movementScenario.tacticalMapInfantryMountStateCommitInputs,
  },
  singleProjectionCase(
    'occupied destination walk',
    movementScenario.tacticalMapOccupiedDestinationMovementRange,
    movementScenario.tacticalMapOccupiedDestinationCommitInput,
  ),
  singleProjectionCase(
    'occupied destination jump',
    movementScenario.tacticalMapOccupiedDestinationJumpMovementRange,
    movementScenario.tacticalMapOccupiedDestinationJumpCommitInput,
  ),
  singleProjectionCase(
    'QuadVee Mek mode',
    movementScenario.tacticalMapQuadveeMekMovementRange,
    movementScenario.tacticalMapQuadveeMekCommitInput,
  ),
  singleProjectionCase(
    'QuadVee vehicle mode',
    movementScenario.tacticalMapQuadveeVehicleMovementRange,
    movementScenario.tacticalMapQuadveeVehicleCommitInput,
  ),
  singleProjectionCase(
    'LAM Mek mode',
    movementScenario.tacticalMapLamMekMovementRange,
    movementScenario.tacticalMapLamMekCommitInput,
  ),
  singleProjectionCase(
    'LAM AirMek mode',
    movementScenario.tacticalMapLamAirMekMovementRange,
    movementScenario.tacticalMapLamAirMekCommitInput,
  ),
  singleProjectionCase(
    'LAM AirMek long cruise',
    movementScenario.tacticalMapLamAirMekLongCruiseMovementRange,
    movementScenario.tacticalMapLamAirMekLongCruiseCommitInput,
  ),
  singleProjectionCase(
    'grounded LAM Fighter mode',
    movementScenario.tacticalMapLamFighterMovementRange,
    movementScenario.tacticalMapLamFighterCommitInput,
  ),
  singleProjectionCase(
    'airborne LAM Fighter ground movement',
    movementScenario.tacticalMapLamAirborneFighterMovementRange,
    movementScenario.tacticalMapLamAirborneFighterCommitInput,
  ),
  singleProjectionCase(
    'airborne LAM AirMek ground movement',
    movementScenario.tacticalMapLamAirborneAirMekMovementRange,
    movementScenario.tacticalMapLamAirborneAirMekCommitInput,
  ),
  singleProjectionCase(
    'run-selected water fallback',
    movementScenario.tacticalMapRunWaterFallbackMovementRange,
    movementScenario.tacticalMapRunWaterFallbackCommitInput,
  ),
  singleProjectionCase(
    'tracked vehicle elevation block',
    movementScenario.tacticalMapTrackedElevationMovementRange,
    movementScenario.tacticalMapTrackedElevationCommitInput,
  ),
  singleProjectionCase(
    'hover water crossing',
    movementScenario.tacticalMapHoverWaterMovementRange,
    movementScenario.tacticalMapHoverWaterCommitInput,
  ),
  singleProjectionCase(
    'Mek swim elevation movement',
    movementScenario.tacticalMapSwimMovementRange,
    movementScenario.tacticalMapSwimCommitInput,
  ),
  singleProjectionCase(
    'Frogman deep-water movement',
    movementScenario.tacticalMapFrogmanMovementRange,
    movementScenario.tacticalMapFrogmanCommitInput,
  ),
  singleProjectionCase(
    'TacOps battlefield wreck rough terrain',
    movementScenario.tacticalMapBattlefieldWreckMovementRange,
    movementScenario.tacticalMapBattlefieldWreckCommitInput,
  ),
  singleProjectionCase(
    'prone stand-up movement',
    movementScenario.tacticalMapStandUpMovementRange,
    movementScenario.tacticalMapStandUpCommitInput,
  ),
  singleProjectionCase(
    'naval landfall',
    movementScenario.tacticalMapNavalLandfallMovementRange,
    movementScenario.tacticalMapNavalLandfallCommitInput,
  ),
];

describe('InteractiveSession movement projection agreement', () => {
  it.each(expandedAgreementCases())(
    'keeps %s aligned between projection and committed validation',
    (_caseLabel, projection, input) => {
      assertProjectionDescribesAgreementFields(projection);
      const result = movementScenario.validateCommittedMovement(input);

      expect(input.to).toEqual(projection.hex);
      expect(input.movementType).toBe(projection.movementType);
      assertNoValidatorDisagreement(result);

      if (projection.reachable) {
        assertReachableProjectionAgreement(projection, result);
        return;
      }

      assertBlockedProjectionAgreement(projection, result);
    },
  );

  it('keeps represented and unsupported agreement modes explicit', () => {
    expect(coveredAgreementModes()).toEqual(EXPECTED_COVERED_AGREEMENT_MODES);
    expect(
      [...EXPECTED_COVERED_AGREEMENT_MODES, ...UNSUPPORTED_AGREEMENT_MODES]
        .slice()
        .sort(),
    ).toEqual([...ALL_AGREEMENT_MODES].sort());
  });
});

function singleProjectionCase(
  label: string,
  projections: readonly IMovementRangeHex[],
  input: () => ICommittedMovementValidationInput,
): MovementAgreementCase {
  return {
    label,
    projections,
    inputs: () => [input()],
  };
}

function expandedAgreementCases(): ReadonlyArray<
  readonly [string, IMovementRangeHex, ICommittedMovementValidationInput]
> {
  return MOVEMENT_AGREEMENT_CASES.flatMap((agreementCase) => {
    const inputs = agreementCase.inputs();
    expect(inputs).toHaveLength(agreementCase.projections.length);

    return agreementCase.projections.map((projection, index) => [
      `${agreementCase.label} [${projection.movementMode ?? projection.movementType}]`,
      projection,
      inputs[index],
    ]);
  });
}

function coveredAgreementModes(): readonly MovementTravelMode[] {
  return Array.from(
    new Set(
      MOVEMENT_AGREEMENT_CASES.flatMap((agreementCase) =>
        agreementCase.projections.map(
          (projection) =>
            (projection.movementMode ??
              projection.movementType) as MovementTravelMode,
        ),
      ),
    ),
  ).sort();
}

function assertProjectionDescribesAgreementFields(
  projection: IMovementRangeHex,
): void {
  expect(projection.mpCost).toEqual(expect.any(Number));
  expect(projection.heatGenerated ?? 0).toEqual(expect.any(Number));
  if (projection.terrainCost !== undefined) {
    expect(projection.terrainCost).toEqual(expect.any(Number));
  }
  if (projection.elevationDelta !== undefined) {
    expect(projection.elevationDelta).toEqual(expect.any(Number));
  }
  if (projection.elevationCost !== undefined) {
    expect(projection.elevationCost).toEqual(expect.any(Number));
  }
}

function assertNoValidatorDisagreement(
  result: CommittedMovementValidationResult,
): void {
  if (result.valid) {
    expect(result.validatorDisagreement).toBeUndefined();
  }
}

function assertReachableProjectionAgreement(
  projection: IMovementRangeHex,
  result: CommittedMovementValidationResult,
): void {
  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error(result.details);
  }

  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  if (projection.path !== undefined) {
    expect(result.path).toEqual(projection.path);
  }
}

function assertBlockedProjectionAgreement(
  projection: IMovementRangeHex,
  result: CommittedMovementValidationResult,
): void {
  expect(result.valid).toBe(false);
  if (result.valid) {
    throw new Error('Expected movement projection to be blocked');
  }

  expect(result.reason).toBe(projection.movementInvalidReason);
  expect(result.details).toBe(projection.movementInvalidDetails);
  expect(result.mpCost).toBe(projection.mpCost);
  expect(result.heatGenerated).toBe(projection.heatGenerated);
  if (projection.blockedReason !== undefined) {
    expect(result.details).toBe(projection.blockedReason);
  }
}
