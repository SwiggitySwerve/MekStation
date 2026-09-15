/**
 * Record-sheet print / export browser harness.
 *
 * Used only by `e2e/customizer-record-sheet-rendering.spec.ts`. It wraps
 * the public browser surfaces the customizer's Print and Download PDF
 * flows depend on, so the suite can observe the reserved print document
 * and provoke real failure modes without ever reaching an operating
 * system print dialog and without importing product code.
 */

import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** A paper size in PDF points. */
export interface PaperBox {
  width: number;
  height: number;
}

/** One recorded activation of the reserved print window's `print()`. */
export interface PrintCapture {
  title: string;
  /** Print stylesheet text, whitespace-normalized. */
  styleRules: string;
  /** Top-level record sheets written into the print body. */
  sheetCount: number;
  rootWidth: string;
  rootHeight: string;
  viewBox: string;
  typeName: string;
}

interface PrintHarness {
  /** Make the next `window.open` behave like a blocked popup. */
  blockNextOpen: boolean;
  /** Make the next canvas export throw the way a tainted canvas does. */
  failNextCanvasExport: boolean;
  prints: PrintCapture[];
  dispatchAfterPrint(): void;
  isPrintWindowClosed(): boolean;
}

type HarnessWindow = Window & { __printHarness: PrintHarness };

/**
 * The reserved print popup, as this harness uses it. Electron's ambient
 * typings overload `window.open` to return `BrowserWindowProxy`, so the
 * popup is described structurally here — the customizer print path is a
 * real browser window.
 */
interface PrintPopup {
  readonly document: Document;
  readonly closed: boolean;
  print(): void;
  dispatchEvent(event: Event): boolean;
}

type OpenWindow = (
  url?: string,
  target?: string,
  features?: string,
) => PrintPopup | null;

/**
 * Wrap the browser surfaces the print/export flows depend on:
 *
 * - `window.open`, so the reserved popup stays a real same-origin window
 *   whose `print()` is recorded instead of reaching an OS dialog, and so
 *   a single activation can be refused exactly like a popup blocker does;
 * - `HTMLCanvasElement.toDataURL`, the API `exportPDF` hands the raster
 *   to jsPDF through, so an export failure can be provoked at a public
 *   browser boundary rather than inside product code.
 *
 * Must be installed before the first navigation.
 */
export async function installPrintHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nativeOpen = window.open.bind(window) as unknown as OpenWindow;
    const state: PrintHarness & { printWindow: PrintPopup | null } = {
      blockNextOpen: false,
      failNextCanvasExport: false,
      prints: [],
      printWindow: null,
      dispatchAfterPrint() {
        state.printWindow?.dispatchEvent(new Event('afterprint'));
      },
      isPrintWindowClosed() {
        return Boolean(state.printWindow?.closed);
      },
    };
    Object.defineProperty(window, '__printHarness', {
      configurable: true,
      get() {
        return state;
      },
    });

    const openPrintWindow: OpenWindow = (url, target, features) => {
      if (state.blockNextOpen) {
        state.blockNextOpen = false;
        return null;
      }
      const opened = nativeOpen(url, target, features);
      state.printWindow = opened;
      if (opened) {
        opened.print = () => {
          const doc = opened.document;
          const sheets = doc.querySelectorAll('body > svg');
          const sheet = sheets[0];
          state.prints.push({
            title: doc.title,
            styleRules: (doc.querySelector('head > style')?.textContent ?? '')
              .replace(/\s+/g, ' ')
              .trim(),
            sheetCount: sheets.length,
            rootWidth: sheet?.getAttribute('width') ?? '',
            rootHeight: sheet?.getAttribute('height') ?? '',
            viewBox: sheet?.getAttribute('viewBox') ?? '',
            typeName: (
              sheet?.querySelector('[id="type"]')?.textContent ?? ''
            ).trim(),
          });
        };
      }
      return opened;
    };
    window.open = openPrintWindow as unknown as typeof window.open;

    const nativeToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function toDataURL(
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement['toDataURL']>
    ): string {
      if (state.failNextCanvasExport) {
        state.failNextCanvasExport = false;
        throw new DOMException(
          'Tainted canvases may not be exported.',
          'SecurityError',
        );
      }
      return nativeToDataURL.apply(this, args);
    };
  });
}

export async function printCaptures(page: Page): Promise<PrintCapture[]> {
  return page.evaluate(
    () => (window as unknown as HarnessWindow).__printHarness.prints,
  );
}

export async function printCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as HarnessWindow).__printHarness.prints.length,
  );
}

/** Refuse exactly one `window.open`, the way a popup blocker does. */
export async function blockNextPopup(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as HarnessWindow).__printHarness.blockNextOpen = true;
  });
}

/** Fail exactly one canvas export with the browser's own SecurityError. */
export async function failNextCanvasExport(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as HarnessWindow).__printHarness.failNextCanvasExport =
      true;
  });
}

export function printButton(page: Page) {
  return page.getByRole('button', { name: 'Print', exact: true });
}

/** Activate the product's Print control and return what it printed. */
export async function printOnce(page: Page): Promise<PrintCapture> {
  const before = await printCount(page);
  await printButton(page).click();
  await expect.poll(async () => printCount(page)).toBe(before + 1);
  const captures = await printCaptures(page);
  return captures[captures.length - 1];
}

/**
 * The product closes the window it owns on `afterprint`. Chromium never
 * fires that event for a stubbed `print()`, so the harness plays the
 * role of the print lifecycle and then asserts the product's cleanup.
 */
export async function expectPrintWindowClosesAfterPrint(
  page: Page,
): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as HarnessWindow).__printHarness.dispatchAfterPrint(),
  );
  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as HarnessWindow
        ).__printHarness.isPrintWindowClosed(),
      ),
    )
    .toBe(true);
}

/** One record sheet, at the requested paper, in the reserved window. */
export function expectPrintedPaper(
  capture: PrintCapture,
  paper: PaperBox,
): void {
  expect(capture.title).toBe('Record Sheet');
  expect(capture.sheetCount).toBe(1);
  expect(capture.styleRules).toContain(
    `@page { size: ${paper.width}pt ${paper.height}pt; margin: 0; }`,
  );
  expect(Number.parseFloat(capture.rootWidth)).toBeCloseTo(paper.width, 0);
  expect(Number.parseFloat(capture.rootHeight)).toBeCloseTo(paper.height, 0);
  const viewBox = capture.viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  expect(viewBox).toHaveLength(4);
  expect(viewBox[2] / viewBox[3]).toBeCloseTo(paper.width / paper.height, 2);
}

/**
 * Format-aware inspection of a produced record sheet without adding a
 * PDF parser: jsPDF leaves the document structure uncompressed, so the
 * page tree and page box are readable from the raw bytes.
 */
export function expectSinglePagePdf(filePath: string, paper: PaperBox): void {
  const bytes = readFileSync(filePath).toString('latin1');
  expect(bytes.startsWith('%PDF')).toBe(true);
  expect(bytes.match(/\/Type\s*\/Pages\b/g) ?? []).toHaveLength(1);
  expect(bytes.match(/\/Type\s*\/Page(?!s)/g) ?? []).toHaveLength(1);
  expect(bytes).toMatch(/\/Count\s+1\b/);
  const mediaBox = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(
    bytes,
  );
  expect(mediaBox).not.toBeNull();
  expect(Number.parseFloat(mediaBox![1])).toBeCloseTo(paper.width, 0);
  expect(Number.parseFloat(mediaBox![2])).toBeCloseTo(paper.height, 0);
}
