import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';

import {
  blockNextPopup,
  expectPrintedPaper,
  expectPrintWindowClosesAfterPrint,
  expectSinglePagePdf,
  failNextCanvasExport,
  installPrintHarness,
  printButton,
  printCaptures,
  printCount,
  printOnce,
} from './helpers/recordSheetPrintHarness';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
    const create = URL.createObjectURL.bind(URL);
    const captures: { text: string; pending: Promise<string> }[] = [];
    Object.defineProperty(window, '__recordSheetSvgCaptures', {
      configurable: true,
      get() {
        return captures;
      },
    });
    URL.createObjectURL = (object) => {
      const url = create(object);
      if (object instanceof Blob && /svg/i.test(object.type)) {
        const entry = {
          text: '',
          pending: object.text().then((text) => {
            entry.text = text;
            return text;
          }),
        };
        captures.push(entry);
      }
      return url;
    };
  });
});

const LETTER = {
  width: 612,
  height: 792,
  backingWidth: 2448,
  backingHeight: 3168,
};
const A4 = { width: 595, height: 842, backingWidth: 2380, backingHeight: 3368 };
const LETTER_RATIO = LETTER.width / LETTER.height;
const A4_RATIO = A4.width / A4.height;
/** jsPDF page boxes for the two supported formats, in points. */
const LETTER_PAGE_BOX = { width: 612, height: 792 };
const A4_PAGE_BOX = { width: 595.28, height: 841.89 };

async function loadAtlas(page: Page) {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Load from Library' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await dialog.getByText('AS7-D', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Preview', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Current zoom', { exact: true })).toBeVisible();
}

async function loadLocustBesideAtlas(page: Page) {
  await page
    .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Locust LCT-1V');
  await dialog.getByText('LCT-1V', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Preview', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Current zoom', { exact: true })).toBeVisible();
}

function previewCanvas(page: Page) {
  return page.getByTestId('battlemech-record-sheet-canvas');
}

function currentZoom(page: Page) {
  return page.getByLabel('Current zoom', { exact: true });
}

async function zoomPercent(page: Page) {
  return Number.parseInt(await currentZoom(page).innerText(), 10);
}

async function waitTwoAnimationFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function afterViewportChange(page: Page) {
  await waitTwoAnimationFrames(page);
}

async function noDocumentOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function backingSize(page: Page) {
  return previewCanvas(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height };
  });
}

async function waitForBacking(
  page: Page,
  size: { backingWidth: number; backingHeight: number },
) {
  await expect
    .poll(async () => backingSize(page))
    .toEqual({ width: size.backingWidth, height: size.backingHeight });
}

async function paperRatio(page: Page) {
  const box = await previewCanvas(page).boundingBox();
  expect(box).not.toBeNull();
  return box!.width / box!.height;
}

async function fitWidthGeometry(page: Page, paperWidth: number) {
  return previewCanvas(page).evaluate((element, width) => {
    const canvas = element as HTMLCanvasElement;
    const viewport = canvas.parentElement;
    if (!viewport) throw new Error('missing scroll viewport');
    const style = getComputedStyle(viewport);
    const contentWidth =
      viewport.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const expected = Math.min(contentWidth, width * 3);
    return {
      cssWidth: canvas.getBoundingClientRect().width,
      expected,
    };
  }, paperWidth);
}

async function expectFitWidthCanvas(page: Page, paperWidth: number) {
  const { cssWidth, expected } = await fitWidthGeometry(page, paperWidth);
  expect(Math.abs(cssWidth - expected)).toBeLessThanOrEqual(2);
}

