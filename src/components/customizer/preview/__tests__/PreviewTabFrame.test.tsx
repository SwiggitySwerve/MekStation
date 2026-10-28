import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(within(toolbar).getByLabelText('Paper Size')).toBeInTheDocument();
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
    ).toHaveTextContent('Fit Width');
    expect(
      screen.getByRole('button', { name: 'Zoom options' }),
    ).not.toHaveTextContent('Fit Page');
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
    ).not.toHaveTextContent('Fit Width');
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('100%');
    expect(screen.getByTestId('sheet-canvas').style.width).toBe('612px');
  });

  it('shows the page count in the toolbar without repeating the paper size', () => {
    installViewport(900, 700);
    const { container } = render(<Harness />);

    const toolbar = container.querySelector('.preview-toolbar') as HTMLElement;
    const caption = within(toolbar).getByTestId('preview-sheet-caption');
    expect(caption).toHaveTextContent(/^1 page$/);
    expect(caption).toHaveClass('hidden', 'sm:block');
    // The toolbar sits on the sheet's axis at the sheet's drawn width.
    expect(toolbar.style.getPropertyValue('--preview-sheet-width')).toBe(
      'max(852px, 48rem)',
    );
    // Phones keep the page count in a panel-tone footer; wider screens have
    // no footer.
    const footer = screen.getByTestId('preview-sheet-footer');
    expect(footer).toHaveClass('sm:hidden', 'bg-surface-raised/40');
    expect(
      within(footer).getByTestId('preview-sheet-caption-phone'),
    ).toHaveTextContent(/^1 page$/);
  });

  it('opens phones at Fit Width with the whole page visible, hints how to read it, and names the paper', async () => {
    installViewport(390, 700);
    render(<Harness />);

    // (390 - 48) / 612 = 56%: the whole page fits, but its small print needs
    // zooming, so the hint shows.
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('56%');
    expect(screen.getByTestId('sheet-canvas').style.width).toBe('342px');
    expect(screen.getByTestId('preview-sheet-hint')).toHaveTextContent(
      'Zoom in or pinch to read details',
    );
    // The hint lives in the phone-only footer, beside the page count.
    expect(
      within(screen.getByTestId('preview-sheet-footer')).getByTestId(
        'preview-sheet-hint',
      ),
    ).toBeInTheDocument();
    // The page count does not repeat the paper name or the zoom.
    expect(screen.getByTestId('preview-sheet-caption-phone')).toHaveTextContent(
      /^1 page$/,
    );
    // Phones show the paper name alone, so it never truncates; the select
    // stays named "Paper Size".
    expect(screen.getByTestId('paper-size-phone-label')).toHaveTextContent(
      /^Letter$/,
    );
    expect(
      screen.getByRole('combobox', { name: 'Paper Size' }),
    ).toBeInTheDocument();
    // Phones draw Print as a 44px icon button and Download with a short
    // visible "PDF" beside its icon; the full text stays as each accessible
    // name (and tooltip), shown from 640px.
    for (const name of ['Print', 'Download PDF']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('min-h-11');
      expect(button).toHaveAttribute('title', name);
      expect(button.querySelector('span')).toHaveClass('max-sm:sr-only');
      expect(button.querySelector('svg')).not.toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Print' })).toHaveClass(
      'max-sm:w-11',
    );
    const phoneLabel = within(
      screen.getByRole('button', { name: 'Download PDF' }),
    ).getByText('PDF', { exact: true });
    expect(phoneLabel).toHaveClass('sm:hidden');
    expect(phoneLabel).toHaveAttribute('aria-hidden', 'true');
    // A Zoom In button sits in the footer beside the hint, off the sheet,
    // and opens it at 100%.
    const zoomIn = screen.getByRole('button', { name: 'Zoom in to 100%' });
    expect(
      within(screen.getByTestId('preview-sheet-footer')).getByRole('button', {
        name: 'Zoom in to 100%',
      }),
    ).toBe(zoomIn);
    expect(zoomIn).toHaveTextContent(/^Zoom In$/);
    expect(zoomIn.querySelector('svg')).not.toBeNull();
    await userEvent.setup().click(zoomIn);
    expect(screen.getByLabelText('Current zoom')).toHaveTextContent('100%');
    expect(
      screen.queryByRole('button', { name: 'Zoom in to 100%' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('preview-sheet-hint')).not.toBeInTheDocument();
  });

  it('omits the hint once the sheet is readable', () => {
    installViewport(1100, 700);
    render(<Harness />);

    expect(screen.queryByTestId('preview-sheet-hint')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Zoom in to 100%' }),
    ).not.toBeInTheDocument();
  });

  it('cues scrolling only while the sheet continues below the viewer', () => {
    installViewport(1100, 700);
    const scrollHeight = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(1300);
    try {
      render(<Harness />);
      expect(screen.getByTestId('preview-sheet-scroll-cue')).toHaveTextContent(
        'Scroll for the rest of the sheet',
      );
      expect(screen.getByTestId('preview-sheet-fade')).toBeInTheDocument();
      scrollHeight.mockReturnValue(700);
      fireEvent.scroll(
        screen.getByTestId('sheet-canvas').parentElement!.parentElement!,
      );
      expect(
        screen.queryByTestId('preview-sheet-scroll-cue'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('preview-sheet-fade'),
      ).not.toBeInTheDocument();
    } finally {
      scrollHeight.mockRestore();
    }
  });
  it('caps the opening width at a readable 920px on wide viewers', () => {
    installViewport(2600, 900);
    render(<Harness />);

    expect(screen.getByTestId('sheet-canvas').style.width).toBe('920px');
  });
});
