/**
 * Characterization of the base flank MP seen by every vehicle consumer.
 *
 * One cruise -> flank table, asserted through each site that derives flank
 * from cruise: the construction owner, engine validation, the store actions
 * (cruise and engine-rating edits), the default state, the BV state adapter,
 * the status bar (full and compact) and the new-unit template summary.
 * Changing the rounding rule is one edit to FLANK_BY_CRUISE; a site that
 * disagrees with the table fails on its own line. The default state has a
 * fixed cruise of 4, where floor and ceil agree, so that site is pinned at
 * cruise 4 only.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  AEROSPACE_TEMPLATES,
  BATTLE_ARMOR_TEMPLATES,
  INFANTRY_TEMPLATES,
  PROTOMECH_TEMPLATES,
  VEHICLE_TEMPLATES,
} from '@/components/customizer/tabs/NewTabModal.constants';
import { NewTabModalNewMode } from '@/components/customizer/tabs/NewTabModalNewMode';
import { VehicleStatusBar } from '@/components/customizer/vehicle/VehicleStatusBar';
import { UNIT_TEMPLATES } from '@/stores/useMultiUnitStore';
import { useVehicleStore, type VehicleStore } from '@/stores/useVehicleStore';
import { EngineType } from '@/types/construction/EngineType';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  computeFlankMP,
  validateVehicleEngine,
} from '@/utils/construction/vehicle/engine';
import { toVehicleBVInput } from '@/utils/construction/vehicle/vehicleBVAdapter';

import {
  setCruiseMPLogic,
  setEngineRatingLogic,
} from '../useVehicleStore.actions';
import { calculateFlankMP } from '../useVehicleStore.helpers';
import { createDefaultVehicleState } from '../vehicleState';

jest.mock('@/stores/useVehicleStore');
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false, recheckReady: jest.fn() }),
}));
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

/** cruise MP -> base flank MP. Odd and even cruise values both appear. */
const FLANK_BY_CRUISE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 1],
  [2, 3],
  [3, 4],
  [4, 6],
  [5, 7],
  [6, 9],
  [17, 25],
];

const OPTIONS = {
  name: 'Flank Consumer',
  tonnage: 20,
  techBase: TechBase.INNER_SPHERE,
};

function baseState(overrides: Record<string, unknown> = {}) {
  return { ...createDefaultVehicleState(OPTIONS), ...overrides };
}

function renderBar(cruiseMP: number, compact: boolean) {
  const state = baseState({ cruiseMP }) as unknown as VehicleStore;
  mockUseVehicleStore.mockImplementation((selector) => selector(state));
  return render(<VehicleStatusBar compact={compact} />);
}

describe('vehicle base flank consumers', () => {
  it.each(FLANK_BY_CRUISE)(
    'owner computeFlankMP(%s) is %s',
    (cruise, flank) => {
      expect(computeFlankMP(cruise)).toBe(flank);
    },
  );

  it.each(FLANK_BY_CRUISE)(
    'engine validation reports flank for cruise %s as %s',
    (cruise, flank) => {
      expect(
        validateVehicleEngine(
          20,
          cruise,
          EngineType.STANDARD,
          GroundMotionType.TRACKED,
        ).flankMP,
      ).toBe(flank);
    },
  );

  it.each(FLANK_BY_CRUISE)(
    'store helper and cruise edit give cruise %s flank %s',
    (cruise, flank) => {
      expect(calculateFlankMP(cruise)).toBe(flank);
      expect(
        setCruiseMPLogic(baseState() as VehicleStore, cruise).flankMP,
      ).toBe(flank);
    },
  );

  it('engine-rating edit derives flank from the resulting cruise', () => {
    // Rating 60 on 20 t tracked gives cruise 3 (rating 60 = cruise 3 * 20 t).
    const edit = setEngineRatingLogic(baseState() as VehicleStore, 60);
    expect(edit.cruiseMP).toBe(3);
    expect(edit.flankMP).toBe(4);
  });

  it('default state flank follows its fixed cruise of 4', () => {
    const state = createDefaultVehicleState(OPTIONS);
    expect(state.cruiseMP).toBe(4);
    expect(state.flankMP).toBe(6);
  });

  it.each(FLANK_BY_CRUISE)(
    'BV state adapter carries cruise %s as flank %s',
    (cruise, flank) => {
      expect(toVehicleBVInput(baseState({ cruiseMP: cruise })).flankMP).toBe(
        flank,
      );
    },
  );

  it.each(FLANK_BY_CRUISE)(
    'status bar shows cruise %s with flank %s in both layouts',
    (cruise, flank) => {
      const full = renderBar(cruise, false);
      const movement = screen.getByText('Movement').parentElement!;
      expect(movement.textContent).toContain(`${cruise}/${flank}`);
      full.unmount();
      renderBar(cruise, true);
      expect(screen.getByText(`${cruise}/${flank} MP`)).toBeInTheDocument();
    },
  );

  it('new-unit vehicle templates summarize cruise/flank', () => {
    const flankOf = new Map(FLANK_BY_CRUISE);
    render(
      <NewTabModalNewMode
        unitType={UnitType.VEHICLE}
        setUnitType={jest.fn()}
        selectedMechTemplate={UNIT_TEMPLATES[0]}
        setSelectedMechTemplate={jest.fn()}
        selectedVehicleTemplate={VEHICLE_TEMPLATES[0]}
        setSelectedVehicleTemplate={jest.fn()}
        selectedAerospaceTemplate={AEROSPACE_TEMPLATES[0]}
        setSelectedAerospaceTemplate={jest.fn()}
        selectedBattleArmorTemplate={BATTLE_ARMOR_TEMPLATES[0]}
        setSelectedBattleArmorTemplate={jest.fn()}
        selectedInfantryTemplate={INFANTRY_TEMPLATES[0]}
        setSelectedInfantryTemplate={jest.fn()}
        selectedProtoMechTemplate={PROTOMECH_TEMPLATES[0]}
        setSelectedProtoMechTemplate={jest.fn()}
        techBase={TechBase.INNER_SPHERE}
        setTechBase={jest.fn()}
      />,
    );
    for (const template of VEHICLE_TEMPLATES) {
      const flank = flankOf.get(template.cruiseMP);
      expect(flank).toBeDefined();
      expect(
        screen.getByRole('button', { name: new RegExp(template.name) }),
      ).toHaveTextContent(`${template.cruiseMP}/${flank} MP`);
    }
  });
});
