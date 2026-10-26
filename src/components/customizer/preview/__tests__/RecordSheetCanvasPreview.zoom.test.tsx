import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RecordSheetCanvasPreview } from '../RecordSheetCanvasPreview';

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const viewport = { width: 800, height: 1000 };
const resizeObservers: ResizeObserverCallback[] = [];

function installViewportMocks(): void {
  resizeObservers.length = 0;
  class CaptureResizeObserver implements ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      resizeObservers.push(callback);
    }

    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  }

  global.ResizeObserver = CaptureResizeObserver;

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return viewport.width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return viewport.height;
    },
  });
}

function fireResize(width: number, height: number): void {
  viewport.width = width;
  viewport.height = height;
  act(() => {
    for (const callback of resizeObservers) {
      callback([], {} as ResizeObserver);
    }
  });
}

function zoomOutput(): HTMLElement {
  return screen.getByLabelText('Current zoom');
}

function ZoomHarness({
  width = LETTER_WIDTH,
  height = LETTER_HEIGHT,
}: {
  width?: number;
  height?: number;
}): React.ReactElement {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  return (
    <RecordSheetCanvasPreview
      canvasRef={canvasRef}
      testId="sheet-canvas"
      width={width}
      height={height}
      scale={0.8}
    />
  );
}

describe('RecordSheetCanvasPreview zoom', () => {
  beforeEach(() => {
    viewport.width = 800;
    viewport.height = 1000;
    installViewportMocks();
  });

  it('starts in fit-page mode', () => {
    render(<ZoomHarness />);

    expect(zoomOutput()).toHaveTextContent('120%');
    expect(screen.getByRole('button', { name: 'Fit Page' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Fit Width' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('starts at fit width on phones and preserves an explicit fit-page choice', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    viewport.width = 390;
    viewport.height = 320;
    try {
      const user = userEvent.setup();
      render(<ZoomHarness />);
      expect(zoomOutput()).toHaveTextContent('56%');
      expect(screen.getByRole('button', { name: 'Fit Width' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await user.click(screen.getByRole('button', { name: 'Fit Page' }));
      fireResize(390, 400);
      expect(zoomOutput()).toHaveTextContent('44%');
      expect(screen.getByRole('button', { name: 'Fit Page' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('keeps a 44px control row and scrolls the sheet at large zoom', async () => {
    const user = userEvent.setup();
    render(<ZoomHarness />);

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });

    expect(zoomIn.className).toMatch(/min-h-\[44px\]/);
    expect(zoomOut.className).toMatch(/min-h-\[44px\]/);
    expect(zoomIn).toHaveClass('min-w-11');
    expect(zoomOut).toHaveClass('min-w-11');

    for (let i = 0; i < 20; i += 1) {
      await user.click(zoomIn);
    }

    expect(zoomOutput()).toHaveTextContent('300%');
    expect(screen.getByTestId('sheet-canvas')).toHaveStyle({
      width: `${LETTER_WIDTH * 3}px`,
      height: `${LETTER_HEIGHT * 3}px`,
      flexShrink: 0,
    });
  });

  it('does not let a ResizeObserver callback override manual zoom', async () => {
    const user = userEvent.setup();
    render(<ZoomHarness />);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomOutput()).toHaveTextContent('135%');
    expect(screen.getByRole('button', { name: 'Fit Page' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    fireResize(1290, 912);

    expect(zoomOutput()).toHaveTextContent('135%');
  });

  it('recalculates only the selected fit mode on resize', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ZoomHarness />);

    fireResize(1600, 400);
    expect(zoomOutput()).toHaveTextContent('44%');

    await user.click(screen.getByRole('button', { name: 'Fit Width' }));
    expect(zoomOutput()).toHaveTextContent('254%');
    expect(screen.getByRole('button', { name: 'Fit Width' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireResize(800, 400);
    expect(zoomOutput()).toHaveTextContent('123%');

    await user.click(screen.getByRole('button', { name: 'Fit Page' }));
    expect(zoomOutput()).toHaveTextContent('44%');

    fireResize(800, 1000);
    expect(zoomOutput()).toHaveTextContent('120%');

    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(zoomOutput()).toHaveTextContent('105%');

    rerender(<ZoomHarness width={A4_WIDTH} height={A4_HEIGHT} />);
    expect(zoomOutput()).toHaveTextContent('105%');

    fireResize(1600, 2000);
    expect(zoomOutput()).toHaveTextContent('105%');
  });
});
