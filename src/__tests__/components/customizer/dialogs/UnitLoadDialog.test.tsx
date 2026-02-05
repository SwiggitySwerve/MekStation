import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

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
jest.mock('@/services/units/CanonicalUnitService', () => ({
  canonicalUnitService: {
    getIndex: jest.fn(),
  },
}));

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
    (canonicalUnitService.getIndex as jest.Mock).mockResolvedValue([
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

  it('should not render when closed', () => {
    render(<UnitLoadDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should load units when dialog opens', async () => {
    render(<UnitLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(canonicalUnitService.getIndex).toHaveBeenCalled();
      expect(customUnitApiService.list).toHaveBeenCalled();
    });
  });

  it('should display loading state', () => {
    (canonicalUnitService.getIndex as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<UnitLoadDialog {...defaultProps} />);

    expect(screen.getByText(/Loading units/i)).toBeInTheDocument();
  });

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
});
