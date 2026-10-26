import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
  useCustomizerTabs,
} from '@/components/customizer/tabs/CustomizerTabs';
import { createEmptyValidationCounts } from '@/utils/validation/validationNavigation';

// Mock keyboard navigation hook
jest.mock('@/hooks/useKeyboardNavigation', () => ({
  useTabKeyboardNavigation: jest.fn(() => jest.fn()),
}));

describe('CustomizerTabs', () => {
  const defaultProps = {
    tabs: DEFAULT_CUSTOMIZER_TABS,
    activeTab: 'overview',
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all tabs', () => {
    render(<CustomizerTabs {...defaultProps} />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Structure' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Armor' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Equipment' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Critical Slots' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Fluff' })).toBeInTheDocument();
  });

  it('shows validation counts as shaped, numbered badges in a fixed slot', () => {
    const counts = createEmptyValidationCounts();
    counts.structure = { errors: 2, warnings: 1, infos: 0 };
    const { rerender } = render(
      <CustomizerTabs {...defaultProps} validationCounts={counts} />,
    );
    const tab = screen.getByRole('tab', { name: 'Structure' });
    const dot = tab.querySelector('[data-severity]');
    expect(dot).toHaveAttribute('data-severity', 'error');
    expect(dot).toHaveAccessibleName('Structure: 2 errors, 1 warning');
    expect(tab).toHaveAccessibleDescription('2 errors, 1 warning');
    // Shape and count, not color alone.
    expect(
      dot!.querySelector('[data-section-badge="error"]'),
    ).toHaveTextContent(/^2$/);
    expect(
      dot!.querySelector('[data-section-badge="warning"]'),
    ).toHaveTextContent(/^1$/);

    rerender(
      <CustomizerTabs
        {...defaultProps}
        validationCounts={{
          ...counts,
          structure: { errors: 0, warnings: 1, infos: 0 },
        }}
      />,
    );
    expect(dot).toHaveAttribute('data-severity', 'warning');
    expect(dot).toHaveAccessibleName('Structure: 1 warning');
    expect(dot!.querySelector('[data-section-badge="error"]')).toBeNull();

    rerender(
      <CustomizerTabs
        {...defaultProps}
        validationCounts={createEmptyValidationCounts()}
      />,
    );
    expect(dot).toBeInTheDocument();
    expect(dot).not.toHaveAttribute('data-severity');
    expect(tab).not.toHaveAttribute('aria-describedby');
  });

  it('lists the issues behind a badge in a tooltip on hover and keyboard focus', async () => {
    const user = userEvent.setup();
    const counts = createEmptyValidationCounts();
    counts.structure = { errors: 0, warnings: 1, infos: 0 };
    render(
      <CustomizerTabs
        {...defaultProps}
        validationCounts={counts}
        issueTitles={{
          structure: { errors: [], warnings: ['Runs hot'] },
        }}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'Structure' });
    const badge = tab.querySelector('[data-tab-badge]')!;
    // The tooltip replaces the slower native title, never doubles it.
    expect(badge).not.toHaveAttribute('title');
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.hover(badge);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '1 warning: Runs hot',
    );
    await user.unhover(badge);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Keyboard users get the same words from the tab itself.
    act(() => tab.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '1 warning: Runs hot',
    );
    expect(tab).toHaveAccessibleDescription('1 warning: Runs hot');
    act(() => tab.blur());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps the count title when no issue titles are supplied', () => {
    const counts = createEmptyValidationCounts();
    counts.structure = { errors: 0, warnings: 1, infos: 0 };
    render(<CustomizerTabs {...defaultProps} validationCounts={counts} />);
    const badge = screen
      .getByRole('tab', { name: 'Structure' })
      .querySelector('[data-tab-badge]')!;
    expect(badge).toHaveAttribute('title', 'Structure: 1 warning');
  });

  it('should highlight active tab', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByRole('tab', { name: 'Armor' });
    expect(armorTab).toHaveClass('text-accent');
    expect(armorTab).toHaveClass('border-accent');
  });

  it('should call onTabChange when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<CustomizerTabs {...defaultProps} />);

    const structureTab = screen.getByRole('tab', { name: 'Structure' });
    await user.click(structureTab);

    expect(defaultProps.onTabChange).toHaveBeenCalledWith('structure');
  });

  it('should not call onTabChange when disabled tab is clicked', async () => {
    const user = userEvent.setup();
    const tabs = [
      ...DEFAULT_CUSTOMIZER_TABS,
      { id: 'disabled', label: 'Disabled', disabled: true },
    ];

    render(<CustomizerTabs {...defaultProps} tabs={tabs} />);

    const disabledTab = screen.getByRole('tab', { name: 'Disabled' });
    await user.click(disabledTab);

    expect(defaultProps.onTabChange).not.toHaveBeenCalled();
  });

  it('should set correct aria attributes', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByRole('tab', { name: 'Armor' });
    expect(armorTab).toHaveAttribute('aria-selected', 'true');
    expect(armorTab).toHaveAttribute('aria-controls', 'tabpanel-armor');

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should set correct tabIndex', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByRole('tab', { name: 'Armor' });
    expect(armorTab).toHaveAttribute('tabIndex', '0');

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    expect(overviewTab).toHaveAttribute('tabIndex', '-1');
  });

  it('should apply read-only styles when readOnly is true', () => {
    render(<CustomizerTabs {...defaultProps} readOnly={true} />);

    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('pointer-events-none');
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CustomizerTabs {...defaultProps} className="custom-class" />,
    );

    // className is applied to the outer container div, not the tablist
    const outerContainer = container.firstChild;
    expect(outerContainer).toHaveClass('custom-class');
  });

  it('should render tab icons when provided', () => {
    const tabs = [
      { id: 'test', label: 'Test', icon: <span data-testid="icon">Icon</span> },
    ];

    render(<CustomizerTabs {...defaultProps} tabs={tabs} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('useCustomizerTabs hook', () => {
  it('should initialize with default tab', () => {
    const TestComponent = () => {
      const { activeTab, currentTab } = useCustomizerTabs();
      return (
        <div>
          {activeTab} - {currentTab.label}
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('overview - Overview')).toBeInTheDocument();
  });

  it('should initialize with custom initial tab', () => {
    const TestComponent = () => {
      const { activeTab, currentTab } = useCustomizerTabs('armor');
      return (
        <div>
          {activeTab} - {currentTab.label}
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('armor - Armor')).toBeInTheDocument();
  });

  it('should return setActiveTab function', () => {
    const TestComponent = () => {
      const { activeTab, setActiveTab } = useCustomizerTabs();
      return (
        <div>
          <span>{activeTab}</span>
          <button onClick={() => setActiveTab('armor')}>Change</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('overview')).toBeInTheDocument();
  });
});
