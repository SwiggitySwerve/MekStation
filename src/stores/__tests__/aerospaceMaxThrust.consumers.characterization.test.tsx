/**
 * Characterization of the max thrust seen by every aerospace consumer.
 *
 * One safe thrust -> max thrust table, asserted through each site that derives
 * max thrust from safe thrust: the construction owner, the aerospace and
 * capital-vessel BLK basics, the small craft, conventional fighter, DropShip
 * and WarShip handlers, the default state, the store actions (safe-thrust and
 * engine-rating edits), the aerospace BV adapter and the new-unit template
 * summary. The status bar rows only check that the stored value is displayed;
 * they cannot catch a wrong derivation. Changing the rounding rule is one edit to
 * MAX_BY_SAFE; a site that disagrees with the table fails on its own line. The
 * default state has a fixed safe thrust per tonnage band, so it is pinned at a
 * 45-ton fighter (safe thrust 5) only.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AerospaceStatusBar } from '@/components/customizer/aerospace/AerospaceStatusBar';
import {
  AEROSPACE_TEMPLATES,
  BATTLE_ARMOR_TEMPLATES,
  INFANTRY_TEMPLATES,
  PROTOMECH_TEMPLATES,
  VEHICLE_TEMPLATES,
} from '@/components/customizer/tabs/NewTabModal.constants';
import { NewTabModalNewMode } from '@/components/customizer/tabs/NewTabModalNewMode';
import { createMockBlkDocument as conventionalDocument } from '@/services/units/handlers/__tests__/ConventionalFighterUnitHandler.test-helpers';
import { createMockBlkDocument as dropShipDocument } from '@/services/units/handlers/__tests__/DropShipUnitHandler.test-helpers';
import { createMockBlkDocument as smallCraftDocument } from '@/services/units/handlers/__tests__/SmallCraftUnitHandler.test-helpers';
import { createMockBlkDocument as warShipDocument } from '@/services/units/handlers/__tests__/WarShipUnitHandler.test-helpers';
import { createAerospaceHandler } from '@/services/units/handlers/AerospaceUnitHandler';
import { parseAerospaceBasics } from '@/services/units/handlers/aerospaceUnitHandlerShared';
import { parseCapitalVesselBasics } from '@/services/units/handlers/capitalShipHandlerShared';
import { createConventionalFighterHandler } from '@/services/units/handlers/ConventionalFighterUnitHandler';
import { createDropShipHandler } from '@/services/units/handlers/DropShipUnitHandler';
import { createSmallCraftHandler } from '@/services/units/handlers/SmallCraftUnitHandler';
import { createWarShipHandler } from '@/services/units/handlers/WarShipUnitHandler';
import { UNIT_TEMPLATES } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateAerospaceBVFromUnit } from '@/utils/construction/aerospace/aerospaceBV';
import { calculateMaxThrust } from '@/utils/construction/aerospace/thrustCalculations';

import { createDefaultAerospaceState } from '../aerospaceState';
import {
  clearAllAerospaceStores,
  createAerospaceFromFullState,
  createAndRegisterAerospace,
  duplicateAerospace,
} from '../aerospaceStoreRegistry';
import {
  createNewAerospaceStore,
  useAerospaceStore,
  type AerospaceStore,
} from '../useAerospaceStore';

jest.mock('../useAerospaceStore', () => ({
  ...jest.requireActual('../useAerospaceStore'),
  useAerospaceStore: jest.fn(),
}));
const mockUseAerospaceStore = useAerospaceStore as jest.MockedFunction<
  typeof useAerospaceStore
>;

/** safe thrust -> max thrust. Odd and even safe thrust both appear. */
const MAX_BY_SAFE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 2],
  [2, 3],
  [3, 5],
  [4, 6],
  [5, 8],
  [6, 9],
  [7, 11],
  [12, 18],
];

/** Handlers reject a source with no safe thrust, so they take positive values. */
const POSITIVE_MAX_BY_SAFE = MAX_BY_SAFE.filter(([safe]) => safe >= 1);

const OPTIONS = {
  name: 'Thrust Consumer',
  tonnage: 45,
  techBase: TechBase.INNER_SPHERE,
};

function aerospaceDocument(safeThrust: number): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Aero',
    mappedUnitType: UnitType.AEROSPACE,
    name: 'Thrust Fighter',
    model: 'TF-1',
    year: 3025,
    type: 'IS Level 2',
    tonnage: 50,
    safeThrust,
    fuel: 400,
    structuralIntegrity: 8,
    heatsinks: 10,
    sinkType: 0,
    armor: [30, 24, 24, 18],
    equipmentByLocation: {},
    rawTags: {},
  };
}

function renderStatusBar(safeThrust: number, maxThrust: number) {
  const state = {
    ...createDefaultAerospaceState(OPTIONS),
    safeThrust,
    maxThrust,
  } as unknown as AerospaceStore;
  mockUseAerospaceStore.mockImplementation(((selector: unknown) =>
    (selector as (s: AerospaceStore) => unknown)(state)) as never);
  return render(<AerospaceStatusBar compact />);
}

