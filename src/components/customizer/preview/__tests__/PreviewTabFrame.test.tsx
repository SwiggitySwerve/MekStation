import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PaperSize } from '@/types/printing';

import { PreviewTabFrame } from '../PreviewTabFrame';
import { RecordSheetCanvasPreview } from '../RecordSheetCanvasPreview';

function installViewport(width: number, height: number): void {
  global.ResizeObserver = class implements ResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  };
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => height,
  });
}

function Harness(): React.ReactElement {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  return (
    <PreviewTabFrame
      toolbarActions={{
        onExportPDF: jest.fn(async () => undefined),
        onPrint: jest.fn(async () => undefined),
        paperSize: PaperSize.LETTER,
        onPaperSizeChange: jest.fn(),
      }}
    >
      <RecordSheetCanvasPreview
        canvasRef={canvasRef}
        testId="sheet-canvas"
        width={612}
        height={792}
      />
    </PreviewTabFrame>
  );
}

describe('PreviewTabFrame', () => {
  it('puts the zoom controls in the toolbar beside the paper size and actions', () => {
    installViewport(1100, 700);
    const { container } = render(<Harness />);

    const toolbar = container.querySelector('.preview-toolbar') as HTMLElement;
    const zoomGroup = within(toolbar).getByRole('group', {
      name: 'Record sheet zoom controls',
    });
    expect(within(zoomGroup).getByLabelText('Zoom in')).toBeInTheDocument();
    expect(within(toolbar).getByLabelText('Paper Size:')).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: 'Print' }),
    ).toBeInTheDocument();
    // One control set only: nothing is left under the sheet.
    expect(
      screen.getAllByRole('group', { name: 'Record sheet zoom controls' }),
    ).toHaveLength(1);
  });

  it('opens at fit-width and marks it as the active mode', () => {
    installViewport(900, 700);
    render(<Harness />);

    const fitWidth = screen.getByRole('button', { name: 'Fit width' });
    expect(fitWidth).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '100%' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // (900 - 48) / 612
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('139%');
    expect(screen.getByTestId('sheet-canvas').style.width).toBe('852px');
  });

  it('moves the pressed state to 100% and draws the sheet at actual size', async () => {
    installViewport(900, 700);
    render(<Harness />);

    await userEvent.setup().click(screen.getByRole('button', { name: '100%' }));

    expect(screen.getByRole('button', { name: '100%' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Fit width' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('100%');
    expect(screen.getByTestId('sheet-canvas').style.width).toBe('612px');
  });

  it('captions the sheet with its paper size and page count', () => {
    installViewport(900, 700);
    render(<Harness />);

    expect(screen.getByTestId('preview-sheet-caption')).toHaveTextContent(
      'Letter \u00b7 1 page',
    );
  });

  it('caps the opening width at a readable 920px on wide viewers', () => {
    installViewport(2600, 900);
    render(<Harness />);

    expect(screen.getByTestId('sheet-canvas').style.width).toBe('920px');
  });
});
