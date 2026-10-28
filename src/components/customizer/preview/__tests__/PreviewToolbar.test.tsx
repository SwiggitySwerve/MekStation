import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PaperSize } from '@/types/printing';
import { logger } from '@/utils/logger';

import { PreviewToolbar } from '../PreviewToolbar';

function renderToolbar({
  onExportPDF = jest.fn(async () => undefined),
  onPrint = jest.fn(async () => undefined),
}: {
  onExportPDF?: () => Promise<void>;
  onPrint?: () => Promise<void>;
} = {}): {
  onExportPDF: jest.Mock;
  onPrint: jest.Mock;
} {
  render(
    <PreviewToolbar
      onExportPDF={onExportPDF}
      onPrint={onPrint}
      paperSize={PaperSize.LETTER}
      onPaperSizeChange={jest.fn()}
    />,
  );

  return {
    onExportPDF: onExportPDF as jest.Mock,
    onPrint: onPrint as jest.Mock,
  };
}

describe('PreviewToolbar', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('surfaces an async print error inline with retry and no alert', async () => {
    const user = userEvent.setup();
    const warning = jest
      .spyOn(logger, 'warn')
      .mockImplementation(() => undefined);
    const errorLog = jest.spyOn(logger, 'error');
    const onPrint = jest
      .fn()
      .mockRejectedValueOnce(new Error('Could not open print window'))
      .mockResolvedValueOnce(undefined);

    renderToolbar({ onPrint });

    await user.click(screen.getByRole('button', { name: 'Print' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not open print window');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('Error printing:', expect.any(Error));
    expect(errorLog).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Retry print' }));

    await waitFor(() => {
      expect(onPrint).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    warning.mockRestore();
    errorLog.mockRestore();
  });

  it('keeps export errors inline, disables duplicates, and restores after retry', async () => {
    const user = userEvent.setup();
    let rejectExport: ((error: Error) => void) | undefined;
    const onExportPDF = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectExport = reject;
        }),
    );

    renderToolbar({ onExportPDF });

    await user.click(screen.getByRole('button', { name: 'Download PDF' }));

    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Exporting...' }));
    expect(onExportPDF).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectExport?.(new Error('Failed to export PDF. Please try again.'));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to export PDF. Please try again.',
    );
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();

    onExportPDF.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: 'Retry PDF export' }));
    await waitFor(() => expect(onExportPDF).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not start a second print while one is already in flight', async () => {
    const user = userEvent.setup();
    let resolvePrint: (() => void) | undefined;
    const onPrint = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePrint = resolve;
        }),
    );

    renderToolbar({ onPrint });

    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(screen.getByRole('button', { name: 'Printing...' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Printing...' }));
    expect(onPrint).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePrint?.();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled();
    });
  });
});

describe('PreviewToolbar emphasis', () => {
  it('shows Download PDF as a strong secondary, leaving amber to the header save', () => {
    renderToolbar();
    const download = screen.getByRole('button', { name: 'Download PDF' });
    expect(download.className).not.toMatch(/\bbg-accent\b/);
    expect(download).toHaveClass(
      'border-border-theme-strong',
      'bg-surface-raised',
      'font-semibold',
    );
    // Print stays the quieter secondary.
    expect(screen.getByRole('button', { name: 'Print' })).not.toHaveClass(
      'font-semibold',
    );
  });

  it('labels the paper select "Paper" without a colon and keeps its name', () => {
    renderToolbar();
    expect(
      screen.getByText('Paper', { selector: 'label' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Paper Size' })).toBeVisible();
    expect(screen.queryByText(/Paper Size:/)).not.toBeInTheDocument();
  });
});
