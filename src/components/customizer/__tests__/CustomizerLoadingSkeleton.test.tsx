/**
 * Every customizer loading boundary shows the shared skeleton, announced as a
 * status, instead of bare "Loading ..." text (row 4.1 "loading skeletons").
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { CustomizerLoadingSkeleton } from '@/components/customizer/CustomizerLoadingSkeleton';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  registerCapitalShipView,
  type CapitalShipUnitType,
} from '@/services/units/unitLoaderService/capitalShipView';
import { hydrateOrCreateAerospace } from '@/stores/aerospaceStoreRegistry';
import { hydrateOrCreateBattleArmor } from '@/stores/battleArmorStoreRegistry';
import { hydrateOrCreateInfantry } from '@/stores/infantryStoreRegistry';
import { hydrateOrCreateProtoMech } from '@/stores/protoMechStoreRegistry';
import { UnitStoreProvider } from '@/stores/UnitStoreProvider';
import * as unitRegistry from '@/stores/unitStoreRegistry';
import { type TabInfo } from '@/stores/useTabManagerStore';
import { hydrateOrCreateVehicle } from '@/stores/vehicleStoreRegistry';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import {
  AerospaceMotionType,
  GroundMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { CustomizerConfirmationProvider } from '../dialogs/CustomizerConfirmationProvider';
import { ArmorDiagramPanel } from '../tabs/ArmorDiagramPanel';
import { UnitTypeRouter } from '../UnitTypeRouter';

interface LoadingCase {
  name: string;
  type: UnitType;
  diagram: string;
  text: string;
  tonnage?: number;
  configuration?: MechConfiguration;
  motion?: GroundMotionType;
  craftMotion?: AerospaceMotionType;
  superheavy?: boolean;
  fixedWing?: boolean;
}
const CASES: LoadingCase[] = [
  ...Object.values(MechConfiguration).map((configuration) => ({
    name: configuration,
    configuration,
    type: UnitType.BATTLEMECH,
    diagram: 'armor-diagram',
    text:
      configuration === MechConfiguration.BIPED
        ? 'Armor Allocation'
        : `${configuration} Armor Allocation`,
  })),
  {
    name: 'combat vehicle',
    type: UnitType.VEHICLE,
    diagram: 'vehicle-armor-diagram',
    text: 'Front',
  },
  {
    name: 'VTOL',
    type: UnitType.VTOL,
    motion: GroundMotionType.VTOL,
    diagram: 'vehicle-armor-diagram',
    text: 'Rotor',
  },
  {
    name: 'naval',
    type: UnitType.VEHICLE,
    motion: GroundMotionType.NAVAL,
    diagram: 'vehicle-armor-diagram',
    text: 'Front',
  },
  {
    name: 'superheavy',
    type: UnitType.VEHICLE,
    // Keep native tracked geometry consistent with the shared construction rule.
    tonnage: 150,
    superheavy: true,
    diagram: 'vehicle-six-side-armor-diagram',
    text: 'Front Left',
  },
  {
    name: 'support',
    type: UnitType.SUPPORT_VEHICLE,
    diagram: 'vehicle-armor-diagram',
    // MML 62bf193 ArmorAllocationView.java:91-110,321-343 omits Body.
    text: 'Front',
  },
  {
    name: 'large support',
    type: UnitType.SUPPORT_VEHICLE,
    tonnage: 150,
    superheavy: true,
    diagram: 'vehicle-six-side-armor-diagram',
    text: 'Rear Left',
  },
  ...[UnitType.AEROSPACE, UnitType.CONVENTIONAL_FIGHTER].map((type) => ({
    name: type,
    type,
    diagram: 'aerospace-armor-diagram',
    text: 'Left Wing',
  })),
  {
    name: 'fixed-wing support',
    type: UnitType.AEROSPACE,
    fixedWing: true,
    diagram: 'aerospace-armor-diagram',
    text: 'Left Wing',
  },
  ...[AerospaceMotionType.AERODYNE, AerospaceMotionType.SPHEROID].map(
    (craftMotion) => ({
      name: `small craft ${craftMotion}`,
      type: UnitType.SMALL_CRAFT,
      craftMotion,
      diagram: 'aerospace-armor-diagram',
      text: 'Left Side',
    }),
  ),
  {
    name: 'battle armor',
    type: UnitType.BATTLE_ARMOR,
    diagram: 'battlearmor-pip-grid',
    text: 'troopers',
  },
  {
    name: 'infantry',
    type: UnitType.INFANTRY,
    diagram: 'infantry-platoon-counter',
    text: 'Platoon Strength',
  },
  {
    name: 'ProtoMech',
    type: UnitType.PROTOMECH,
    diagram: 'protomech-armor-diagram',
    text: 'Torso',
  },
  ...[
    UnitType.DROPSHIP,
    UnitType.JUMPSHIP,
    UnitType.WARSHIP,
    UnitType.SPACE_STATION,
  ].map((type) => ({
    name: type,
    type,
    diagram: 'capital-loading-locations',
    text: 'Nose',
  })),
];
let nextId = 0;

it('preserves the ready diagram root markers captured before the loading fix', () => {
  render(
    <ArmorDiagramPanel
      configuration={MechConfiguration.BIPED}
      armorDiagramMode="silhouette"
      armorDiagramVariant="clean-tech"
      armorData={[]}
      selectedLocation={null}
      unallocatedPoints={0}
      locationIssues={{}}
      onLocationClick={jest.fn()}
    />,
  );
  const panel = screen.getByTestId('armor-diagram');
  const root = panel.firstElementChild;
  if (!root) throw new Error('Ready armor diagram is missing');
  const markers = Array.from(root.attributes)
    .filter((attribute) => attribute.name.startsWith('data-'))
    .map((attribute) => [attribute.name, attribute.value]);
  expect(markers).toEqual([
    ['data-armor-variant', 'clean-tech'],
    ['data-armor-design', 'blueprint'],
  ]);
  expect(panel).not.toHaveAttribute('data-armor-loading');
  expect(root).not.toHaveAttribute('data-armor-loading');
});

function familyTree(testCase: LoadingCase): React.ReactElement {
  const tab: TabInfo = {
    id: `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`,
    name: testCase.name,
    unitType: testCase.type,
    tonnage: testCase.tonnage ?? 50,
    techBase: TechBase.INNER_SPHERE,
  };
  const options = { ...tab, unitType: undefined };
  if (testCase.configuration)
    unitRegistry
      .hydrateOrCreateUnit(tab.id, options)
      .setState({ configuration: testCase.configuration });
  else if (
    [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE].includes(
      testCase.type,
    )
  )
    hydrateOrCreateVehicle(tab.id, options).setState({
      unitType: testCase.type as
        | UnitType.VEHICLE
        | UnitType.VTOL
        | UnitType.SUPPORT_VEHICLE,
      motionType: testCase.motion ?? GroundMotionType.TRACKED,
      isSuperheavy: testCase.superheavy ?? false,
    });
  else if (
    [
      UnitType.AEROSPACE,
      UnitType.CONVENTIONAL_FIGHTER,
      UnitType.SMALL_CRAFT,
    ].includes(testCase.type)
  )
    hydrateOrCreateAerospace(tab.id, {
      ...options,
      isSmallCraft: testCase.type === UnitType.SMALL_CRAFT,
      isConventional: testCase.type === UnitType.CONVENTIONAL_FIGHTER,
    }).setState({
      motionType: testCase.craftMotion ?? AerospaceMotionType.AERODYNE,
      isFixedWingSupport: testCase.fixedWing ?? false,
    });
  else if (testCase.type === UnitType.BATTLE_ARMOR)
    hydrateOrCreateBattleArmor(tab.id, options);
  else if (testCase.type === UnitType.INFANTRY)
    hydrateOrCreateInfantry(tab.id, options);
  else if (testCase.type === UnitType.PROTOMECH)
    hydrateOrCreateProtoMech(tab.id, options);
  else
    registerCapitalShipView({
      ...tab,
      unitType: testCase.type as CapitalShipUnitType,
      sourceId: tab.id,
      armorType: 'Standard',
      armorByArc: [
        { label: 'Nose', count: 17 },
        { label: 'Aft', count: 9 },
      ],
      crew: [],
      transport: [],
      equipmentByArc: [],
      bv: { scope: 'unavailable', reason: 'pending' },
    });
  return (
    <CustomizerConfirmationProvider
      scope={{ unitId: tab.id, unitType: tab.unitType }}
    >
      <UnitTypeRouter
        activeTab={tab}
        activeTabId="structure"
        onTabChange={jest.fn()}
      />
    </CustomizerConfirmationProvider>
  );
}

describe('real family shells while the equipment catalog is pending', () => {
  let resolveCatalog: () => void;
  let rejectCatalog: (error: Error) => void;
  let ready: boolean;
  let initialize: jest.SpyInstance;
  beforeEach(() => {
    ready = false;
    const pending = new Promise<'ready'>((resolve, reject) => {
      resolveCatalog = () => {
        ready = true;
        resolve('ready');
      };
      rejectCatalog = reject;
    });
    jest
      .spyOn(getEquipmentRegistry(), 'isReady')
      .mockImplementation(() => ready);
    initialize = jest
      .spyOn(getEquipmentRegistry(), 'initialize')
      .mockReturnValue(pending);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(CASES)(
    '$name renders its own loading skeleton and real location representation',
    (testCase) => {
      render(familyTree(testCase));
      const loading = screen.getByTestId('customizer-loading-skeleton');
      expect(loading).toHaveAttribute('aria-busy', 'true');
      expect(loading).toHaveTextContent(testCase.type);
      expect(
        loading.querySelector('[data-armor-variant], [data-armor-design]'),
      ).toBeNull();
      const diagram = within(loading).getByTestId(testCase.diagram);
      if (testCase.type === UnitType.BATTLEMECH)
        expect(diagram).toHaveAttribute('data-armor-loading', 'true');
      expect(diagram).toHaveTextContent(testCase.text);
      if (testCase.type === UnitType.SUPPORT_VEHICLE)
        expect(
          within(loading).queryByTestId('vehicle-armor-input-Body'),
        ).toBeNull();
      expect(diagram.closest('[inert]')).not.toBeNull();
      if (testCase.type !== UnitType.BATTLEMECH)
        expect(within(loading).queryByTestId('armor-diagram')).toBeNull();
      if (testCase.type === UnitType.SMALL_CRAFT) {
        expect(diagram).not.toHaveTextContent('Left Wing');
        expect(
          diagram.querySelector(`[data-craft-shape="${testCase.craftMotion}"]`),
        ).not.toBeNull();
      }
      if (testCase.diagram === 'capital-loading-locations')
        expect(loading.querySelector('input, select, textarea')).toBeNull();
    },
  );
  it('replaces pending UI when the real initialization promise resolves', async () => {
    render(familyTree(CASES[0]));
    await act(async () => resolveCatalog());
    expect(screen.queryByTestId('customizer-loading-skeleton')).toBeNull();
    expect(screen.getByText('Ready mech editor')).toBeVisible();
  });
  it('reports failure and retries without losing the family diagram', async () => {
    render(familyTree(CASES[0]));
    await act(async () => rejectCatalog(new Error('Catalog offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('Catalog offline');
    initialize.mockImplementation(async () => {
      ready = true;
      return 'ready';
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry equipment catalog' }),
    );
    await act(async () => {});
    expect(screen.getByText('Ready mech editor')).toBeVisible();
  });
  it('replaces the previous family when switching while pending', () => {
    const view = render(familyTree(CASES[0]));
    view.rerender(familyTree(CASES.find((c) => c.type === UnitType.INFANTRY)!));
    expect(screen.getByTestId('infantry-platoon-counter')).toBeVisible();
    expect(screen.queryByTestId('armor-diagram')).toBeNull();
  });
});

jest.mock('@/stores/unitStoreRegistry', () => {
  const actual = jest.requireActual<
    typeof import('@/stores/unitStoreRegistry')
  >('@/stores/unitStoreRegistry');
  return {
    ...actual,
    hydrateOrCreateUnit: jest.fn(actual.hydrateOrCreateUnit),
  };
});

jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('../UnitEditorWithRouting', () => ({
  UnitEditorWithRouting: () => <div>Ready mech editor</div>,
}));

it('renders a labelled status skeleton with tab, status and form placeholders', () => {
  render(<CustomizerLoadingSkeleton label="Loading unit" />);
  const status = screen.getByRole('status', { name: 'Loading unit' });
  expect(status).toHaveAttribute('aria-busy', 'true');
  expect(status.querySelectorAll('.animate-pulse').length).toBeGreaterThan(4);
  expect(screen.queryByText(/Loading unit\.\.\./)).toBeNull();
});

it('shows the skeleton while the mech unit store is not ready', () => {
  jest.mocked(unitRegistry.hydrateOrCreateUnit).mockImplementationOnce(() => {
    throw new Error('store unavailable');
  });
  render(
    <UnitStoreProvider
      activeTab={{
        id: 'pending-unit',
        name: 'Pending',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }}
    >
      <div>editor</div>
    </UnitStoreProvider>,
  );
  expect(screen.getByRole('status', { name: 'Loading unit' })).toBeVisible();
  expect(screen.queryByText('Loading unit...')).toBeNull();
  expect(screen.queryByText('editor')).toBeNull();
});
