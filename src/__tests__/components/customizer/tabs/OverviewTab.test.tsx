import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  useOverviewBuildSummary,
  type OverviewBuildSummaryData,
} from '@/components/customizer/tabs/overview/useOverviewBuildSummary';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { createNewUnitStore } from '@/stores/unit/useUnitStore';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { useUnitStore, useUnitStoreApi } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
  useUnitStoreApi: jest.fn(),
}));
jest.mock('@/stores/utils/clientSafeStorage', () => ({
  ...jest.requireActual<typeof import('@/stores/utils/clientSafeStorage')>(
    '@/stores/utils/clientSafeStorage',
  ),
  clientSafeStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: jest.fn(),
}));

jest.mock(
  '@/components/customizer/tabs/overview/useOverviewBuildSummary',
  () => ({ useOverviewBuildSummary: jest.fn() }),
);

jest.mock('@/components/customizer/shared/TechBaseConfiguration', () => ({
  TechBaseConfiguration: () => <div data-testid="tech-base-config" />,
}));

describe('OverviewTab', () => {
  const mockUseUnitStore = useUnitStore as jest.MockedFunction<
    typeof useUnitStore
  >;
  const mockUseTabManagerStore = useTabManagerStore as jest.MockedFunction<
    typeof useTabManagerStore
  >;
  const mockStoreValues = {
    equipment: [],
    id: 'unit-1',
    chassis: 'Atlas',
    clanName: '',
    model: 'AS7-D',
    mulId: '-1',
    year: 2750,
    rulesLevel: 'STANDARD',
    techBaseMode: 'inner_sphere',
    componentTechBases: {},
    engineType: 'Standard Fusion',
    engineRating: 300,
    gyroType: 'Standard',
    internalStructureType: 'Standard',
    cockpitType: 'Standard',
    heatSinkType: 'Single',
    heatSinkCount: 10,
    armorType: 'Standard',
    enhancement: null,
    setChassis: jest.fn(),
    setClanName: jest.fn(),
    setModel: jest.fn(),
    setMulId: jest.fn(),
    setYear: jest.fn(),
    setRulesLevel: jest.fn(),
    setTechBaseMode: jest.fn(),
    setComponentTechBase: jest.fn(),
  };

  const summaryFixture = {
    stats: {
      name: 'Atlas AS7-D',
      tonnage: 100,
      techBaseMode: 'inner_sphere',
      engineRating: 300,
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      weightUsed: 96,
      weightRemaining: 4,
      armorPoints: 304,
      maxArmorPoints: 307,
      criticalSlotsUsed: 62,
      criticalSlotsTotal: 78,
      heatGenerated: 33,
      heatGeneration: {
        alphaStrikeHeat: 31,
        movementHeat: 2,
        movementMode: 'running',
      },
      heatDissipation: 22,
      battleValue: 1768,
      validationStatus: 'valid',
      errorCount: 0,
      warningCount: 0,
    },
    calculations: {
      structureWeight: 10,
      engineWeight: 19,
      gyroWeight: 3,
      cockpitWeight: 3,
      heatSinkWeight: 10,
      jumpJetWeight: 0,
      armorWeight: 19,
    },
    equipmentWeight: 32,
    equipmentCount: 18,
    unplacedInstanceIds: [],
    validation: { result: null, errorCount: 0, warningCount: 0, infoCount: 0 },
  } as unknown as OverviewBuildSummaryData;

  const mockTabManager = {
    renameTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOverviewBuildSummary).mockReturnValue(summaryFixture);
    const api = createNewUnitStore({
      name: 'Legacy overview fixture',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
    });
    api.setState({ id: mockStoreValues.id });
    jest.mocked(useUnitStoreApi).mockReturnValue(api);
    // TS: the test uses a narrowed mock state; suppress strict selector typing
    mockUseUnitStore.mockImplementation((selector) =>
      selector(mockStoreValues as unknown as Parameters<typeof selector>[0]),
    );
    mockUseTabManagerStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        // @ts-expect-error - mock tab manager is partial for testing
        return selector(mockTabManager);
      }
      return undefined;
    });
  });

  it('reads Identity, then the build summary, then component technology', () => {
    render(<OverviewTab />);

    const identity = screen.getByRole('region', { name: 'Identity' });
    const summary = screen.getByTestId('overview-build-summary');
    const tech = screen.getByTestId('overview-component-technology');
    const follows = (a: HTMLElement, b: HTMLElement) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(identity, summary)).toBe(true);
    expect(follows(summary, tech)).toBe(true);
  });

  it('keeps chassis, model, year and tech level ahead of the optional identity fields', () => {
    render(<OverviewTab />);

    const order = [
      'Chassis',
      'Model',
      'Year',
      'Tech Level',
      'Clan Name',
      'MUL ID',
    ];
    const fields = order.map((name) => screen.getByLabelText(name));
    fields.slice(1).forEach((field, index) => {
      expect(
        Boolean(
          fields[index].compareDocumentPosition(field) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ).toBe(true);
    });
  });

  it('lets component technology fill its column so both columns can end together', () => {
    render(<OverviewTab />);

    const tech = screen.getByTestId('overview-component-technology');
    expect(tech).toHaveClass('flex-1');
    expect(tech.querySelector('dl')).toHaveClass('flex-1', 'auto-rows-fr');
  });

  it('should render overview tab', () => {
    render(<OverviewTab />);

    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AS7-D')).toBeInTheDocument();
  });

  it('should display unit information', () => {
    render(<OverviewTab />);

    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2750')).toBeInTheDocument();
    // The header names the tech base only; the Tech Level field below
    // already shows the rules level, so it is not repeated.
    const identity = screen.getByRole('region', { name: 'Identity' });
    expect(
      within(identity).getByRole('heading', { name: 'Identity' })
        .nextElementSibling,
    ).toHaveTextContent(/^Inner Sphere$/);
    // The same 14px secondary meta style as "100.0 / 100.0 t used".
    expect(
      within(identity).getByRole('heading', { name: 'Identity' })
        .nextElementSibling,
    ).toHaveClass('text-sm', 'text-text-theme-secondary');
    // One muted hint style for both parentheticals.
    for (const hint of ['(Optional)', '(Modular equipment pods)'])
      expect(within(identity).getByText(hint)).toHaveClass(
        'text-sm',
        'text-text-theme-muted',
      );
  });

  it('keeps component rows at a 44px pitch in two columns from a 28rem card', () => {
    render(<OverviewTab />);
    const tech = screen.getByTestId('overview-component-technology');
    const list = tech.querySelector('dl')!;
    expect(list).toHaveClass('@md:grid-cols-2', 'auto-rows-fr', 'flex-1');
    for (const row of Array.from(list.children))
      expect(row).toHaveClass('min-h-11');
  });

  it('shows component technology expanded with the editor one click away', async () => {
    const user = userEvent.setup();
    render(<OverviewTab />);

    expect(screen.getByText('Component Technology')).toBeInTheDocument();
    expect(screen.getByText('Standard Fusion 300')).toBeInTheDocument();
    expect(screen.getByText('10 Single Heat Sink')).toBeInTheDocument();

    const disclosure = screen.getByText('Change Tech Base').closest('details');
    expect(disclosure).not.toHaveAttribute('open');

    await user.click(screen.getByText('Change Tech Base'));

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByTestId('tech-base-config')).toBeInTheDocument();
  });

  it('summarizes the build: tonnage split, readouts and equipment count', () => {
    render(<OverviewTab />);

    const summary = screen.getByTestId('overview-build-summary');
    expect(within(summary).getByText('Build Summary')).toBeInTheDocument();
    expect(
      within(summary).getByRole('img', { name: /Tonnage breakdown/ }),
    ).toHaveAccessibleName(
      'Tonnage breakdown: Structure 10.0 t, Engine 19.0 t, Gyro 3.0 t, Cockpit 3.0 t, Heat Sinks 10.0 t, Armor 19.0 t, Equipment 32.0 t, Free 4.0 t',
    );
    expect(within(summary).queryByText('Jump Jets')).not.toBeInTheDocument();
    expect(within(summary).getByText('1,768')).toBeInTheDocument();
    expect(within(summary).getByText('99%')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Equipment summary').querySelector('strong'),
    ).toHaveTextContent('18');
  });

  it('shows tons past the limit as a visible segment, not only a legend entry', () => {
    jest.mocked(useOverviewBuildSummary).mockReturnValue({
      ...summaryFixture,
      stats: { ...summaryFixture.stats, weightUsed: 103, weightRemaining: -3 },
      equipmentWeight: 35,
    });
    render(<OverviewTab />);

    const bar = screen.getByTestId('overview-tonnage-breakdown');
    expect(
      within(bar).getByTestId('overview-tonnage-over'),
    ).toBeInTheDocument();
    expect(within(bar).getByText('Over Limit')).toBeInTheDocument();
    expect(within(bar).getByRole('img')).toHaveAccessibleName(
      expect.stringContaining('Over Limit 3.0 t'),
    );
  });

  it('does not draw an over-limit segment when within the limit', () => {
    render(<OverviewTab />);

    expect(
      screen.queryByTestId('overview-tonnage-over'),
    ).not.toBeInTheDocument();
  });

  it('lists build readiness rows that open the tab that fixes each', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<OverviewTab onNavigate={onNavigate} />);
    // The phone issue summary repeats the failing rows; this list is the card's.
    const card = within(screen.getByTestId('overview-build-summary'));

    expect(card.getByTestId('overview-readiness-weight')).toHaveAttribute(
      'data-status',
      'normal',
    );
    expect(card.getByTestId('overview-readiness-heat')).toHaveAttribute(
      'data-status',
      'warning',
    );
    // Counts only: the header status chip and the Heat row name the warning.
    expect(card.getByTestId('overview-readiness-summary')).toHaveTextContent(
      /^1 warning$/,
    );
    // The Heat readout shows the numbers; the readiness row says what they mean.
    const heatTile = screen.getByTestId('overview-stat-heat');
    expect(heatTile).toHaveTextContent('31 from weapons + 2 from running');
    expect(heatTile).toHaveTextContent('33 / 22 dissipation');
    expect(heatTile).not.toHaveTextContent('over');

    await user.click(
      card.getByRole('button', { name: 'Weight: go to Equipment' }),
    );
    await user.click(card.getByRole('button', { name: 'Armor: go to Armor' }));
    await user.click(
      card.getByRole('button', { name: 'Slots: go to Critical Slots' }),
    );
    await user.click(
      card.getByRole('button', {
        name: 'Unplaced Equipment: go to Critical Slots',
      }),
    );
    await user.click(
      card.getByRole('button', {
        name: 'Runs 11 heat over dissipation: go to Structure',
      }),
    );
    expect(onNavigate.mock.calls.map(([tab]) => tab)).toEqual([
      'equipment',
      'armor',
      'criticals',
      'criticals',
      'structure',
    ]);
  });

  it('opens with the failing readiness rows above Identity for phones', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    render(<OverviewTab onNavigate={onNavigate} />);

    const issues = screen.getByTestId('overview-issue-summary');
    const identity = screen.getByRole('region', { name: 'Identity' });
    expect(
      issues.compareDocumentPosition(identity) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Phones only: wider canvases keep Identity first and the list in the card.
    expect(issues).toHaveClass('sm:hidden');
    expect(
      within(issues).getByRole('heading', { name: 'Needs Attention' }),
    ).toBeInTheDocument();
    expect(
      within(issues).getByTestId('overview-issues-summary'),
    ).toHaveTextContent(/^1 warning$/);
    // Only rows that are not passing, each with its link to the fixing tab.
    expect(within(issues).getByTestId('overview-issues-heat')).toHaveAttribute(
      'data-severity',
      'warning',
    );
    expect(within(issues).queryByTestId('overview-issues-weight')).toBeNull();
    // The heading block has room before the first row on the phone card.
    expect(within(issues).getByRole('list')).toHaveClass('mt-3');
    await user.click(
      within(issues).getByRole('button', {
        name: 'Runs 11 heat over dissipation: go to Structure',
      }),
    );
    expect(onNavigate).toHaveBeenCalledWith('structure');
  });

  it('keeps Identity first when every readiness row passes', () => {
    jest.mocked(useOverviewBuildSummary).mockReturnValue({
      ...summaryFixture,
      stats: {
        ...summaryFixture.stats,
        heatGenerated: 20,
        heatGeneration: undefined,
      },
    });
    render(<OverviewTab />);

    expect(screen.queryByTestId('overview-issue-summary')).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Identity' }),
    ).toBeInTheDocument();
  });

  it('omits readiness buttons when no navigation is available', () => {
    render(<OverviewTab />);

    expect(
      screen.queryByRole('button', { name: /go to Equipment/ }),
    ).not.toBeInTheDocument();
  });
  it('should call setChassis when chassis changes', async () => {
    const user = userEvent.setup();
    render(<OverviewTab />);

    const chassisInput = screen.getByDisplayValue('Atlas');
    await user.clear(chassisInput);
    await user.type(chassisInput, 'Marauder');

    expect(mockStoreValues.setChassis).toHaveBeenCalled();
  });

  it('should display read-only message when in read-only mode', () => {
    render(<OverviewTab readOnly={true} />);

    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<OverviewTab className="custom-class" />);

    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});
