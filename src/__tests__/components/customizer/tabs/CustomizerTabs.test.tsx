import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
  useCustomizerTabs,
} from '@/components/customizer/tabs/CustomizerTabs';

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

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Structure')).toBeInTheDocument();
    expect(screen.getByText('Armor')).toBeInTheDocument();
    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByText('Critical Slots')).toBeInTheDocument();
    expect(screen.getByText('Fluff')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByText('Armor').closest('button');
    expect(armorTab).toHaveClass('text-accent');
    expect(armorTab).toHaveClass('border-accent');
  });

  it('should call onTabChange when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<CustomizerTabs {...defaultProps} />);

    const structureTab = screen.getByText('Structure');
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

    const disabledTab = screen.getByText('Disabled');
    await user.click(disabledTab);

    expect(defaultProps.onTabChange).not.toHaveBeenCalled();
  });

  it('should set correct aria attributes', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByText('Armor').closest('button');
    expect(armorTab).toHaveAttribute('aria-selected', 'true');
    expect(armorTab).toHaveAttribute('aria-controls', 'tabpanel-armor');

    const overviewTab = screen.getByText('Overview').closest('button');
    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should set correct tabIndex', () => {
    render(<CustomizerTabs {...defaultProps} activeTab="armor" />);

    const armorTab = screen.getByText('Armor').closest('button');
    expect(armorTab).toHaveAttribute('tabIndex', '0');

    const overviewTab = screen.getByText('Overview').closest('button');
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
