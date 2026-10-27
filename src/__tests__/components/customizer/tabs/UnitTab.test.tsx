import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UnitTab } from '@/components/customizer/tabs/UnitTab';

describe('UnitTab', () => {
  const defaultProps = {
    tab: {
      id: 'tab-1',
      name: 'Atlas AS7-D',
      isModified: false,
    },
    isActive: false,
    canClose: true,
    onSelect: jest.fn(),
    onClose: jest.fn(),
    onRename: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tab name', () => {
    render(<UnitTab {...defaultProps} />);

    expect(screen.getByText('Atlas AS7-D')).toBeInTheDocument();
  });

  it('keeps the tab name on one line, ellipsized, with its complete accessible name', () => {
    const name = 'Atlas AS7-D (Custom long-range fire support configuration)';
    render(
      <UnitTab
        {...defaultProps}
        isActive
        tab={{ ...defaultProps.tab, name }}
      />,
    );
    expect(screen.getByRole('tab', { name })).toHaveTextContent(name);
    // One line with an ellipsis at every width, phones included; the tab's
    // name and tooltip keep the full name.
    expect(screen.getByText(name)).toHaveClass('truncate');
    expect(screen.getByText(name).className).not.toMatch(
      /line-clamp|whitespace-normal/,
    );
    expect(screen.getByRole('tab', { name })).toHaveAttribute(
      'title',
      expect.stringContaining(name),
    );
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    render(<UnitTab {...defaultProps} />);

    const tab = screen.getByRole('tab', { name: 'Atlas AS7-D' });
    if (tab) {
      await user.click(tab);
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<UnitTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Close Atlas AS7-D' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('should enter edit mode on double-click', async () => {
    const user = userEvent.setup();
    render(<UnitTab {...defaultProps} />);

    const tab = screen.getByRole('tab', { name: 'Atlas AS7-D' });
    if (tab) {
      await user.dblClick(tab);
      const input = screen.getByDisplayValue('Atlas AS7-D');
      expect(input).toBeInTheDocument();
    }
  });

  it('should call onRename when name is edited', async () => {
    const user = userEvent.setup();
    render(<UnitTab {...defaultProps} />);

    const tab = screen.getByRole('tab', { name: 'Atlas AS7-D' });
    if (tab) {
      await user.dblClick(tab);
      const input = screen.getByDisplayValue('Atlas AS7-D');
      await user.clear(input);
      await user.type(input, 'Marauder');
      await user.keyboard('{Enter}');

      expect(defaultProps.onRename).toHaveBeenCalledWith('Marauder');
    }
  });

  it('should highlight active tab', () => {
    const { container } = render(<UnitTab {...defaultProps} isActive={true} />);

    // The outer div has the bg-surface-raised class when active
    const tab = container.firstChild as HTMLElement;
    expect(tab).toHaveClass('bg-surface-raised');
  });

  it('should show modification indicator', () => {
    render(
      <UnitTab
        {...defaultProps}
        tab={{ ...defaultProps.tab, isModified: true }}
      />,
    );

    // Background tabs mark unsaved changes with a named dot.
    const indicator = screen.getByRole('img', {
      name: 'Changes not saved to library',
    });
    expect(indicator).toHaveAttribute('title', 'Changes not saved to library');
    expect(indicator).toHaveClass('bg-accent');
  });

  it('leaves the active tab unmarked: the Save button shows its save state', () => {
    render(
      <UnitTab
        {...defaultProps}
        isActive
        tab={{ ...defaultProps.tab, isModified: true }}
      />,
    );
    expect(
      screen.queryByRole('img', { name: 'Changes not saved to library' }),
    ).toBeNull();
  });
});
