import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TabBar, TabDisplayInfo } from '@/components/customizer/tabs/TabBar';

// Mock UnitTab component
jest.mock('@/components/customizer/tabs/UnitTab', () => ({
  UnitTab: ({
    tab,
    isActive,
    onSelect,
    onClose,
    onRename,
  }: {
    tab: { id: string; name: string };
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
    onRename: (name: string) => void;
  }) => (
    <div data-testid={`tab-${tab.id}`} data-active={isActive}>
      <button onClick={onSelect}>{tab.name}</button>
      <button onClick={onClose}>×</button>
      <button onClick={() => onRename('Renamed')}>Rename</button>
    </div>
  ),
}));

describe('TabBar', () => {
  const createTab = (overrides?: Partial<TabDisplayInfo>): TabDisplayInfo => ({
    id: 'tab-1',
    name: 'Unit 1',
    isModified: false,
    ...overrides,
  });

  const defaultProps = {
    tabs: [createTab()],
    activeTabId: 'tab-1',
    onSelectTab: jest.fn(),
    onCloseTab: jest.fn(),
    onRenameTab: jest.fn(),
    onLoadUnit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tabs', () => {
    render(<TabBar {...defaultProps} />);

    expect(screen.getByTestId('tab-tab-1')).toBeInTheDocument();
    expect(screen.getByText('Unit 1')).toBeInTheDocument();
  });

  it('should render multiple tabs', () => {
    const tabs = [
      createTab({ id: 'tab-1', name: 'Unit 1' }),
      createTab({ id: 'tab-2', name: 'Unit 2' }),
    ];

    render(<TabBar {...defaultProps} tabs={tabs} />);

    expect(screen.getByTestId('tab-tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tab-2')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<TabBar {...defaultProps} />);

    const tab = screen.getByTestId('tab-tab-1');
    expect(tab).toHaveAttribute('data-active', 'true');
  });

  it('should not highlight inactive tab', () => {
    render(<TabBar {...defaultProps} activeTabId="tab-2" />);

    const tab = screen.getByTestId('tab-tab-1');
    expect(tab).toHaveAttribute('data-active', 'false');
  });

  it('should call onSelectTab when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<TabBar {...defaultProps} />);

    const tabButton = screen.getByText('Unit 1');
    await user.click(tabButton);

    expect(defaultProps.onSelectTab).toHaveBeenCalledWith('tab-1');
  });

  it('should call onCloseTab when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<TabBar {...defaultProps} />);

    const closeButton = screen.getByText('×');
    await user.click(closeButton);

    expect(defaultProps.onCloseTab).toHaveBeenCalledWith('tab-1');
  });

  it('should call onRenameTab when rename is triggered', async () => {
    const user = userEvent.setup();
    render(<TabBar {...defaultProps} />);

    const renameButton = screen.getByText('Rename');
    await user.click(renameButton);

    expect(defaultProps.onRenameTab).toHaveBeenCalledWith('tab-1', 'Renamed');
  });

  it('keeps unit creation out of the actions menu', async () => {
    const user = userEvent.setup();
    render(
      <TabBar {...defaultProps} onImport={jest.fn()} onExport={jest.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Unit Actions' }));
    expect(
      screen.queryByRole('button', { name: 'New unit' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Import from Bundle' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Export Active Unit' }),
    ).toBeInTheDocument();
  });

  it('should call onLoadUnit when load unit button is clicked', async () => {
    const user = userEvent.setup();
    render(<TabBar {...defaultProps} />);

    const loadButton = screen.getByRole('button', {
      name: 'Add Unit (Ctrl+O)',
    });
    await user.click(loadButton);

    expect(defaultProps.onLoadUnit).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TabBar {...defaultProps} className="custom-class" />,
    );

    const tabBar = container.firstChild;
    expect(tabBar).toHaveClass('custom-class');
  });

  it('should handle empty tabs array', () => {
    render(<TabBar {...defaultProps} tabs={[]} />);

    expect(screen.queryByTestId(/tab-/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unit Actions' }),
    ).toBeInTheDocument();
  });

  it('explains why saved history is unavailable and keeps it disabled', async () => {
    const user = userEvent.setup();
    render(
      <TabBar
        {...defaultProps}
        onOpenSavedHistory={jest.fn()}
        savedHistoryDisabledReason="Save this unit to the library before viewing history."
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unit Actions' }));
    const historyButton = screen.getByRole('button', { name: 'Saved History' });
    expect(historyButton).toBeDisabled();
    expect(historyButton).toHaveAccessibleDescription(
      /save this unit to the library/i,
    );
  });

  it('opens saved history from unit actions when a library identity exists', async () => {
    const user = userEvent.setup();
    const onOpenSavedHistory = jest.fn();
    render(
      <TabBar
        {...defaultProps}
        onOpenSavedHistory={onOpenSavedHistory}
        savedHistoryDisabledReason={null}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unit Actions' }));
    await user.click(screen.getByRole('button', { name: 'Saved History' }));
    expect(onOpenSavedHistory).toHaveBeenCalledTimes(1);
  });
});
