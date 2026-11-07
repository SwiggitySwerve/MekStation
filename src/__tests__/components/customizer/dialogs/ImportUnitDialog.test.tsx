import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ImportUnitDialog } from '@/components/customizer/dialogs/ImportUnitDialog';
import fixtures from '@/services/conversion/__tests__/MTFParser.pinned-sources.json';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

const source = fixtures.rows.find((row) =>
  row.path.endsWith('/Annihilator ANH-3A.mtf'),
)!;
const mtf = Buffer.from(source.base64, 'base64').toString('utf8');
function file(name: string, text: string): File {
  return Object.assign(new File([text], name), { text: async () => text });
}

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

// Mock CustomUnitApiService
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    importUnit: jest.fn(),
  },
}));

describe('ImportUnitDialog', () => {
  const defaultProps = {
    isOpen: true,
    onImportSuccess: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (customUnitApiService.importUnit as jest.Mock).mockResolvedValue({
      success: true,
      unitId: 'unit-1',
      unitName: 'Atlas AS7-D',
    });
  });

  it('should render when open', () => {
    render(<ImportUnitDialog {...defaultProps} />);

    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ImportUnitDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportUnitDialog {...defaultProps} />);

    // Use the Cancel button which has clear text
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['selection', 'drop'])(
    'imports MTF by %s through the source API payload',
    async (mode) => {
      jest
        .mocked(customUnitApiService.importUnit)
        .mockResolvedValue({ success: true, id: 'custom-mtf' });
      const { container } = render(<ImportUnitDialog {...defaultProps} />);
      const input =
        container.querySelector<HTMLInputElement>('input[type="file"]')!;
      const sourceFile = file('unit.mtf', mtf);
      if (mode === 'selection')
        fireEvent.change(input, { target: { files: [sourceFile] } });
      else
        fireEvent.drop(input.parentElement!, {
          dataTransfer: { files: [sourceFile] },
        });
      await screen.findByText('Ready to Import');
      expect(input).toHaveAttribute('accept', '.json,.mtf');
      await userEvent.click(screen.getByRole('button', { name: 'Import' }));
      expect(customUnitApiService.importUnit).toHaveBeenCalledWith({
        sourceFormat: 'mtf',
        sourceText: mtf,
      });
      expect(defaultProps.onImportSuccess).toHaveBeenCalledWith(
        'custom-mtf',
        'Annihilator ANH-3A',
      );
    },
  );

  it('retries an MTF conflict with a variant override while retaining source text', async () => {
    jest
      .mocked(customUnitApiService.importUnit)
      .mockResolvedValueOnce({
        success: false,
        requiresRename: true,
        suggestedName: {
          chassis: 'Annihilator',
          variant: 'ANH-3A',
          suggestedVariant: 'ANH-3A-Custom-1',
        },
      })
      .mockResolvedValueOnce({ success: true, id: 'custom-renamed' });
    const { container } = render(<ImportUnitDialog {...defaultProps} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file('unit.mtf', mtf)] },
    });
    await screen.findByText('Ready to Import');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await screen.findByText('Name Conflict');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Import with Alternate Name' }),
    );
    const name = screen.getByPlaceholderText('New variant name');
    await userEvent.clear(name);
    await userEvent.type(name, 'ANH-3A-Renamed');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(customUnitApiService.importUnit).toHaveBeenLastCalledWith({
      sourceFormat: 'mtf',
      sourceText: mtf,
      variant: 'ANH-3A-Renamed',
    });
    expect(defaultProps.onImportSuccess).toHaveBeenCalledWith(
      'custom-renamed',
      'Annihilator ANH-3A-Renamed',
    );
  });

  it.each(['selection', 'drop'])(
    'keeps JSON %s working and clears an earlier preview after an unsupported drop',
    async (mode) => {
      const { container } = render(<ImportUnitDialog {...defaultProps} />);
      const input = container.querySelector('input[type="file"]')!;
      const data = { chassis: 'Atlas', model: 'AS7-D' };
      const jsonFile = file('unit.json', JSON.stringify(data));
      if (mode === 'selection')
        fireEvent.change(input, { target: { files: [jsonFile] } });
      else
        fireEvent.drop(input.parentElement!, {
          dataTransfer: { files: [jsonFile] },
        });
      await screen.findByText('Ready to Import');
      await userEvent.click(screen.getByRole('button', { name: 'Import' }));
      expect(customUnitApiService.importUnit).toHaveBeenCalledWith(data);
      fireEvent.drop(input.parentElement!, {
        dataTransfer: { files: [file('unit.blk', mtf)] },
      });
      await screen.findByText(/JSON or MTF file/i);
      expect(screen.queryByText('Ready to Import')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    },
  );

  it('shows MTF field diagnostics and source warnings without importing unsupported data', async () => {
    const unsupported = fixtures.rows.find((row) =>
      row.fields.Config.includes('FrankenMek'),
    )!;
    const { container } = render(<ImportUnitDialog {...defaultProps} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [
          file(
            'unsupported.mtf',
            Buffer.from(unsupported.base64, 'base64').toString('utf8'),
          ),
        ],
      },
    });
    expect(
      await screen.findByText(/configuration[\s\S]*FrankenMek/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(customUnitApiService.importUnit).not.toHaveBeenCalled();
  });
});
