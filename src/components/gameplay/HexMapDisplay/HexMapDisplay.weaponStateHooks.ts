import { useMemo } from 'react';

import type {
  IGameState,
  IHexCoordinate,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';
import { isOperationalWeaponStatus } from '@/utils/gameplay/combatProjection';
import { selectCombatProjectionWeapons } from '@/utils/gameplay/combatProjection.weaponSelection';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { representedWeaponMountArcs } from '@/utils/gameplay/weaponMountArcs';
import {
  firingArcToUiArc,
  type UiFiringArc,
} from '@/utils/overlays/arcClassifier';

export interface SelectedCombatProjectionState {
  readonly hasConfiguredWeaponList: boolean;
  readonly isWeaponCombatProjectionEnabled: boolean;
  readonly operationalWeapons: readonly IWeaponStatus[];
  readonly projectedCombatWeapons: readonly IWeaponStatus[];
  readonly selectedUnitWeapons: readonly IWeaponStatus[];
}

export function useSelectedCombatProjectionState({
  combatState,
  selectedToken,
  selectedWeaponIds,
  unitWeapons,
}: {
  readonly combatState?: IGameState | null;
  readonly selectedToken: IUnitToken | null;
  readonly selectedWeaponIds: readonly string[];
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
}): SelectedCombatProjectionState {
  const selectedUnitWeapons = useMemo(() => {
    if (!selectedToken) return [];
    return unitWeapons[selectedToken.unitId] ?? [];
  }, [selectedToken, unitWeapons]);
  const projectedCombatWeapons = useMemo(
    () => selectCombatProjectionWeapons(selectedUnitWeapons, selectedWeaponIds),
    [selectedUnitWeapons, selectedWeaponIds],
  );
  const hasConfiguredWeaponList =
    selectedToken !== null &&
    Object.prototype.hasOwnProperty.call(unitWeapons, selectedToken.unitId);
  const isWeaponCombatProjectionEnabled =
    hasConfiguredWeaponList &&
    (combatState === null ||
      combatState === undefined ||
      combatState.phase === GamePhase.WeaponAttack);
  const operationalWeapons = useMemo(
    () => projectedCombatWeapons.filter(isOperationalWeaponStatus),
    [projectedCombatWeapons],
  );

  return useMemo(
    () => ({
      hasConfiguredWeaponList,
      isWeaponCombatProjectionEnabled,
      operationalWeapons,
      projectedCombatWeapons,
      selectedUnitWeapons,
    }),
    [
      hasConfiguredWeaponList,
      isWeaponCombatProjectionEnabled,
      operationalWeapons,
      projectedCombatWeapons,
      selectedUnitWeapons,
    ],
  );
}

export function useSelectedWeaponMaxRange({
  hasConfiguredWeaponList,
  operationalWeapons,
  selectedUnitPosition,
  attackRange,
  radius,
}: {
  readonly hasConfiguredWeaponList: boolean;
  readonly operationalWeapons: readonly IWeaponStatus[];
  readonly selectedUnitPosition: IHexCoordinate | null;
  readonly attackRange: readonly IHexCoordinate[];
  readonly radius: number;
}): number {
  return useMemo(() => {
    if (hasConfiguredWeaponList) {
      if (operationalWeapons.length === 0) return radius;
      return Math.max(
        0,
        ...operationalWeapons.map((weapon) =>
          Math.max(weapon.ranges.long, weapon.ranges.extreme ?? 0),
        ),
      );
    }
    if (!selectedUnitPosition || attackRange.length === 0) return radius;
    return Math.max(
      0,
      ...attackRange.map((hex) => hexDistance(selectedUnitPosition, hex)),
    );
  }, [
    attackRange,
    hasConfiguredWeaponList,
    operationalWeapons,
    radius,
    selectedUnitPosition,
  ]);
}

export function useSelectedWeaponVisibleFiringArcs({
  hasConfiguredWeaponList,
  operationalWeapons,
}: {
  readonly hasConfiguredWeaponList: boolean;
  readonly operationalWeapons: readonly IWeaponStatus[];
}): readonly UiFiringArc[] | undefined {
  return useMemo(() => {
    if (!hasConfiguredWeaponList) return undefined;
    if (operationalWeapons.length === 0) return [];
    if (
      operationalWeapons.some(
        (weapon) => representedWeaponMountArcs(weapon) === undefined,
      )
    ) {
      return undefined;
    }

    const arcs = new Set<UiFiringArc>();
    for (const weapon of operationalWeapons) {
      for (const arc of representedWeaponMountArcs(weapon) ?? []) {
        arcs.add(firingArcToUiArc(arc));
      }
    }
    return Array.from(arcs);
  }, [hasConfiguredWeaponList, operationalWeapons]);
}
