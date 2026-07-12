import type { MapMovementKind } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type { MapMovementPointLegendState } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';
import type {
  IGameState,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  combatOnlyScenarios,
  combatStateByScenario,
  selectedWeaponIdsByScenario,
  targetUnitIdByScenario,
} from './tactical-map.e2e-harness-combat-config';
import {
  hexTerrainByScenario,
  mapRadiusByScenario,
  movementFixtureScenarios,
  movementRangeByScenario,
  mpLegendByScenario,
  selectedHexByScenario,
  tokensByScenario,
} from './tactical-map.e2e-harness-map-config';
import { tacticalMapUnitWeaponsForE2EScenario } from './tactical-map.e2e-unit-weapons';
import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapHighlightPath,
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
} from './tactical-map.fixtures';
import { tacticalMapIndirectFireHarnessScenarios as indirectFireHarnessScenarios } from './tactical-map.indirect-fire-harness';
import * as mixedVehicle from './tactical-map.mixed-vehicle-volley-scenario';
import * as movement from './tactical-map.movement-scenarios';

type IndirectFireHarnessScenario =
  (typeof indirectFireHarnessScenarios)[keyof typeof indirectFireHarnessScenarios];
type MixedVehicleHarnessScenario =
  (typeof mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios)[keyof typeof mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios];
type TacticalMapHarnessScenario =
  | IndirectFireHarnessScenario
  | MixedVehicleHarnessScenario;

interface TacticalMapE2EHarnessConfig {
  readonly mapRadius: number;
  readonly tokens: readonly IUnitToken[];
  readonly selectedHex: IHexCoordinate;
  readonly targetUnitId: string | null;
  readonly hexTerrain: readonly IHexTerrain[];
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly combatState: IGameState;
  readonly selectedWeaponIds: readonly string[];
  readonly movementRange: readonly IMovementRangeHex[] | undefined;
  readonly highlightPath: readonly IHexCoordinate[] | undefined;
  readonly mpLegend: MapMovementPointLegendState | undefined;
}

function scenarioValue<T>(
  scenario: string,
  values: Partial<Record<string, T>>,
  fallback: T,
): T {
  return Object.prototype.hasOwnProperty.call(values, scenario)
    ? values[scenario]!
    : fallback;
}

function tacticalMapHarnessScenario(
  scenario: string,
): TacticalMapHarnessScenario | undefined {
  if (scenario in indirectFireHarnessScenarios) {
    return indirectFireHarnessScenarios[
      scenario as keyof typeof indirectFireHarnessScenarios
    ];
  }

  if (scenario in mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios) {
    return mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios[
      scenario as keyof typeof mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios
    ];
  }

  return undefined;
}

function harnessUnitWeaponsFor(
  harnessScenario: TacticalMapHarnessScenario | undefined,
) {
  return harnessScenario && 'unitWeapons' in harnessScenario
    ? harnessScenario.unitWeapons
    : undefined;
}

function targetUnitIdFor(
  scenario: string,
  harnessScenario: TacticalMapHarnessScenario | undefined,
  isMovementFixtureScenario: boolean,
): string | null {
  if (isMovementFixtureScenario) return null;
  return (
    harnessScenario?.targetUnitId ??
    scenarioValue(scenario, targetUnitIdByScenario, 'occluded')
  );
}

function movementRangeFor(
  scenario: string,
  legendMode: MapMovementKind,
  isCombatOnlyScenario: boolean,
) {
  if (scenario === 'legend-mode-selection') {
    return movement.tacticalMapLegendSelectionMovementRangeByMode[legendMode];
  }
  if (isCombatOnlyScenario) return undefined;
  return scenarioValue(
    scenario,
    movementRangeByScenario,
    tacticalMapMovementRange,
  );
}

function mpLegendFor(
  scenario: string,
  legendMode: MapMovementKind,
  isCombatOnlyScenario: boolean,
) {
  if (scenario === 'legend-mode-selection') {
    return movement.tacticalMapLegendSelectionMpLegend(legendMode);
  }
  if (isCombatOnlyScenario) return undefined;
  return scenarioValue(scenario, mpLegendByScenario, tacticalMapMpLegend);
}

function highlightPathFor(
  isCombatOnlyScenario: boolean,
  isMovementFixtureScenario: boolean,
) {
  return isCombatOnlyScenario || isMovementFixtureScenario
    ? undefined
    : tacticalMapHighlightPath;
}

export function resolveTacticalMapE2EHarnessConfig(
  scenario: string,
  legendMode: MapMovementKind,
): TacticalMapE2EHarnessConfig {
  const harnessScenario = tacticalMapHarnessScenario(scenario);
  const isCombatOnlyScenario = combatOnlyScenarios.has(scenario);
  const isMovementFixtureScenario = movementFixtureScenarios.has(scenario);

  return {
    mapRadius: scenarioValue(scenario, mapRadiusByScenario, 3),
    tokens:
      harnessScenario?.tokens ??
      scenarioValue(scenario, tokensByScenario, tacticalMapTokens),
    selectedHex:
      harnessScenario?.selectedHex ??
      scenarioValue(
        scenario,
        selectedHexByScenario,
        isCombatOnlyScenario ? { q: 0, r: 0 } : { q: -1, r: 0 },
      ),
    targetUnitId: targetUnitIdFor(
      scenario,
      harnessScenario,
      isMovementFixtureScenario,
    ),
    hexTerrain:
      harnessScenario?.hexTerrain ??
      scenarioValue(scenario, hexTerrainByScenario, tacticalMapHexTerrain),
    unitWeapons:
      harnessUnitWeaponsFor(harnessScenario) ??
      tacticalMapUnitWeaponsForE2EScenario(scenario),
    combatState:
      harnessScenario?.combatState ??
      scenarioValue(scenario, combatStateByScenario, tacticalMapCombatState),
    selectedWeaponIds:
      harnessScenario?.selectedWeaponIds ??
      scenarioValue(
        scenario,
        selectedWeaponIdsByScenario,
        tacticalMapSelectedWeaponIds,
      ),
    movementRange: movementRangeFor(scenario, legendMode, isCombatOnlyScenario),
    highlightPath: highlightPathFor(
      isCombatOnlyScenario,
      isMovementFixtureScenario,
    ),
    mpLegend: mpLegendFor(scenario, legendMode, isCombatOnlyScenario),
  };
}
