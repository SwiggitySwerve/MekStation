/**
 * OverviewTabForType — Overview crash-guard test (Task 4.3).
 *
 * The shipped bug: the mech `OverviewTab` hard-calls `useUnitStore` and crashes
 * inside a non-mech customizer. These tests assert the dispatcher renders the
 * graceful `NonMechOverviewPlaceholder` for every non-mech type with NO
 * `UnitStoreProvider` present — and that the mech branch still routes to the
 * mech `OverviewTab`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Overview Tab Non-Mech Crash Guard
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { OverviewTab } from '../OverviewTab';
import { OverviewTabForType } from '../OverviewTabForType';

const NON_MECH_TYPES: ReadonlyArray<[string, UnitType]> = [
  ['Vehicle', UnitType.VEHICLE],
  ['VTOL', UnitType.VTOL],
  ['Support Vehicle', UnitType.SUPPORT_VEHICLE],
  ['Aerospace', UnitType.AEROSPACE],
  ['Conventional Fighter', UnitType.CONVENTIONAL_FIGHTER],
  ['Battle Armor', UnitType.BATTLE_ARMOR],
  ['Infantry', UnitType.INFANTRY],
  ['ProtoMech', UnitType.PROTOMECH],
];

describe('OverviewTabForType — non-mech crash guard', () => {
  it.each(NON_MECH_TYPES)(
    'renders the placeholder for %s with NO UnitStoreProvider and does not throw',
    (_label, unitType) => {
      expect(() =>
        render(<OverviewTabForType unitType={unitType} />),
      ).not.toThrow();
      expect(
        screen.getByTestId('non-mech-overview-placeholder'),
      ).toBeInTheDocument();
    },
  );

  it('routes the BattleMech branch to the mech OverviewTab', () => {
    // The dispatcher returns the mech OverviewTab element for mech types;
    // assert by element type so the test needs no mech store provider.
    const element = OverviewTabForType({ unitType: UnitType.BATTLEMECH });
    expect(element.type).toBe(OverviewTab);
  });
});
