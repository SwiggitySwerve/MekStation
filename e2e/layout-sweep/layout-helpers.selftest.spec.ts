/**
 * Self-test for `e2e/helpers/layout.ts`.
 *
 * Every fixture here is a synthetic `page.setContent` document -- no app
 * routes, no server/store state. This is design D6's false-positive budget
 * made mechanical: `expectNoOverlap` is the noisiest check by nature, so its
 * true-positive/false-positive matrix is proven once, in isolation, rather
 * than trusted by review. Required to be green 3x consecutively
 * (`--project=chromium --workers=1`) before the sweep (task group 3) may
 * rely on these helpers.
 */

import { expect, test, type Page } from '@playwright/test';

import {
  expectClickable,
  expectNoHorizontalOverflow,
  expectNoOverlap,
  expectNonBlankRender,
  type LayoutOverlapTarget,
} from '../helpers/layout';

/** Wrap a body fragment in a minimal, margin-reset HTML document. */
function fixtureDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Run `action`, expecting it to reject, and return the rejection's message.
 * Throws (failing the test) if `action` resolves instead of rejecting --
 * a true/false-positive fixture that stops throwing is itself a regression.
 */
async function captureRejectionMessage(
  action: () => Promise<void>,
): Promise<string> {
  try {
    await action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('Expected the layout assertion to reject, but it resolved');
}

test.describe('Layout sweep helpers self-test', () => {
  test.describe('expectNoHorizontalOverflow', () => {
    test('fails naming the offending element when content is wider than the viewport', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 400, height: 300 });
      await page.setContent(
        fixtureDocument(
          '<div data-testid="overflow-offender" style="position:absolute;left:0;top:0;width:900px;height:40px;background:#c0392b;"></div>',
        ),
      );

      const message = await captureRejectionMessage(() =>
        expectNoHorizontalOverflow(page, 'overflow true-positive fixture'),
      );

      expect(message).toContain('overflow-offender');
    });

    test('passes a full-bleed position:fixed element (excluded by design)', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 400, height: 300 });
      await page.setContent(
        fixtureDocument(
          '<div data-testid="full-bleed-header" style="position:fixed;left:0;right:0;top:0;height:32px;background:#2c3e50;"></div>' +
            '<div style="height:100px;background:#ecf0f1;"></div>',
        ),
      );

      await expectNoHorizontalOverflow(page, 'full-bleed-fixed fixture');
    });
  });

  test.describe('expectNoOverlap', () => {
    test('fails naming both elements when two absolutely-positioned siblings overlap', async ({
      page,
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="overlap-a" style="position:absolute;left:10px;top:10px;width:100px;height:100px;background:#e74c3c;"></div>' +
            '<div data-testid="overlap-b" style="position:absolute;left:60px;top:60px;width:100px;height:100px;background:#3498db;"></div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [
        { locator: page.getByTestId('overlap-a'), label: 'overlap-a' },
        { locator: page.getByTestId('overlap-b'), label: 'overlap-b' },
      ];

      const message = await captureRejectionMessage(() =>
        expectNoOverlap(targets, 'overlap true-positive fixture'),
      );

      expect(message).toContain('overlap-a');
      expect(message).toContain('overlap-b');
    });

    test('passes a parent/child pair (containment is not overlap)', async ({
      page,
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="overlap-parent" style="position:relative;width:200px;height:200px;background:#2ecc71;">' +
            '<div data-testid="overlap-child" style="position:absolute;left:20px;top:20px;width:60px;height:60px;background:#f1c40f;"></div>' +
            '</div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [
        {
          locator: page.getByTestId('overlap-parent'),
          label: 'overlap-parent',
        },
        { locator: page.getByTestId('overlap-child'), label: 'overlap-child' },
      ];

      await expectNoOverlap(targets, 'containment fixture');
    });

    test('passes two elements abutting within the 1px tolerance (no epsilon flap)', async ({
      page,
    }) => {
      // b's left edge sits 1px inside a's right edge (a genuine sub-pixel
      // overlap) -- the default tolerance=1 must forgive this, not flag it.
      await page.setContent(
        fixtureDocument(
          '<div data-testid="abut-a" style="position:absolute;left:0px;top:0px;width:100px;height:50px;background:#9b59b6;"></div>' +
            '<div data-testid="abut-b" style="position:absolute;left:99px;top:0px;width:100px;height:50px;background:#1abc9c;"></div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [
        { locator: page.getByTestId('abut-a'), label: 'abut-a' },
        { locator: page.getByTestId('abut-b'), label: 'abut-b' },
      ];

      await expectNoOverlap(targets, 'abutting fixture');
    });

    test('passes a genuinely overlapping pair declared in allowedOverlaps', async ({
      page,
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="badge" style="position:absolute;left:0px;top:0px;width:60px;height:60px;background:#e67e22;"></div>' +
            '<div data-testid="icon" style="position:absolute;left:40px;top:40px;width:60px;height:60px;background:#34495e;"></div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [
        { locator: page.getByTestId('badge'), label: 'badge' },
        { locator: page.getByTestId('icon'), label: 'icon' },
      ];

      await expectNoOverlap(targets, 'allowlisted-overlap fixture', {
        allowedOverlaps: [['badge', 'icon']],
      });
    });

    test('fails naming the missing target when a declared target is display:none', async ({
      page,
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="present-target" style="position:absolute;left:0px;top:0px;width:60px;height:60px;background:#16a085;"></div>' +
            '<div data-testid="vanished-target" style="display:none;width:60px;height:60px;background:#c0392b;"></div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [
        {
          locator: page.getByTestId('present-target'),
          label: 'present-target',
        },
        {
          locator: page.getByTestId('vanished-target'),
          label: 'vanished-target',
        },
      ];

      const message = await captureRejectionMessage(() =>
        expectNoOverlap(targets, 'declared-but-hidden fixture'),
      );

      expect(message).toContain('vanished-target');
      expect(message).toContain('no visible element');
    });

    test('passes a realistic flex-wrap toolbar (gap-separated, no overlaps)', async ({
      page,
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div style="display:flex;flex-wrap:wrap;gap:8px;width:220px;">' +
            '<button data-testid="fw-item-1" style="width:60px;height:32px;">One</button>' +
            '<button data-testid="fw-item-2" style="width:60px;height:32px;">Two</button>' +
            '<button data-testid="fw-item-3" style="width:60px;height:32px;">Three</button>' +
            '<button data-testid="fw-item-4" style="width:60px;height:32px;">Four</button>' +
            '</div>',
        ),
      );
      const targets: LayoutOverlapTarget[] = [1, 2, 3, 4].map((n) => ({
        locator: page.getByTestId(`fw-item-${n}`),
        label: `fw-item-${n}`,
      }));

      await expectNoOverlap(targets, 'flex-wrap fixture');
    });
  });

  test.describe('expectClickable', () => {
    test('fails a target below the 32x32px box floor', async ({ page }) => {
      await page.setContent(
        fixtureDocument(
          '<button data-testid="tiny-target" style="width:16px;height:16px;">x</button>',
        ),
      );

      const message = await captureRejectionMessage(() =>
        expectClickable(page.getByTestId('tiny-target'), 'tiny-target'),
      );

      expect(message).toContain('tiny-target');
    });

    test('fails a display:none target', async ({ page }) => {
      test.setTimeout(45_000);
      await page.setContent(
        fixtureDocument(
          '<button data-testid="hidden-target" style="display:none;width:60px;height:60px;">x</button>',
        ),
      );

      const message = await captureRejectionMessage(() =>
        expectClickable(page.getByTestId('hidden-target'), 'hidden-target'),
      );

      expect(message).toContain('hidden-target');
    });
  });

  test.describe('expectNonBlankRender', () => {
    test('fails a flat-color canvas fixture', async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="flat-canvas" style="width:200px;height:200px;background:#336699;"></div>',
        ),
      );

      const message = await captureRejectionMessage(() =>
        expectNonBlankRender(
          page.getByTestId('flat-canvas'),
          'flat-color fixture',
        ),
      );

      expect(message).toContain('flat-color fixture');
    });

    test('passes a multi-color canvas fixture', async ({ page }) => {
      await page.setContent(
        fixtureDocument(
          '<div data-testid="rainbow-canvas" style="width:200px;height:200px;background:repeating-linear-gradient(45deg, #e74c3c 0px, #f1c40f 20px, #2ecc71 40px, #3498db 60px, #9b59b6 80px, #1abc9c 100px);"></div>',
        ),
      );

      await expectNonBlankRender(
        page.getByTestId('rainbow-canvas'),
        'multi-color fixture',
      );
    });
  });
});
