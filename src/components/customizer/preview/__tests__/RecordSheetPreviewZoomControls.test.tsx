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
  it('shows the percentage as the value and the fit mode as a menu choice, with keyboard menu navigation and focus restoration', async () => {
    const user = userEvent.setup();
    const callbacks = renderControls();
    const trigger = screen.getByRole('button', { name: 'Zoom options' });
    // The visible value is the percentage, led by a muted "Fit \u00b7" tag while
    // Fit Width tracks the viewer; the full mode name is described to
    // assistive tech and checked in the menu.
    expect(trigger.querySelector('.sr-only')).toHaveTextContent('Fit Width,');
    expect(screen.getByTestId('zoom-mode-tag')).toHaveTextContent(
      /^Fit \u00b7$/,
    );
    expect(screen.getByTestId('zoom-mode-tag')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(trigger).toHaveAccessibleDescription('Fit Width, 150%');
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent(/^150%$/);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Width' }),
    ).toHaveFocus();
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Width' }),
    ).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Home}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Page' }),
    ).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitemradio', { name: '100%' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitemradio', { name: 'Fit Page' }),
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
    expect(screen.queryByTestId('zoom-mode-tag')).not.toBeInTheDocument();
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

describe('RecordSheetPreviewZoomControls layout', () => {
  it('joins Zoom out, the zoom menu and Zoom in in one segmented box', () => {
    renderControls();
    const segments = screen.getByTestId('zoom-segments');
    const buttons = Array.from(segments.children);
    expect(buttons).toEqual([
      screen.getByRole('button', { name: 'Zoom out' }),
      screen.getByRole('button', { name: 'Zoom options' }),
      screen.getByRole('button', { name: 'Zoom in' }),
    ]);
    expect(segments).toHaveClass('border', 'divide-x', 'overflow-hidden');
    for (const button of buttons) {
      expect(button).toHaveClass('rounded-none!');
      expect(button).not.toHaveClass('border');
    }
  });
});
