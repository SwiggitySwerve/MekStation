import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { UnitRepository } from '@/services/units/UnitRepository';
import {
  AerospaceStoreContext,
  createAerospaceStore,
} from '@/stores/useAerospaceStore';
import { Era } from '@/types/temporal/Era';
import { validateAerospaceUnit } from '@/utils/construction/aerospace/validationRules';
import { serializeCustomAerospaceState } from '@/utils/serialization/CustomUnitSerializer';

import { ChassisSection } from '../AerospaceStructureTab.ChassisSection';

const source = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'public/data/units/aerospace/Boomerang Spotter Plane.json',
    ),
    'utf8',
  ),
);
afterEach(() => {
  resetSQLiteService();
  localStorage.clear();
});
describe.each([390, 1440])('FixedWingSupport panel at %ipx', (width) => {
  beforeEach(() =>
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
    }),
  );
  it('uses native limits and preserves edited BAR and explicit tech ratings through SQLite', () => {
    const store = createAerospaceStore(mapAerospaceDefinitionToState(source));
    render(
      <AerospaceStoreContext.Provider value={store}>
        <ChassisSection readOnly={false} />
      </AerospaceStoreContext.Provider>,
    );
    expect(
      screen.getByRole('spinbutton', { name: 'Fixed-Wing Support Tonnage' }),
    ).toHaveValue(4.999);
    expect(
      screen.getByText('Greater than 0 to 200 t; large above 100 t.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Available Item Slots')).toHaveTextContent(
      '5',
    );
    expect(screen.getByLabelText('Fire-Control Type')).toHaveTextContent(
      'None',
    );
    expect(
      screen.getByRole('combobox', { name: 'Structural Tech Rating' }),
    ).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: 'Engine Tech Rating' }),
    ).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'BAR' })).toHaveValue('2');
    for (const tonnage of [0.001, 4.999, 150, 200]) {
      const state = store.getState();
      expect(
        validateAerospaceUnit({
          tonnage,
          isFixedWingSupport: true,
          subType: state.aerospaceSubType,
          engineType: state.aerospaceEngineType,
          safeThrust: 4,
          structuralIntegrity: 4,
          fuelTons: state.fuelTons,
          arcArmor: {},
          quartersTons: 0,
          crewCount: 0,
        }).filter((e) => e.ruleId === 'VAL-AERO-TONNAGE'),
      ).toEqual([]);
    }
    for (const tonnage of [0, 201, NaN]) {
      const state = store.getState();
      expect(
        validateAerospaceUnit({
          tonnage,
          isFixedWingSupport: true,
          subType: state.aerospaceSubType,
          engineType: state.aerospaceEngineType,
          safeThrust: 4,
          structuralIntegrity: 4,
          fuelTons: state.fuelTons,
          arcArmor: {},
          quartersTons: 0,
          crewCount: 0,
        }).filter((e) => e.ruleId === 'VAL-AERO-TONNAGE'),
      ).toHaveLength(1);
    }
    for (const [name, value] of [
      ['BAR', '3'],
      ['Structural Tech Rating', '2'],
      ['Engine Tech Rating', '4'],
    ] as const)
      act(() =>
        fireEvent.change(screen.getByRole('combobox', { name }), {
          target: { value },
        }),
      );
    act(() =>
      fireEvent.change(
        screen.getByRole('spinbutton', { name: 'Fixed-Wing Support Tonnage' }),
        { target: { value: '15' } },
      ),
    );
    expect(screen.getByLabelText('Available Item Slots')).toHaveTextContent(
      '6',
    );
    const state = store.getState();
    getSQLiteService({ path: ':memory:' }).initialize();
    const data = serializeCustomAerospaceState(state, {
      id: state.id,
      chassis: state.chassis,
      variant: 'Panel Edit',
      era: Era.LATE_SUCCESSION_WARS,
    });
    expect(data.armor).toMatchObject({ type: 'BAR', barRating: 3 });
    expect(data).toMatchObject({
      structuralTechRating: 2,
      engineTechRating: 4,
    });
    const repository = new UnitRepository();
    const saved = repository.create({
      chassis: state.chassis,
      variant: 'Panel Edit',
      data: { ...data },
    });
    if (!saved.success) throw Error(saved.error.message);
    const loaded = repository.getById(saved.data.id);
    if (!loaded) throw Error('Missing saved design');
    const reopened = mapAerospaceDefinitionToState(JSON.parse(loaded.data));
    expect(reopened).toMatchObject({
      isFixedWingSupport: true,
      barRating: 3,
      structuralTechRating: 2,
      engineTechRating: 4,
      tonnage: 15,
    });
    const draft = JSON.parse(
      localStorage.getItem('megamek-aerospace-' + state.id)!,
    ).state;
    expect(draft).toMatchObject({
      barRating: 3,
      structuralTechRating: 2,
      engineTechRating: 4,
    });
  });
  it('shows source fire control and disables every edit in read-only mode', () => {
    const definition = {
      ...source,
      equipment: [
        ...source.equipment,
        { id: 'ISAdvancedFireControl', location: 'NOSE' },
      ],
    };
    const store = createAerospaceStore(
      mapAerospaceDefinitionToState(definition),
    );
    render(
      <AerospaceStoreContext.Provider value={store}>
        <ChassisSection readOnly />
      </AerospaceStoreContext.Provider>,
    );
    expect(screen.getByLabelText('Fire-Control Type')).toHaveTextContent(
      'Advanced',
    );
    for (const input of screen.getAllByRole('combobox'))
      expect(input).toBeDisabled();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });
});