describe('aerospace max thrust consumers', () => {
  it.each(MAX_BY_SAFE)('owner calculateMaxThrust(%s) is %s', (safe, max) => {
    expect(calculateMaxThrust(safe)).toBe(max);
  });

  it.each(MAX_BY_SAFE)(
    'aerospace and capital BLK basics give safe thrust %s max %s',
    (safe, max) => {
      const document = aerospaceDocument(safe);
      expect(parseAerospaceBasics(document, 10).movement).toEqual({
        safeThrust: safe,
        maxThrust: max,
      });
      expect(parseCapitalVesselBasics(document).movement).toEqual({
        safeThrust: safe,
        maxThrust: max,
      });
    },
  );

  it.each(POSITIVE_MAX_BY_SAFE)(
    'handlers give safe thrust %s max %s',
    (safe, max) => {
      const expected = { safeThrust: safe, maxThrust: max };
      const parsed = [
        createAerospaceHandler().parse(aerospaceDocument(safe)),
        createConventionalFighterHandler().parse(
          conventionalDocument({ safeThrust: safe }),
        ),
        createSmallCraftHandler().parse(
          smallCraftDocument({ safeThrust: safe }),
        ),
        createDropShipHandler().parse(dropShipDocument({ safeThrust: safe })),
        createWarShipHandler().parse(warShipDocument({ safeThrust: safe })),
      ];
      for (const result of parsed) {
        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement).toEqual(expected);
      }
    },
  );

  it('default state max thrust follows its fixed safe thrust of 5', () => {
    const state = createDefaultAerospaceState(OPTIONS);
    expect(state.safeThrust).toBe(5);
    expect(state.maxThrust).toBe(MAX_BY_SAFE.find(([safe]) => safe === 5)?.[1]);
  });

  it.each(POSITIVE_MAX_BY_SAFE)(
    'store safe-thrust edit gives safe thrust %s max %s',
    (safe, max) => {
      const store = createNewAerospaceStore(OPTIONS);
      store.getState().setSafeThrust(safe);
      expect(store.getState().maxThrust).toBe(max);
    },
  );

  it.each(POSITIVE_MAX_BY_SAFE)(
    'store engine-rating edit derives max thrust for safe thrust %s as %s',
    (safe, max) => {
      const store = createNewAerospaceStore(OPTIONS);
      store.getState().setEngineRating(safe * OPTIONS.tonnage);
      expect(store.getState().safeThrust).toBe(safe);
      expect(store.getState().maxThrust).toBe(max);
    },
  );

  it.each(MAX_BY_SAFE)(
    'status bar shows safe thrust %s with max %s',
    (safe, max) => {
      renderStatusBar(safe, max);
      expect(screen.getByText(`${safe}/${max} Thrust`)).toBeInTheDocument();
    },
  );

  it.each(POSITIVE_MAX_BY_SAFE)(
    'BV adapter carries safe thrust %s max %s into speed with no defensive multiplier',
    (safe, max) => {
      const parsed = createAerospaceHandler().parse(aerospaceDocument(safe));
      const unit = parsed.data!.unit!;
      const bv = calculateAerospaceBVFromUnit(unit);
      expect(bv.avgThrust).toBe((safe + max) / 2);
      expect(bv.defensiveFactor).toBe(1);
    },
  );

  it('new-unit aerospace templates summarize safe/max thrust', () => {
    const maxOf = new Map(MAX_BY_SAFE);
    render(
      <NewTabModalNewMode
        unitType={UnitType.AEROSPACE}
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
    for (const template of AEROSPACE_TEMPLATES) {
      const max = maxOf.get(template.safeThrust);
      expect(max).toBeDefined();
      expect(
        screen.getByRole('button', { name: new RegExp(template.name) }),
      ).toHaveTextContent(`Thrust ${template.safeThrust}/${max}`);
    }
  });
});

describe('aerospace max thrust across duplicated and reopened drafts', () => {
  beforeEach(() => {
    clearAllAerospaceStores();
    localStorage.clear();
  });
  afterEach(() => clearAllAerospaceStores());

  it('duplicating a fighter derives max thrust from the copied safe thrust', () => {
    const source = createAndRegisterAerospace(OPTIONS);
    source.getState().setSafeThrust(7);
    expect(source.getState().maxThrust).toBe(11);

    const copy = duplicateAerospace(source.getState().id);
    expect(copy?.getState().safeThrust).toBe(7);
    expect(copy?.getState().maxThrust).toBe(11);
  });

  it('reopening a saved fighter ignores a stale stored max thrust', () => {
    const saved = {
      ...createDefaultAerospaceState(OPTIONS),
      safeThrust: 5,
      maxThrust: 7,
    };
    const store = createAerospaceFromFullState(saved);
    expect(store.getState().safeThrust).toBe(5);
    expect(store.getState().maxThrust).toBe(8);
  });
});
