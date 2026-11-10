import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { useVersionHistoryDialog } from '@/components/customizer/dialogs/useVersionHistoryDialog';
import { VersionHistoryDialog } from '@/components/customizer/dialogs/VersionHistoryDialog';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="modal-overlay">{children}</div> : null),
}));

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    getVersionHistory: jest.fn(),
    getVersion: jest.fn(),
    revert: jest.fn(),
  },
}));

describe('VersionHistoryDialog', () => {
  const defaultProps = {
    isOpen: true,
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    currentVersion: 3,
    onRevert: jest.fn(),
    onClose: jest.fn(),
  };

  const mockVersions = [
    {
      version: 1,
      savedAt: '2024-01-01T00:00:00.000Z',
      notes: null,
      revertSource: null,
    },
    {
      version: 2,
      savedAt: '2024-01-02T00:00:00.000Z',
      notes: null,
      revertSource: null,
    },
    {
      version: 3,
      savedAt: '2024-01-03T00:00:00.000Z',
      notes: null,
      revertSource: null,
    },
  ];

  function versionPayload(version: number, chassis: string) {
    return {
      version,
      savedAt: '2024-01-01T00:00:00.000Z',
      notes: null,
      revertSource: null,
      data: {
        id: 'unit-1',
        unitType: 'BattleMech',
        chassis,
        variant: 'AS7-D',
        tonnage: 100,
        techBase: 'INNER_SPHERE',
        era: 'Succession Wars',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (customUnitApiService.getVersionHistory as jest.Mock).mockResolvedValue(
      mockVersions,
    );
    (customUnitApiService.getVersion as jest.Mock).mockImplementation(
      (_id: string, version: number) =>
        Promise.resolve(versionPayload(version, `Chassis-${version}`)),
    );
    (customUnitApiService.revert as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'unit-1', version: 4 },
    });
  });

  it('should render when open', () => {
    render(<VersionHistoryDialog {...defaultProps} />);

    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<VersionHistoryDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
  });

  it('should load version history when dialog opens', async () => {
    render(<VersionHistoryDialog {...defaultProps} />);

    await waitFor(() => {
      expect(customUnitApiService.getVersionHistory).toHaveBeenCalledWith(
        'unit-1',
      );
    });
  });

  it('should display loading state', () => {
    (customUnitApiService.getVersionHistory as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<VersionHistoryDialog {...defaultProps} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should display error when loading fails', async () => {
    (customUnitApiService.getVersionHistory as jest.Mock).mockRejectedValue(
      new Error('Failed'),
    );

    render(<VersionHistoryDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<VersionHistoryDialog {...defaultProps} />);

    await waitFor(() => {
      expect(customUnitApiService.getVersionHistory).toHaveBeenCalled();
    });

    const closeButton = await screen.findByRole('button', {
      name: 'Close dialog',
    });
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale preview once a newer version is selected', async () => {
    const user = userEvent.setup();
    let resolveV1!: (value: ReturnType<typeof versionPayload>) => void;
    (customUnitApiService.getVersion as jest.Mock).mockImplementation(
      (_id: string, version: number) => {
        if (version === 1) {
          return new Promise((resolve) => {
            resolveV1 = resolve;
          });
        }
        return Promise.resolve(versionPayload(version, 'Locust'));
      },
    );
    render(<VersionHistoryDialog {...defaultProps} />);
    await screen.findByRole('button', { name: /v1/i });
    await user.click(screen.getByRole('button', { name: /v1/i }));
    await user.click(screen.getByRole('button', { name: /v2/i }));
    await screen.findByText(/Version 2 Details/i);
    resolveV1(versionPayload(1, 'Atlas'));
    await waitFor(() => {
      expect(screen.getByText(/Version 2 Details/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Version 1 Details/i)).not.toBeInTheDocument();
  });

  it('keeps the loaded preview when its version is selected again', async () => {
    const user = userEvent.setup();
    render(<VersionHistoryDialog {...defaultProps} />);
    const version = await screen.findByRole('button', { name: /v1/i });
    await user.click(version);
    await screen.findByText('Version 1 Details');

    await user.click(version);

    expect(screen.getByText('Version 1 Details')).toBeInTheDocument();
    expect(screen.queryByText('Loading preview...')).not.toBeInTheDocument();
    expect(customUnitApiService.getVersion).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending preview on re-selection and can select another version', async () => {
    const user = userEvent.setup();
    const pending = Promise.withResolvers<ReturnType<typeof versionPayload>>();
    jest
      .mocked(customUnitApiService.getVersion)
      .mockReturnValueOnce(pending.promise);
    render(<VersionHistoryDialog {...defaultProps} />);
    const version = await screen.findByRole('button', { name: /v1/i });
    await user.click(version);
    await user.click(version);
    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    expect(customUnitApiService.getVersion).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(versionPayload(1, 'Atlas')));
    expect(screen.getByText('Version 1 Details')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /v2/i }));
    expect(await screen.findByText('Version 2 Details')).toBeInTheDocument();
  });

  it('clears pending preview loading on close and ignores its late completion', async () => {
    const pending = Promise.withResolvers<ReturnType<typeof versionPayload>>();
    jest
      .mocked(customUnitApiService.getVersion)
      .mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderHook(
      ({ isOpen }) => useVersionHistoryDialog({ ...defaultProps, isOpen }),
      { initialProps: { isOpen: true } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedVersion(1));
    expect(result.current.isLoadingPreview).toBe(true);

    rerender({ isOpen: false });
    expect(result.current.isLoadingPreview).toBe(false);
    rerender({ isOpen: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedVersion).toBeNull();
    expect(result.current.isLoadingPreview).toBe(false);
    act(() => result.current.setSelectedVersion(2));
    await waitFor(() => expect(result.current.previewData?.version).toBe(2));
    await act(async () => pending.resolve(versionPayload(1, 'Atlas')));
    expect(result.current.previewData?.version).toBe(2);
    expect(result.current.isLoadingPreview).toBe(false);
  });

  it('ignores a deferred preview after switching units', async () => {
    const pending = Promise.withResolvers<ReturnType<typeof versionPayload>>();
    const nextPreview = {
      ...versionPayload(1, 'Locust'),
      data: { ...versionPayload(1, 'Locust').data, id: 'unit-2' },
    };
    jest
      .mocked(customUnitApiService.getVersion)
      .mockImplementation((unitId) =>
        unitId === 'unit-1' ? pending.promise : Promise.resolve(nextPreview),
      );
    const { result, rerender } = renderHook(
      ({ unitId }) => useVersionHistoryDialog({ ...defaultProps, unitId }),
      { initialProps: { unitId: 'unit-1' } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSelectedVersion(1));
    expect(customUnitApiService.getVersion).toHaveBeenCalledWith('unit-1', 1);

    rerender({ unitId: 'unit-2' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedVersion).toBeNull();
    act(() => result.current.setSelectedVersion(1));
    await waitFor(() =>
      expect(result.current.previewData).toEqual(nextPreview),
    );

    await act(async () => pending.resolve(versionPayload(1, 'Atlas')));

    expect(result.current.previewData).toEqual(nextPreview);
    expect(result.current.previewError).toBeNull();
    expect(result.current.isLoadingPreview).toBe(false);
  });

  it('ignores a deferred revert after unmount', async () => {
    const user = userEvent.setup();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof customUnitApiService.revert>>
      >();
    jest
      .mocked(customUnitApiService.revert)
      .mockReturnValueOnce(pending.promise);
    const { unmount } = render(<VersionHistoryDialog {...defaultProps} />);
    await user.click(await screen.findByRole('button', { name: /v1/i }));
    await user.click(screen.getByRole('button', { name: 'Revert to v1' }));
    expect(customUnitApiService.revert).toHaveBeenCalledWith('unit-1', 1);

    unmount();
    await act(async () =>
      pending.resolve({ success: true, data: { id: 'unit-1', version: 4 } }),
    );

    expect(defaultProps.onRevert).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('restores into the draft without calling the library revert API', async () => {
    const user = userEvent.setup();
    const onRestoreDraft = jest.fn().mockResolvedValue(undefined);
    render(
      <VersionHistoryDialog
        {...defaultProps}
        onRestoreDraft={onRestoreDraft}
      />,
    );
    await screen.findByRole('button', { name: /v1/i });
    await user.click(screen.getByRole('button', { name: /v1/i }));
    await user.click(
      screen.getByRole('button', { name: /Restore v1 into draft/i }),
    );
    await waitFor(() => {
      expect(onRestoreDraft).toHaveBeenCalledWith(1);
    });
    expect(customUnitApiService.revert).not.toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('allows restoring the last saved version when using draft restore', async () => {
    const user = userEvent.setup();
    const onRestoreDraft = jest.fn().mockResolvedValue(undefined);
    render(
      <VersionHistoryDialog
        {...defaultProps}
        onRestoreDraft={onRestoreDraft}
      />,
    );
    await screen.findByRole('button', { name: /v3/i });
    await user.click(screen.getByRole('button', { name: /v3/i }));
    await user.click(
      screen.getByRole('button', { name: /Restore v3 into draft/i }),
    );
    await waitFor(() => {
      expect(onRestoreDraft).toHaveBeenCalledWith(3);
    });
    expect(customUnitApiService.revert).not.toHaveBeenCalled();
  });

  it('shows a restore failure and stays open', async () => {
    const user = userEvent.setup();
    const onRestoreDraft = jest
      .fn()
      .mockRejectedValue(new Error('Draft changed while loading'));
    render(
      <VersionHistoryDialog
        {...defaultProps}
        onRestoreDraft={onRestoreDraft}
      />,
    );
    await screen.findByRole('button', { name: /v1/i });
    await user.click(screen.getByRole('button', { name: /v1/i }));
    await user.click(
      screen.getByRole('button', { name: /Restore v1 into draft/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Draft changed while loading',
    );
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
  });

  it('ignores a second restore submission while the first is in flight', async () => {
    const user = userEvent.setup();
    let resolveRestore!: () => void;
    const onRestoreDraft = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRestore = resolve;
        }),
    );
    render(
      <VersionHistoryDialog
        {...defaultProps}
        onRestoreDraft={onRestoreDraft}
      />,
    );
    await screen.findByRole('button', { name: /v1/i });
    await user.click(screen.getByRole('button', { name: /v1/i }));
    const restoreButton = await screen.findByRole('button', {
      name: /Restore v1 into draft/i,
    });
    await user.click(restoreButton);
    await user.click(restoreButton);
    expect(onRestoreDraft).toHaveBeenCalledTimes(1);
    resolveRestore();
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
