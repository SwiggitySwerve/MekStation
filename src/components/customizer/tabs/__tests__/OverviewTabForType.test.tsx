/**
 * OverviewTabForType — Overview dispatch test.
 *
 * `OverviewTabForType` resolves the Overview component for a `UnitType` through
 * the descriptor registry. These tests assert the dispatch wiring: mech types
 * route to the mech `OverviewTab`; every non-mech type routes to that family's
 * per-type Overview editor.
 *
 * The crash-guard / render coverage — every Overview tab mounting store-safe
 * inside its own per-type store context — lives in
 * `nonMechCustomizerTabMount.test.tsx`, which renders each tab with the real
 * provider stack. This file stays at the dispatch layer and asserts by element
 * type so it needs no store providers.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  AerospaceOverviewTab,
  BattleArmorOverviewTab,
  InfantryOverviewTab,
  ProtoMechOverviewTab,
  VehicleOverviewTab,
} from '../NonMechOverviewTabs';
import { OverviewTab } from '../OverviewTab';
import { OverviewTabForType } from '../OverviewTabForType';

const NON_MECH_DISPATCH: ReadonlyArray<
  [
    string,
    UnitType,
    React.ComponentType<{ readOnly?: boolean; className?: string }>,
  ]
> = [
  ['Vehicle', UnitType.VEHICLE, VehicleOverviewTab],
  ['VTOL', UnitType.VTOL, VehicleOverviewTab],
  ['Support Vehicle', UnitType.SUPPORT_VEHICLE, VehicleOverviewTab],
  ['Aerospace', UnitType.AEROSPACE, AerospaceOverviewTab],
  ['Conventional Fighter', UnitType.CONVENTIONAL_FIGHTER, AerospaceOverviewTab],
  ['Battle Armor', UnitType.BATTLE_ARMOR, BattleArmorOverviewTab],
  ['Infantry', UnitType.INFANTRY, InfantryOverviewTab],
  ['ProtoMech', UnitType.PROTOMECH, ProtoMechOverviewTab],
];

describe('OverviewTabForType — dispatch wiring', () => {
  it.each(NON_MECH_DISPATCH)(
    'routes %s to its per-type Overview editor',
    (_label, unitType, expected) => {
      const element = OverviewTabForType({ unitType });
      expect(element.type).toBe(expected);
    },
  );

  it('routes the BattleMech branch to the mech OverviewTab', () => {
    // The dispatcher returns the mech OverviewTab element for mech types;
    // assert by element type so the test needs no mech store provider.
    const element = OverviewTabForType({ unitType: UnitType.BATTLEMECH });
    expect(element.type).toBe(OverviewTab);
  });
});
