import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  GameSide,
  IGameSession,
  IGameUnit,
  IHex,
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
} from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement';
import { projectStandUpPsr } from '@/utils/gameplay/standUpRules';

export interface SelectedUnitModel {
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitMapHex: IHex | null;
  readonly selectedUnitInfo: {
    readonly name: string;
    readonly side: GameSide;
  } | null;
  readonly selectedUnitFromSession: IGameUnit | null;
}

export function buildMovementProjectionByHex(
  movementRange: readonly IMovementRangeHex[],
  hoverMovementInfo: IMovementRangeHex | undefined,
): Record<string, IMovementRangeHex> {
  const byHex: Record<string, IMovementRangeHex> = {};
  for (const projection of movementRange) {
    byHex[coordToKey(projection.hex)] = projection;
  }
  if (hoverMovementInfo) {
    byHex[coordToKey(hoverMovementInfo.hex)] = hoverMovementInfo;
  }
  return byHex;
}

export function buildSelectedUnitModel({
  currentState,
  selectedUnitId,
  unitInfoLookup,
  units,
  combatGrid,
}: {
  readonly currentState: IGameSession['currentState'];
  readonly selectedUnitId: string | null;
  readonly unitInfoLookup: Record<
    string,
    { readonly name: string; readonly side: GameSide }
  >;
  readonly units: IGameSession['units'];
  readonly combatGrid: IHexGrid | null;
}): SelectedUnitModel {
  const selectedUnit = selectedUnitId
    ? currentState.units[selectedUnitId]
    : null;
  const selectedUnitMapHex =
    combatGrid && selectedUnit
      ? (combatGrid.hexes.get(coordToKey(selectedUnit.position)) ?? null)
      : null;

  return {
    selectedUnit,
    selectedUnitMapHex,
    selectedUnitInfo: selectedUnitId ? unitInfoLookup[selectedUnitId] : null,
    selectedUnitFromSession: selectedUnitId
      ? (units.find((unit) => unit.id === selectedUnitId) ?? null)
      : null,
  };
}

export function resolveSelectedMovementCapability({
  interactiveSession,
  selectedUnit,
  selectedUnitId,
}: {
  readonly interactiveSession: InteractiveSession | undefined;
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitId: string | null;
}): IMovementCapability | null {
  if (!interactiveSession || !selectedUnitId) return null;
  const capability = interactiveSession.getMovementCapability(selectedUnitId);
  if (!capability || !selectedUnit) return capability;
  return (
    resolveRuntimeMovementCapability(selectedUnit, capability) ?? capability
  );
}

export function resolveSelectedStandUpImpossibleReason({
  selectedUnit,
  selectedUnitFromSession,
}: {
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitFromSession: IGameUnit | null;
}): string | undefined {
  if (!selectedUnit?.prone) return undefined;
  return projectStandUpPsr({
    unitState: selectedUnit,
    unitPiloting: selectedUnit.piloting,
    unitType: selectedUnitFromSession?.unitType,
  }).impossibleReason;
}
