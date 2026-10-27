import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RecordSheetPreviewZoomControls } from '../RecordSheetPreviewZoomControls';

function renderControls(mode: 'fit-width' | 'manual' = 'fit-width') {
  const callbacks = {
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onFitToWidth: jest.fn(),
    onFitToPage: jest.fn(),
    onActualSize: jest.fn(),
  };
  render(
    <RecordSheetPreviewZoomControls zoom={1.5} mode={mode} {...callbacks} />,
  );
  return callbacks;
}

describe('RecordSheetPreviewZoomControls', () => {
  it('combines mode and percentage, with keyboard menu navigation and focus restoration', async () => {
    const user = userEvent.setup();
    const callbacks = renderControls();
    const trigger = screen.getByRole('button', { name: 'Zoom options' });
    expect(trigger).toHaveTextContent('Fit width \u00b7 150%');
    expect(trigger).toHaveAccessibleDescription('Fit width \u00b7 150%');
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent(/^150%$/);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit width' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit width' }),
    ).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit page' }),
    ).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitemradio', { name: '100%' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit page' }),
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(callbacks.onFitToPage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows a percentage alone after manual zoom and dismisses on outside pointer or tab', async () => {
    const user = userEvent.setup();
    const callbacks = renderControls('manual');
    const trigger = screen.getByRole('button', { name: 'Zoom options' });
    expect(trigger).toHaveTextContent(/^150%$/);
    await user.click(trigger);
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    for (const item of screen.getAllByRole('menuitemradio'))
      expect(item).toHaveAttribute('aria-checked', 'false');
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(trigger);
    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(callbacks.onZoomIn).toHaveBeenCalledTimes(1);
    expect(callbacks.onZoomOut).toHaveBeenCalledTimes(1);
  });
});