async function latestSheetSvg(page: Page) {
  return page.evaluate(async () => {
    const captures = (
      window as unknown as {
        __recordSheetSvgCaptures?: {
          text: string;
          pending: Promise<string>;
        }[];
      }
    ).__recordSheetSvgCaptures;
    if (!captures?.length) return '';
    const texts = await Promise.all(
      captures.map((entry) => entry.text || entry.pending),
    );
    for (let index = texts.length - 1; index >= 0; index -= 1) {
      if (/id=["']type["']/.test(texts[index])) return texts[index];
    }
    return texts[texts.length - 1] ?? '';
  });
}

function sheetTypeName(svg: string) {
  return svg.match(/id="type"[^>]*>([^<]*)</)?.[1]?.trim() ?? '';
}

async function expectSheetType(page: Page, name: string) {
  await expect
    .poll(async () => sheetTypeName(await latestSheetSvg(page)))
    .toBe(name);
}

function expectNonemptyPdf(filePath: string) {
  expect(statSync(filePath).size).toBeGreaterThan(0);
  expect(readFileSync(filePath).subarray(0, 4).toString('latin1')).toBe('%PDF');
}

async function downloadPdf(page: Page, dest: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(dest);
  expect(await download.failure()).toBeNull();
  expectNonemptyPdf(dest);
  return download;
}

test('preview zoom increments survive resize and fit width tracks until manual @customizer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  await waitForBacking(page, LETTER);
  const before = await zoomPercent(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const afterIn = await zoomPercent(page);
  expect(afterIn).toBe(Math.min(before + 15, 300));
  await page.setViewportSize({ width: 1280, height: 900 });
  await afterViewportChange(page);
  expect(await zoomPercent(page)).toBe(afterIn);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const afterWait = await zoomPercent(page);
  expect(afterWait).toBe(Math.min(afterIn + 15, 300));
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  expect(await zoomPercent(page)).toBe(afterIn);
  await page.getByRole('button', { name: 'Fit Width', exact: true }).click();
  await waitTwoAnimationFrames(page);
  await expectFitWidthCanvas(page, LETTER.width);
  await page.setViewportSize({ width: 900, height: 800 });
  await afterViewportChange(page);
  await expectFitWidthCanvas(page, LETTER.width);
  const refit = await zoomPercent(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const manual = await zoomPercent(page);
  expect(manual).toBe(Math.min(refit + 15, 300));
  await page.setViewportSize({ width: 1200, height: 800 });
  await afterViewportChange(page);
  expect(await zoomPercent(page)).toBe(manual);
  const manualBox = await previewCanvas(page).boundingBox();
  expect(manualBox).not.toBeNull();
  expect(
    Math.abs(manualBox!.width - (LETTER.width * manual) / 100),
  ).toBeLessThanOrEqual(2);
  await expect(page.getByRole('combobox', { name: 'Paper Size' })).toHaveValue(
    'letter',
  );
  expect(await paperRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
  await waitForBacking(page, LETTER);
  await page.getByRole('combobox', { name: 'Paper Size' }).selectOption('a4');
  await expect(page.getByRole('combobox', { name: 'Paper Size' })).toHaveValue(
    'a4',
  );
  await waitForBacking(page, A4);
  expect(await paperRatio(page)).toBeCloseTo(A4_RATIO, 2);
  await page
    .getByRole('combobox', { name: 'Paper Size' })
    .selectOption('letter');
  await waitForBacking(page, LETTER);
  expect(await paperRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
  await noDocumentOverflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await afterViewportChange(page);
  expect(await zoomPercent(page)).toBe(manual);
  await expect(page.getByLabel('Current zoom', { exact: true })).toBeVisible();
  await noDocumentOverflow(page);
});

test('preview shows the last requested unit and downloads nonempty Letter and A4 PDFs @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Atlas AS7-D');
  await page
    .getByRole('combobox', { name: 'Paper Size' })
    .selectOption('letter');
  const letterPath = testInfo.outputPath('atlas-letter.pdf');
  const letter = await downloadPdf(page, letterPath);
  expect(letter.suggestedFilename()).toMatch(/Atlas-AS7-D\.pdf$/i);
  await page.getByRole('combobox', { name: 'Paper Size' }).selectOption('a4');
  await waitForBacking(page, A4);
  expect(await paperRatio(page)).toBeCloseTo(A4_RATIO, 2);
  const a4Path = testInfo.outputPath('atlas-a4.pdf');
  const a4 = await downloadPdf(page, a4Path);
  expect(a4.suggestedFilename()).toMatch(/Atlas-AS7-D\.pdf$/i);
  await expectSheetType(page, 'Atlas AS7-D');
  await page
    .getByRole('combobox', { name: 'Paper Size' })
    .selectOption('letter');
  await waitForBacking(page, LETTER);
  await loadLocustBesideAtlas(page);
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Locust LCT-1V');
  const locustPath = testInfo.outputPath('locust-letter.pdf');
  const locust = await downloadPdf(page, locustPath);
  expect(locust.suggestedFilename()).toMatch(/Locust-LCT-1V\.pdf$/i);
  await page.getByRole('tab', { name: 'Atlas AS7-D', exact: true }).click();
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.getByLabel('Current zoom', { exact: true })).toBeVisible();
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Atlas AS7-D');
  const atlasAgainPath = testInfo.outputPath('atlas-letter-after-switch.pdf');
  const atlasAgain = await downloadPdf(page, atlasAgainPath);
  expect(atlasAgain.suggestedFilename()).toMatch(/Atlas-AS7-D\.pdf$/i);
});

test('Print writes one current sheet into the reserved window at the selected paper @customizer', async ({
  page,
}) => {
  await installPrintHarness(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Atlas AS7-D');

  let releasePips!: () => void;
  let sawPips!: () => void;
  const heldPips = new Promise<void>((resolve) => {
    releasePips = resolve;
  });
  const requestedPips = new Promise<void>((resolve) => {
    sawPips = resolve;
  });
  await page.route(
    '**/record-sheets/biped_pips/**',
    async (route) => {
      sawPips();
      await heldPips;
      await route.continue();
    },
    { times: 1 },
  );
  const popup = page.waitForEvent('popup');
  await printButton(page).click();
  try {
    await requestedPips;
    expect((await popup).isClosed()).toBe(false);
    expect(await printCount(page)).toBe(0);
    await loadLocustBesideAtlas(page);
  } finally {
    releasePips();
  }
  await expect.poll(() => printCount(page)).toBe(1);
  const letterPrint = (await printCaptures(page))[0];
  expect(letterPrint.typeName).toBe('Atlas AS7-D');
  expectPrintedPaper(letterPrint, LETTER);
  await expectPrintWindowClosesAfterPrint(page);
  await expect(page.getByRole('combobox', { name: 'Paper Size' })).toHaveValue(
    'letter',
  );
  await expectSheetType(page, 'Locust LCT-1V');
  expect(await paperRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
  await page.getByRole('tab', { name: 'Atlas AS7-D', exact: true }).click();

  await page.getByRole('combobox', { name: 'Paper Size' }).selectOption('a4');
  await waitForBacking(page, A4);
  const a4Print = await printOnce(page);
  expect(a4Print.typeName).toBe('Atlas AS7-D');
  expectPrintedPaper(a4Print, A4);
  await expectPrintWindowClosesAfterPrint(page);
  await expect(page.getByRole('combobox', { name: 'Paper Size' })).toHaveValue(
    'a4',
  );

  await page
    .getByRole('combobox', { name: 'Paper Size' })
    .selectOption('letter');
  await waitForBacking(page, LETTER);
  await page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }).click();
  await waitForBacking(page, LETTER);
  const locustPrint = await printOnce(page);
  expect(locustPrint.typeName).toBe('Locust LCT-1V');
  expectPrintedPaper(locustPrint, LETTER);
  await expectPrintWindowClosesAfterPrint(page);
});

test('a blocked print popup surfaces a recoverable error and Retry prints @customizer', async ({
  page,
}) => {
  await installPrintHarness(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Atlas AS7-D');

  const before = await printCount(page);
  await blockNextPopup(page);
  await printButton(page).click();
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Could not open print window' });
  await expect(alert).toBeVisible();
  expect(await printCount(page)).toBe(before);
  await expect(printButton(page)).toBeEnabled();

  const retry = page.getByRole('button', { name: 'Retry print', exact: true });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect.poll(async () => printCount(page)).toBe(before + 1);
  const captures = await printCaptures(page);
  const recovered = captures[captures.length - 1];
  expect(recovered.typeName).toBe('Atlas AS7-D');
  expectPrintedPaper(recovered, LETTER);
  await expect(alert).toBeHidden();
  await expectPrintWindowClosesAfterPrint(page);
});

test('a failed canvas export surfaces Retry and recovers to a one-page PDF @customizer', async ({
  page,
}, testInfo) => {
  await installPrintHarness(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  await waitForBacking(page, LETTER);
  await expectSheetType(page, 'Atlas AS7-D');

  await failNextCanvasExport(page);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Tainted canvases may not be exported.' });
  await expect(alert).toBeVisible();

  const retry = page.getByRole('button', {
    name: 'Retry PDF export',
    exact: true,
  });
  await expect(retry).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await retry.click();
  const download = await downloadPromise;
  const letterPath = testInfo.outputPath('atlas-letter-after-retry.pdf');
  await download.saveAs(letterPath);
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/Atlas-AS7-D\.pdf$/i);
  expectNonemptyPdf(letterPath);
  expectSinglePagePdf(letterPath, LETTER_PAGE_BOX);
  await expect(alert).toBeHidden();

  await page.getByRole('combobox', { name: 'Paper Size' }).selectOption('a4');
  await waitForBacking(page, A4);
  const a4Path = testInfo.outputPath('atlas-a4-page-box.pdf');
  await downloadPdf(page, a4Path);
  expectSinglePagePdf(a4Path, A4_PAGE_BOX);
});

test('Infantry preview shares zoom, fit modes, paper geometry and export @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'New Unit', exact: true }).click();
  const add = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await add
    .getByRole('button', { name: 'Choose starting settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Infantry', exact: true }).click();
  await page.getByRole('button', { name: 'Create Unit', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.locator('#nonMechChassis').fill('Roadmap Infantry');
  await page.locator('#nonMechModel').fill('Proof');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.getByTestId('infantry-preview-tab')).toBeVisible();
  await expect(currentZoom(page)).toBeVisible();
  const canvas = page.getByTestId('infantry-record-sheet-canvas');
  await expect(canvas).toBeVisible();
  await expectSheetType(page, 'Roadmap Infantry Proof');
  const before = await zoomPercent(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const manual = await zoomPercent(page);
  expect(manual).toBe(Math.min(before + 15, 300));
  await page.setViewportSize({ width: 1100, height: 850 });
  await afterViewportChange(page);
  expect(await zoomPercent(page)).toBe(manual);
  const paper = page.getByRole('combobox', {
    name: 'Paper Size:',
    exact: true,
  });
  await paper.selectOption('a4');
  await expect
    .poll(() =>
      canvas.evaluate((node) => ({
        width: (node as HTMLCanvasElement).width,
        height: (node as HTMLCanvasElement).height,
      })),
    )
    .toEqual({ width: A4.backingWidth, height: A4.backingHeight });
  expect(await zoomPercent(page)).toBe(manual);
  const a4Box = await canvas.boundingBox();
  expect(a4Box!.width / a4Box!.height).toBeCloseTo(A4_RATIO, 2);
  await page.getByRole('button', { name: 'Fit Width', exact: true }).click();
  await waitTwoAnimationFrames(page);
  const fit = await zoomPercent(page);
  await page.setViewportSize({ width: 800, height: 850 });
  await expect.poll(() => zoomPercent(page)).toBeLessThan(fit);
  await page.getByRole('button', { name: 'Fit Page', exact: true }).click();
  await waitTwoAnimationFrames(page);
  await expect(canvas).toBeInViewport({ ratio: 0.95 });
  await expectSheetType(page, 'Roadmap Infantry Proof');
  const pdfPath = testInfo.outputPath('infantry-a4.pdf');
  const infantryPdf = await downloadPdf(page, pdfPath);
  expect(infantryPdf.suggestedFilename()).toBe('Roadmap-Infantry-Proof.pdf');
  expectSinglePagePdf(pdfPath, A4_PAGE_BOX);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const mobileManual = await zoomPercent(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await afterViewportChange(page);
  expect(await zoomPercent(page)).toBe(mobileManual);
  await noDocumentOverflow(page);
});
