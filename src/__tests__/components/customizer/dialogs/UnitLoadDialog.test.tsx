import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));

// Mock ModalOverlay
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="modal-overlay">{children}</div> : null),
}));

// Mock services
jest.mock('@/services/units/CanonicalUnitService', () => {
  const _mock_canonicalUnitService = {
    getIndex: jest.fn(),
  };
  return {
    getCanonicalUnitService: () => _mock_canonicalUnitService,
  };
});

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    list: jest.fn(),
  },
}));

describe('UnitLoadDialog', () => {
  const defaultProps = {
    isOpen: true,
    onLoadUnit: jest.fn(),
    onCancel: jest.fn(),
  };

  const mockCanonicalUnit = {
    id: 'atlas-as7-d',
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    era: 'AGE_OF_WAR',
    weightClass: WeightClass.ASSAULT,
    unitType: 'BattleMech',
    name: 'Atlas AS7-D',
    filePath: '/data/units/atlas-as7-d.json',
  };

  const mockCustomUnit = {
    id: 'custom-1',
    chassis: 'Custom',
    variant: 'C-1',
    tonnage: 50,
    techBase: TechBase.CLAN,
    era: 'CLAN_INVASION',
    weightClass: WeightClass.MEDIUM,
    unitType: 'BattleMech',
    currentVersion: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCanonicalUnitService().getIndex as jest.Mock).mockResolvedValue([
      mockCanonicalUnit,
    ]);
    (customUnitApiService.list as jest.Mock).mockResolvedValue([
      mockCustomUnit,
    ]);
  });

  it('should render when open', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    });
  });

  it('sorts names ignoring leading punctuation while preserving labels and custom priority', async () => {
    (getCanonicalUnitService().getIndex as jest.Mock).mockResolvedValue([
      { ...mockCanonicalUnit, id: 'wing', chassis: "'Wing' Wraith" },
      { ...mockCanonicalUnit, id: 'battle', chassis: '“Battle Tripod”' },
      mockCanonicalUnit,
    ]);
    render(<UnitLoadDialog {...defaultProps} />);
    await screen.findByText('Atlas');
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(
      rows.map((row) =>
        within(row).getAllByRole('cell')[0].textContent?.trim(),
      ),
    ).toEqual(['Custom', 'Atlas', '“Battle Tripod”', "'Wing' Wraith"]);
  });

  it('should not render when closed', () => {
    render(<UnitLoadDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should load units when dialog opens', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(getCanonicalUnitService().getIndex).toHaveBeenCalled();
      expect(customUnitApiService.list).toHaveBeenCalled();
    });
  });

  it('should display loading state', () => {
    (getCanonicalUnitService().getIndex as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<UnitLoadDialog {...defaultProps} />);

    expect(screen.getByText(/Loading units/i)).toBeInTheDocument();
  });

  it.each(['loading', 'failed'])(
    'allows a blank unit while the catalog is %s',
    async (state) => {
      (getCanonicalUnitService().getIndex as jest.Mock).mockImplementation(() =>
        state === 'loading'
          ? new Promise(() => {})
          : Promise.reject(new Error('Unavailable')),
      );
      const onCreateBlankUnit = jest.fn();
      render(
        <UnitLoadDialog
          {...defaultProps}
          onCreateBlankUnit={onCreateBlankUnit}
        />,
      );
      if (state === 'failed') await screen.findByRole('alert');
      expect(
        screen.getByRole('heading', { name: 'Add Unit' }),
      ).toBeInTheDocument();
      const button = screen.getByRole('button', { name: 'New Blank Unit' });
      expect(button).toBeEnabled();
      await userEvent.click(button);
      expect(onCreateBlankUnit).toHaveBeenCalledTimes(1);
      expect(defaultProps.onLoadUnit).not.toHaveBeenCalled();
    },
  );

  it('should display units in table', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
      expect(screen.getByText('AS7-D')).toBeInTheDocument();
      // Check for variant which is unique
      expect(screen.getByText('C-1')).toBeInTheDocument();
      // Check that Custom appears (multiple instances are expected)
      expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    });
  });

  it('explains the blank starting unit and why Load Unit is disabled', async () => {
    render(<UnitLoadDialog {...defaultProps} onCreateBlankUnit={jest.fn()} />);
    const explanation = screen.getByText('A 50-ton Inner Sphere Mech.');
    expect(explanation).not.toHaveClass('hidden');
    expect(
      screen.getByRole('button', { name: 'New Blank Unit' }),
    ).toHaveAccessibleDescription(explanation.textContent ?? '');
    const load = screen.getByRole('button', { name: 'Load Unit' });
    expect(load).toBeDisabled();
    expect(load).toHaveClass(
      'border',
      // Shared disabled style: solid default outline (never dashed), no fill,
      // slightly dimmed text.
      'disabled:!border-solid',
      'disabled:!border-border-theme',
      'disabled:!bg-transparent',
      'disabled:!text-text-theme-secondary/85',
      'disabled:!opacity-100',
      'disabled:!cursor-not-allowed',
    );
    expect(load).not.toHaveClass('disabled:!border-dashed');
    expect(load).toHaveAccessibleDescription('Select a unit to load');
    // The reason sits right beside the disabled button, after Cancel; on
    // phones the stacked footer keeps that order, so it reads directly above
    // the button at 13px.
    const reason = screen.getByText('Select a unit to load');
    expect(reason.nextElementSibling).toBe(load);
    expect(reason).not.toHaveClass('order-last');
    expect(reason).toHaveClass('text-[13px]');
    await userEvent.click(await screen.findByText('AS7-D'));
    expect(load).toBeEnabled();
    expect(screen.queryByText('Select a unit to load')).not.toBeInTheDocument();
  });

  it('puts New Blank Unit and the settings step side by side, each with its own caption under it', () => {
    render(
      <UnitLoadDialog
        {...defaultProps}
        onCreateBlankUnit={jest.fn()}
        onConfigureNewUnit={jest.fn()}
      />,
    );

    const blank = screen.getByRole('button', { name: 'New Blank Unit' });
    const settings = screen.getByRole('button', {
      name: 'Set Up a New Unit…',
    });
    // Two columns in one row: each button owns the caption right under it.
    const blankColumn = blank.parentElement as HTMLElement;
    const settingsColumn = settings.parentElement as HTMLElement;
    expect(blankColumn).not.toBe(settingsColumn);
    expect(blankColumn.parentElement).toBe(settingsColumn.parentElement);
    expect(blankColumn.nextElementSibling).toBe(settingsColumn);
    expect(blank.nextElementSibling).toHaveTextContent(
      'A 50-ton Inner Sphere Mech.',
    );
    expect(settings.nextElementSibling).toHaveTextContent(
      'Pick type, tonnage and tech.',
    );
    // The blank-unit caption describes only the blank-unit button.
    expect(blank).toHaveAccessibleDescription('A 50-ton Inner Sphere Mech.');
    expect(settings).toHaveAccessibleDescription(
      'Pick type, tonnage and tech.',
    );
    expect(blank.className).toContain('h-11');
    expect(settings.className).toContain('h-11');
    expect(blank.className).toContain('dialog-btn-primary');
    expect(settings.className).not.toContain('dialog-btn-primary');
  });

  it('marks the selected catalog row with a tint, accent bar and check', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);
    const row = await screen.findByRole('row', { name: /Atlas/ });
    expect(row).not.toHaveClass('dialog-table-row-selected');

    await user.click(row);

    expect(row).toHaveClass('dialog-table-row-selected');
    expect(row.className).toContain('inset_3px_0_0_var(--accent-primary)');
    expect(row.querySelector('svg')).not.toBeNull();
  });

  it('shows a dash for units without a role', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await screen.findByText('AS7-D');
    const row = screen.getByText('AS7-D').closest('tr') as HTMLElement;
    expect(within(row).getAllByText('\u2014').length).toBeGreaterThan(0);
  });

  it('should filter units by search query', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by chassis/i);
    await user.type(searchInput, 'Custom');

    await waitFor(() => {
      expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
      // Check for the variant which is unique to custom unit
      expect(screen.getByText('C-1')).toBeInTheDocument();
    });
  });

  it('should filter units by tech base', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });

    const techBaseSelect = screen.getByDisplayValue(/All Tech Bases/i);
    await user.selectOptions(techBaseSelect, TechBase.CLAN);

    await waitFor(() => {
      expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
      // Check for the variant which is unique to custom unit
      expect(screen.getByText('C-1')).toBeInTheDocument();
    });
  });

  it('should filter units by weight class', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });

    const weightClassSelect = screen.getByDisplayValue(/All Weight Classes/i);
    await user.selectOptions(weightClassSelect, WeightClass.ASSAULT);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
      expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    });
  });

  it('should filter units by source', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });

    const sourceSelect = screen.getByDisplayValue(/All Sources/i);
    await user.selectOptions(sourceSelect, 'custom');

    await waitFor(() => {
      expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
      // Check for the variant which is unique to custom unit
      expect(screen.getByText('C-1')).toBeInTheDocument();
    });
  });

  it('should display unit rows', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });
  });

  it('selects a catalog row by keyboard and loads the selected unit', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);
    const row = await screen.findByRole('row', { name: /Atlas/ });
    expect(screen.getByRole('button', { name: 'Load Unit' })).toBeDisabled();
    row.focus();
    await user.keyboard(' ');
    expect(row).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Load Unit' }));
    expect(defaultProps.onLoadUnit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atlas-as7-d' }),
      'canonical',
    );
  });

  it('loads a catalog row on double-click', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);
    await user.dblClick(await screen.findByRole('row', { name: /Atlas/ }));
    expect(defaultProps.onLoadUnit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atlas-as7-d' }),
      'canonical',
    );
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(async () => {
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);
    });

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should display empty state when no units match filters', async () => {
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Atlas')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by chassis/i);
    await user.type(searchInput, 'NonExistentUnit');

    await waitFor(() => {
      expect(screen.getByText(/No units found/i)).toBeInTheDocument();
    });
  });
  it('offers a working retry when the catalog request fails', async () => {
    (getCanonicalUnitService().getIndex as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([mockCanonicalUnit]);
    const user = userEvent.setup();
    render(<UnitLoadDialog {...defaultProps} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the library',
    );
    await user.click(
      screen.getByRole('button', { name: 'Retry Loading Library' }),
    );
    expect(await screen.findByText('Atlas')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables repeated load-button actions but permits cancellation and a new selection', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    const { rerender } = render(
      <UnitLoadDialog
        {...defaultProps}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(await screen.findByText('Atlas'));
    await user.click(screen.getByRole('button', { name: 'Load Unit' }));
    expect(defaultProps.onLoadUnit).toHaveBeenCalledTimes(1);
    rerender(
      <UnitLoadDialog
        {...defaultProps}
        onSelectionChange={onSelectionChange}
        isLoadingUnit
      />,
    );
    const loading = screen.getByRole('button', { name: 'Loading Unit…' });
    expect(loading).toBeDisabled();
    await user.click(loading);
    expect(defaultProps.onLoadUnit).toHaveBeenCalledTimes(1);
    onSelectionChange.mockClear();
    await user.click(screen.getByText('Atlas'));
    expect(onSelectionChange).not.toHaveBeenCalled();
    await user.click(screen.getByText('C-1'));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('clears a selection when filtering hides its source', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    render(
      <UnitLoadDialog
        {...defaultProps}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(await screen.findByText('Atlas'));
    onSelectionChange.mockClear();
    await user.selectOptions(screen.getByDisplayValue('All Sources'), 'custom');
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Load Unit' })).toBeDisabled();
  });

  it('ignores an earlier catalog response after the dialog is reopened', async () => {
    let finishOld!: (value: unknown) => void;
    (getCanonicalUnitService().getIndex as jest.Mock)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishOld = resolve;
        }),
      )
      .mockResolvedValueOnce([
        { ...mockCanonicalUnit, chassis: 'New Catalog Atlas' },
      ]);
    const { rerender } = render(<UnitLoadDialog {...defaultProps} />);
    rerender(<UnitLoadDialog {...defaultProps} isOpen={false} />);
    rerender(<UnitLoadDialog {...defaultProps} />);
    expect(await screen.findByText('New Catalog Atlas')).toBeVisible();
    await act(async () => finishOld([mockCanonicalUnit]));
    expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
    expect(screen.getByText('New Catalog Atlas')).toBeVisible();
  });
});
