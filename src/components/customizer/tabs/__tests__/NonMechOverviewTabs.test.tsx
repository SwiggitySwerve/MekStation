/**
 * NonMechOverviewTabs — per-type Overview wrapper integration tests.
 *
 * Each wrapper reads unit-identity fields from its type's contextual store and
 * renders the shared `NonMechIdentityPanel`. These tests mount every wrapper
 * inside its own store context and assert (a) the panel renders the store's
 * values and (b) edits write back through the store's setters, including the
 * `name` sync that keeps the persisted name tracking `chassis` + `model`.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import type { StoreApi } from 'zustand';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import {
  BattleArmorStoreContext,
  createNewBattleArmorStore,
} from '@/stores/useBattleArmorStore';
import {
  InfantryStoreContext,
  createNewInfantryStore,
} from '@/stores/useInfantryStore';
import {
  ProtoMechStoreContext,
  createNewProtoMechStore,
} from '@/stores/useProtoMechStore';
import {
  VehicleStoreContext,
  createNewVehicleStore,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  AerospaceOverviewTab,
  BattleArmorOverviewTab,
  InfantryOverviewTab,
  ProtoMechOverviewTab,
  VehicleOverviewTab,
} from '../NonMechOverviewTabs';

// ---------------------------------------------------------------------------
// Per-type fixtures — each builds a fresh store and wraps the wrapper in that
// store's context, then exposes a `read()` accessor for chassis/model/name.
// ---------------------------------------------------------------------------

interface WrapperFixture {
  label: string;
  /** Whether this type carries an editable tonnage field. */
  hasTonnage: boolean;
  /** Render the wrapper inside a fresh store context; return the store. */
  mount: () => {
    store: StoreApi<{ chassis: string; model: string; name: string }>;
  };
}

const FIXTURES: WrapperFixture[] = [
  {
    label: 'Vehicle',
    hasTonnage: true,
    mount: () => {
      const store = createNewVehicleStore({
        name: 'Test Vehicle',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        unitType: UnitType.VEHICLE,
      });
      render(
        <VehicleStoreContext.Provider value={store}>
          <VehicleOverviewTab />
        </VehicleStoreContext.Provider>,
      );
      return { store };
    },
  },
  {
    label: 'Aerospace',
    hasTonnage: true,
    mount: () => {
      const store = createNewAerospaceStore({
        name: 'Test Fighter',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      render(
        <AerospaceStoreContext.Provider value={store}>
          <AerospaceOverviewTab />
        </AerospaceStoreContext.Provider>,
      );
      return { store };
    },
  },
  {
    label: 'BattleArmor',
    hasTonnage: false,
    mount: () => {
      const store = createNewBattleArmorStore({
        name: 'Test BA',
        techBase: TechBase.INNER_SPHERE,
      });
      render(
        <BattleArmorStoreContext.Provider value={store}>
          <BattleArmorOverviewTab />
        </BattleArmorStoreContext.Provider>,
      );
      return { store };
    },
  },
  {
    label: 'Infantry',
    hasTonnage: false,
    mount: () => {
      const store = createNewInfantryStore({
        name: 'Test Platoon',
        techBase: TechBase.INNER_SPHERE,
      });
      render(
        <InfantryStoreContext.Provider value={store}>
          <InfantryOverviewTab />
        </InfantryStoreContext.Provider>,
      );
      return { store };
    },
  },
  {
    label: 'ProtoMech',
    hasTonnage: true,
    mount: () => {
      const store = createNewProtoMechStore({
        name: 'Test ProtoMech',
        tonnage: 5,
      });
      render(
        <ProtoMechStoreContext.Provider value={store}>
          <ProtoMechOverviewTab />
        </ProtoMechStoreContext.Provider>,
      );
      return { store };
    },
  },
];

describe('NonMechOverviewTabs — per-type wrappers', () => {
  describe.each(FIXTURES.map((f) => [f.label, f] as const))(
    '%s Overview wrapper',
    (_label, fx) => {
      it('renders the shared identity panel', () => {
        fx.mount();
        expect(
          screen.getByTestId('non-mech-identity-panel'),
        ).toBeInTheDocument();
      });

      it('writes a chassis edit back to the store', () => {
        const { store } = fx.mount();
        fireEvent.change(screen.getByLabelText('Chassis'), {
          target: { value: 'Edited Chassis' },
        });
        expect(store.getState().chassis).toBe('Edited Chassis');
      });

      it('keeps the store name in sync with chassis + model edits', () => {
        const { store } = fx.mount();
        fireEvent.change(screen.getByLabelText('Chassis'), {
          target: { value: 'Foo' },
        });
        fireEvent.change(screen.getByLabelText('Model'), {
          target: { value: 'Bar' },
        });
        expect(store.getState().model).toBe('Bar');
        expect(store.getState().name).toBe('Foo Bar');
      });

      it(
        fx.hasTonnage
          ? 'renders the tonnage field'
          : 'does not render the tonnage field',
        () => {
          fx.mount();
          if (fx.hasTonnage) {
            expect(screen.getByLabelText('Tonnage')).toBeInTheDocument();
          } else {
            expect(screen.queryByLabelText('Tonnage')).not.toBeInTheDocument();
          }
        },
      );
    },
  );
});
