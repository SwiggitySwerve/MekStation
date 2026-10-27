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

    expect(
      screen.getByRole('button', { name: 'Zoom options' }),
    ).toHaveTextContent('Fit width');
    expect(
      screen.getByRole('button', { name: 'Zoom options' }),
    ).not.toHaveTextContent('Fit page');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // (900 - 48) / 612
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('139%');
    expect(screen.getByTestId('sheet-canvas').style.width).toBe('852px');
  });

  it('selects 100% from the menu and draws the sheet at actual size', async () => {
    installViewport(900, 700);
    render(<Harness />);

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Zoom options' }));
    await userEvent
      .setup()
      .click(screen.getByRole('menuitemradio', { name: '100%' }));

    expect(
      screen.getByRole('button', { name: 'Zoom options' }),
    ).toHaveTextContent('100%');
    expect(
      screen.getByRole('button', { name: 'Zoom options' }),
    ).not.toHaveTextContent('Fit width');
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

  it('hints how to read a small sheet and names the paper in the phone toolbar', () => {
    installViewport(390, 700);
    render(<Harness />);

    // (390 - 48) / 612 = 56%: too small to read, so the hint shows.
    expect(screen.getByTestId('preview-sheet-hint')).toHaveTextContent(
      'Zoom in or pinch to read details',
    );
    expect(screen.getByTestId('preview-sheet-hint')).toHaveClass('sm:hidden');
    // The caption no longer repeats the zoom; the toolbar readout shows it.
    expect(screen.getByTestId('preview-sheet-caption')).toHaveTextContent(
      /^Letter \u00b7 1 page$/,
    );
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('56%');
    expect(screen.getByTestId('paper-size-phone-label')).toHaveTextContent(
      'Paper: Letter',
    );
    // Print and Download PDF always carry visible text, not sr-only text.
    expect(screen.getByRole('button', { name: 'Print' }).textContent).toBe(
      'Print',
    );
    expect(
      screen
        .getByRole('button', { name: 'Download PDF' })
        .querySelector('.sr-only'),
    ).toBeNull();
  });

  it('omits the hint once the sheet is readable', () => {
    installViewport(1100, 700);
    render(<Harness />);

    expect(screen.queryByTestId('preview-sheet-hint')).not.toBeInTheDocument();
  });
  it('caps the opening width at a readable 920px on wide viewers', () => {
    installViewport(2600, 900);
    render(<Harness />);

    expect(screen.getByTestId('sheet-canvas').style.width).toBe('920px');
  });
});
