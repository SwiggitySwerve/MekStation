import { expect, test, type Locator } from '@playwright/test';
import sharp from 'sharp';

async function expectNonBlankRender(
  locator: Locator,
  label: string,
): Promise<void> {
  const screenshot = await locator.screenshot({ animations: 'disabled' });
  const { data } = await sharp(screenshot)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const quantizedColors = new Set<string>();
  let contrastedPixels = 0;

  for (let offset = 0; offset < data.length; offset += 4 * 8) {
    const alpha = data[offset + 3];
    if (alpha < 16) continue;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    quantizedColors.add(`${red >> 4},${green >> 4},${blue >> 4}`);

    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 32) {
      contrastedPixels += 1;
    }
  }

  expect(
    quantizedColors.size,
    `${label} should render more than a flat color`,
  ).toBeGreaterThan(8);
  expect(
    contrastedPixels,
    `${label} should contain visible terrain/token/overlay contrast`,
  ).toBeGreaterThan(150);
}

test.describe('Tactical map visual smoke @smoke @game', () => {
  test('renders top-down labels and rotatable isometric occlusion in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map');

    const harness = page.getByTestId('tactical-map-e2e-harness');
    const map = page.getByTestId('hex-map-container');
    const projectionLayer = page.getByTestId('map-projection-layer');

    await expect(harness).toBeVisible();
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+4',
    );
    await expect(page.getByTestId('hex-terrain-label-1-0')).toHaveAttribute(
      'data-terrain-features',
      'building',
    );
    const movementBadge = page.getByTestId('hex-movement-badge-0-1');
    await expect(movementBadge).toContainText('W3/R4/J3 MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-count',
      '3',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-types',
      'walk,run,jump',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-costs',
      'walk:3|run:4|jump:3',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-terrain-costs',
      'walk:2|run:2|jump:0',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-elevation-costs',
      'walk:1|run:1|jump:0',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-heats',
      'walk:0|run:2|jump:3',
    );
    await expect(page.getByTestId('hex-1-0')).toHaveAttribute(
      'data-reachable',
      'false',
    );
    await expect(page.getByTestId('hex-1-0')).toHaveAttribute(
      'data-movement-type',
      'jump',
    );
    await expect(page.getByTestId('hex-1-0')).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(
      page.getByTestId('hex-movement-invalid-badge-1-0').locator('text'),
    ).toHaveText('ELEV');
    await expect(
      page.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveAttribute(
      'data-invalid-badge-reason',
      'Jump elevation rise of 4 exceeds jump MP 3',
    );
    await expect(page.getByTestId('hex-combat-badge-0-0')).toHaveAttribute(
      'data-combat-badge-distance',
      '1',
    );
    const blockedTargetHex = page.getByTestId('hex-2-0');
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-target-ids',
      'blocked-target',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-los-state',
      'blocked',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-los-blocker-hex',
      '1,0',
    );
    await expect(
      page.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveAttribute('data-invalid-badge-code', 'NoLineOfSight');
    await expectNonBlankRender(map, 'top-down tactical map');

    await page.getByTestId('projection-toggle').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(page.getByTestId('isometric-scene-layer')).toBeVisible();
    await expect(page.getByTestId('hex-elevation-stack-1-0')).toBeVisible();
    await expect(
      page.getByTestId('isometric-visibility-halo-occluded'),
    ).toBeVisible();
    await expect(
      page.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-foreground-boost', 'true');
    await expect(
      page.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    await expect(
      page.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '5');
    await expect(page.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    await expect(page.getByTestId('hex--1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );

    const eastHex = page.getByTestId('isometric-scene-hex-1-0');
    const eastDepthBefore = await eastHex.getAttribute(
      'data-isometric-depth-key',
    );

    await expectNonBlankRender(map, 'isometric tactical map');
    await page.getByTestId('projection-rotate-right').click();

    await expect(
      page.getByTestId('isometric-rotation-heading'),
    ).toHaveAttribute('data-isometric-rotation-step', '1');
    await expect(eastHex).not.toHaveAttribute(
      'data-isometric-depth-key',
      eastDepthBefore ?? '',
    );

    await page.getByTestId('projection-rotate-right').click();
    await page.getByTestId('projection-rotate-right').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    await expect(
      page.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '-1,0');
    await expect(
      page.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '6');
    const eastOccludesAfterRotation =
      (await page
        .getByTestId('hex-1-0')
        .getAttribute('data-isometric-occludes-units')) ?? '';
    expect(eastOccludesAfterRotation.split(',')).not.toContain('occluded');
    await expect(page.getByTestId('hex--1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    await expect(
      page.getByTestId('hex-isometric-occluder-highlight--1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
  });
});
