import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

async function expectNonBlankRender(page: Page, label: string): Promise<void> {
  let screenshot: Buffer | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const locator = page.getByTestId('hex-map-container');

    try {
      await expect(locator).toBeVisible();
      screenshot = await locator.screenshot({ animations: 'disabled' });
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(100);
    }
  }

  if (!screenshot) throw lastError;

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
    const mixedMovementHex = page.getByTestId('hex-2-1');
    await expect(mixedMovementHex).toHaveAttribute('data-reachable', 'true');
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-count',
      '3',
    );
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-types',
      'walk,run,jump',
    );
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:blocked',
    );
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-blocked-reasons',
      'jump:Jump path length 4 exceeds jump MP 3',
    );
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-invalid-reasons',
      'jump:InsufficientMP',
    );
    await expect(mixedMovementHex).toHaveAttribute(
      'data-movement-option-invalid-details',
      'jump:Jump path length 4 exceeds jump MP 3',
    );
    const mixedMovementBadge = page.getByTestId('hex-movement-badge-2-1');
    await expect(mixedMovementBadge).toContainText('W5/R6 MP');
    await expect(mixedMovementBadge).toHaveAttribute(
      'data-movement-badge-option-costs',
      'walk:5|run:6|jump:4',
    );
    await expect(mixedMovementBadge).toHaveAttribute(
      'data-movement-badge-option-blocked-reasons',
      'jump:Jump path length 4 exceeds jump MP 3',
    );
    const mixedBlockedOptionsBadge = page.getByTestId(
      'hex-movement-blocked-options-badge-2-1',
    );
    await expect(mixedBlockedOptionsBadge.locator('text')).toHaveText('J BLK');
    await expect(mixedBlockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-count',
      '1',
    );
    await expect(mixedBlockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-types',
      'jump',
    );
    await expect(mixedBlockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-invalid-reasons',
      'jump:InsufficientMP',
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
    const mediumTargetHex = page.getByTestId('hex-1-2');
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-target-ids',
      'medium-target',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'medium',
    );
    await expect(mediumTargetHex).toHaveAttribute('data-combat-distance', '4');
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-valid-target',
      'true',
    );
    const mediumCombatBadge = page.getByTestId('hex-combat-badge-1-2');
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'medium',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-label',
      'M4',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      'medium-laser',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'medium-laser:medium',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'medium-laser:available',
    );
    const coverTargetHex = page.getByTestId('hex-0-2');
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-target-ids',
      'water-cover-target',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-valid-target',
      'true',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-target-cover-level',
      'partial',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'true',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-cover-modifier',
      '1',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-cover-reason',
      'Target in water partial cover (+1)',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Partial Cover:1/,
    );
    const coverBadge = page.getByTestId('hex-cover-badge-0-2');
    await expect(coverBadge.locator('text')).toHaveText('P+1');
    await expect(coverBadge).toHaveAttribute(
      'data-combat-cover-badge-level',
      'partial',
    );
    await expect(coverBadge).toHaveAttribute(
      'data-combat-cover-badge-reason',
      'Target in water partial cover (+1)',
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
    await expectNonBlankRender(page, 'top-down tactical map');

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

    await expectNonBlankRender(page, 'isometric tactical map');
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
