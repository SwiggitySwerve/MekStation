import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

const ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON =
  'TAG designation is nullified by ECM; semi-guided indirect fire is unavailable';

async function switchToIsometric(
  page: Page,
  projectionLayer: Locator,
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (
      (await projectionLayer.getAttribute('data-projection-mode')) ===
      'isometric2d'
    ) {
      return;
    }
    await page.getByTestId('projection-toggle').click();
    await page.waitForTimeout(100);
  }

  await expect(projectionLayer).toHaveAttribute(
    'data-projection-mode',
    'isometric2d',
  );
}

async function dragMouseOnLocator(
  locator: Locator,
  dx: number,
  dy: number,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'locator should be visible for mouse drag').not.toBeNull();
  if (!box) return;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await locator.dispatchEvent('mousedown', {
    button: 0,
    buttons: 1,
    clientX: startX,
    clientY: startY,
  });
  await locator.dispatchEvent('mousemove', {
    button: 0,
    buttons: 1,
    clientX: startX + dx,
    clientY: startY + dy,
  });
  await locator.dispatchEvent('mouseup', {
    button: 0,
    buttons: 0,
    clientX: startX + dx,
    clientY: startY + dy,
  });
}

async function dragTouchOnLocator(
  page: Page,
  locator: Locator,
  dx: number,
  dy: number,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'locator should be visible for touch drag').not.toBeNull();
  if (!box) return;

  const startX = Math.round(box.x + box.width / 2);
  const startY = Math.round(box.y + box.height / 2);
  const dispatchTouch = async (
    type: 'touchstart' | 'touchmove' | 'touchend',
    x: number,
    y: number,
  ): Promise<void> => {
    await locator.evaluate(
      (node, { type, x, y }) => {
        const makeTouch = (x: number, y: number): Touch =>
          new Touch({
            identifier: 1,
            target: node,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            pageX: x,
            pageY: y,
            radiusX: 4,
            radiusY: 4,
            force: 0.5,
          });

        const touch = makeTouch(x, y);
        node.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend' ? [] : [touch],
            targetTouches: type === 'touchend' ? [] : [touch],
            changedTouches: [touch],
          }),
        );
      },
      { type, x, y },
    );
  };

  await dispatchTouch('touchstart', startX, startY);
  await page.waitForTimeout(25);
  await dispatchTouch('touchmove', startX + dx, startY + dy);
  await page.waitForTimeout(25);
  await dispatchTouch('touchend', startX + dx, startY + dy);
}

async function pinchZoomOnLocator(
  page: Page,
  locator: Locator,
  startDistance: number,
  endDistance: number,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'locator should be visible for pinch zoom').not.toBeNull();
  if (!box) return;

  const centerX = Math.round(box.x + box.width / 2);
  const centerY = Math.round(box.y + box.height / 2);
  const touchPair = (distance: number) => [
    { id: 1, x: centerX - distance / 2, y: centerY },
    { id: 2, x: centerX + distance / 2, y: centerY },
  ];

  const dispatchPinch = async (
    type: 'touchstart' | 'touchmove' | 'touchend',
    distance: number,
  ): Promise<void> => {
    await locator.evaluate(
      (node, { type, points }) => {
        const touches = points.map(
          (point) =>
            new Touch({
              identifier: point.id,
              target: node,
              clientX: point.x,
              clientY: point.y,
              screenX: point.x,
              screenY: point.y,
              pageX: point.x,
              pageY: point.y,
              radiusX: 4,
              radiusY: 4,
              force: 0.5,
            }),
        );

        node.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend' ? [] : touches,
            targetTouches: type === 'touchend' ? [] : touches,
            changedTouches: touches,
          }),
        );
      },
      { type, points: touchPair(distance) },
    );
  };

  await dispatchPinch('touchstart', startDistance);
  await page.waitForTimeout(25);
  await dispatchPinch('touchmove', endDistance);
  await page.waitForTimeout(25);
  await dispatchPinch('touchend', endDistance);
}

async function tapLocatorWithTouchscreen(
  page: Page,
  locator: Locator,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'locator should be visible for touchscreen tap').not.toBeNull();
  if (!box) return;

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function expectNonBlankRender(page: Page, label: string): Promise<void> {
  let lastMetrics:
    | {
        readonly quantizedColorCount: number;
        readonly contrastedPixels: number;
      }
    | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const locator = page.getByTestId('hex-map-container');

    try {
      await expect(locator).toBeVisible();
      const screenshot = await locator.screenshot({ animations: 'disabled' });
      lastMetrics = await measureRenderedContrast(screenshot);
      if (
        lastMetrics.quantizedColorCount > 8 &&
        lastMetrics.contrastedPixels > 150
      ) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(100);
  }

  if (!lastMetrics) throw lastError;

  expect(
    lastMetrics.quantizedColorCount,
    `${label} should render more than a flat color`,
  ).toBeGreaterThan(8);
  expect(
    lastMetrics.contrastedPixels,
    `${label} should contain visible terrain/token/overlay contrast`,
  ).toBeGreaterThan(150);
}

async function measureRenderedContrast(screenshot: Buffer): Promise<{
  readonly quantizedColorCount: number;
  readonly contrastedPixels: number;
}> {
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

  return {
    quantizedColorCount: quantizedColors.size,
    contrastedPixels,
  };
}

test.describe('Tactical map visual smoke @smoke @game', () => {
  // The dense tactical-map harness shares one Next dev server; serializing the
  // suite keeps route compilation and screenshot contrast checks deterministic.
  test.describe.configure({ mode: 'serial' });

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
    const projectionToggle = page.getByTestId('projection-toggle');
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-channel',
      'view-mode',
    );
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-current-mode',
      'topDown',
    );
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-target-mode',
      'isometric2d',
    );
    const topDownElevationLabel = page.getByTestId('hex-elevation-label-1-0');
    const topDownTerrainLabel = page.getByTestId('hex-terrain-label-1-0');
    await expect(topDownElevationLabel).toContainText('+4');
    await expect(topDownTerrainLabel).toHaveAttribute(
      'data-terrain-features',
      'building',
    );
    for (const label of [topDownElevationLabel, topDownTerrainLabel]) {
      await expect(label).toHaveAttribute(
        'data-tactical-projection-source',
        'shared-tactical-map-projection',
      );
      await expect(label).toHaveAttribute(
        'data-tactical-projection-channel',
        'terrain-elevation',
      );
      await expect(label).toHaveAttribute(
        'data-tactical-rules-surface',
        'terrain-elevation',
      );
      await expect(label).toHaveAttribute(
        'data-tactical-projection-sources',
        /terrain-elevation:mekstation:Rendered map terrain\/elevation grid:.*building.*elevation 4/,
      );
      await expect(label).toHaveAttribute(
        'data-tactical-projection-rule-refs',
        /terrain-elevation:mekstation:MekStation terrain\/elevation grid state/,
      );
    }
    const elevationToggle = page.getByTestId('overlay-toggle-elevation');
    await expect(elevationToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(elevationToggle).toHaveAttribute(
      'data-map-layer-id',
      'elevation',
    );
    await expect(elevationToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'terrain-elevation',
    );
    await expect(elevationToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'terrain-elevation',
    );
    await elevationToggle.click();
    await expect(elevationToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('hex-elevation-label-1-0')).toHaveCount(0);
    await expect(topDownTerrainLabel).toHaveAttribute(
      'data-terrain-features',
      'building',
    );
    await elevationToggle.click();
    await expect(elevationToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+4',
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
    await expect(page.getByTestId('hex--1-0')).toHaveAttribute(
      'data-path-step',
      'start',
    );
    await expect(page.getByTestId('hex-0-0')).toHaveAttribute(
      'data-path-step',
      '1',
    );
    await expect(page.getByTestId('hex-0-1')).toHaveAttribute(
      'data-path-step',
      '2',
    );
    await expect(
      page.getByTestId('hex-path-step-badge--1-0').locator('text'),
    ).toHaveText('S');
    await expect(
      page.getByTestId('hex-path-step-badge-0-0').locator('text'),
    ).toHaveText('#1');
    await expect(
      page.getByTestId('hex-path-step-badge-0-1').locator('text'),
    ).toHaveText('#2');
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
    await expect(mixedMovementHex).toHaveAttribute(
      'data-tactical-projection-rule-refs',
      /movement:megamek:MegaMek common\/moves\/MoveStep\.java:2727-2841 movement MP costs/,
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
    await mixedMovementHex.hover({ force: true });
    await expect(page.getByTestId('hex-tactical-tooltip')).toBeVisible();
    const mixedTooltipBlockedOption = page.getByTestId(
      'hex-tactical-tooltip-movement-options-option-jump-jump-2',
    );
    await expect(
      page.getByTestId('hex-tactical-tooltip-movement-options'),
    ).toHaveAttribute(
      'data-movement-option-rule-refs',
      /movement:megamek:MegaMek common\/moves\/MoveStep\.java:2727-2841 movement MP costs/,
    );
    await expect(mixedTooltipBlockedOption).toHaveAttribute(
      'data-movement-option-invalid-reason',
      'InsufficientMP',
    );
    await expect(mixedTooltipBlockedOption).toHaveAttribute(
      'data-movement-option-rule-refs',
      /movement:megamek:MegaMek common\/moves\/MovePath\.java:1214-1218 MP-used accounting/,
    );
    await expect(mixedTooltipBlockedOption).toHaveAttribute(
      'data-movement-option-invalid-details',
      'Jump path length 4 exceeds jump MP 3',
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
    await expect(page.getByTestId('hex-overlay-1-0')).toHaveAttribute(
      'data-movement-non-color-encoding',
      'blocked-cross-hatch',
    );
    await expect(
      page.getByTestId('blocked-movement-pattern-1-0'),
    ).toHaveAttribute('fill', 'url(#pattern-blocked-movement)');
    await expect(page.getByTestId('blocked-movement-glyph-1-0')).toContainText(
      '!',
    );
    await expect(page.getByTestId('jump-pattern-1-0')).toHaveCount(0);
    await expect(page.getByTestId('hex-combat-badge-0-0')).toHaveAttribute(
      'data-combat-badge-distance',
      '1',
    );
    const minimumRangeHex = page.getByTestId('hex-0-0');
    await expect(minimumRangeHex).toHaveAttribute(
      'data-combat-target-ids',
      'occluded',
    );
    await expect(minimumRangeHex).toHaveAttribute(
      'data-combat-minimum-range-penalty',
      '2',
    );
    await expect(minimumRangeHex).toHaveAttribute(
      'data-combat-minimum-range-weapons',
      'minimum-lrm',
    );
    await expect(minimumRangeHex).toHaveAttribute(
      'data-combat-minimum-range-reason',
      'Minimum range penalty +2 (minimum-lrm)',
    );
    await expect(minimumRangeHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Minimum Range:2/,
    );
    const minimumRangeBadge = page.getByTestId('hex-minimum-range-badge-0-0');
    await expect(minimumRangeBadge.locator('text')).toHaveText('MIN+2');
    await expect(minimumRangeBadge).toHaveAttribute(
      'data-combat-minimum-range-badge-penalty',
      '2',
    );
    await expect(minimumRangeBadge).toHaveAttribute(
      'data-combat-minimum-range-badge-weapons',
      'minimum-lrm',
    );
    await expect(minimumRangeBadge).toHaveAttribute(
      'data-combat-minimum-range-badge-reason',
      'Minimum range penalty +2 (minimum-lrm)',
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
    await expect(mediumTargetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser,extreme-lrm',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'medium-laser:medium|small-laser:out_of_range|minimum-lrm:out_of_range|extreme-lrm:extreme',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'medium-laser:available|small-laser:blocked|minimum-lrm:blocked|extreme-lrm:available',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-weapon-option-to-hit-numbers',
      'medium-laser:6|extreme-lrm:10',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-weapon-option-expected-damages',
      'medium-laser:3.6|extreme-lrm:0.85',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
    );
    await expect(mediumTargetHex).toHaveAttribute(
      'data-tactical-projection-rule-refs',
      /combat:megamek:MegaMek RangeType\.java:95-151 range bracket classification/,
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
      'medium-laser,extreme-lrm',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'medium-laser:medium|small-laser:out_of_range|minimum-lrm:out_of_range|extreme-lrm:extreme',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'medium-laser:available|small-laser:blocked|minimum-lrm:blocked|extreme-lrm:available',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-expected-damages',
      'medium-laser:3.6|extreme-lrm:0.85',
    );
    await expect(mediumCombatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
    );
    const mediumImpactBadge = page.getByTestId('hex-combat-impact-badge-1-2');
    await expect(mediumImpactBadge).toContainText('E4.5');
    await expect(mediumImpactBadge).toHaveAttribute(
      'data-combat-impact-badge-expected-damage',
      '4.45',
    );
    const mediumWeaponCountBadge = page.getByTestId(
      'hex-combat-weapon-count-badge-1-2',
    );
    await expect(mediumWeaponCountBadge.locator('text')).toHaveText('2/4 WPN');
    await expect(mediumWeaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-available',
      '2',
    );
    await expect(mediumWeaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-total',
      '4',
    );
    await expect(mediumWeaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked',
      '2',
    );
    await expect(mediumWeaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-weapons-available',
      'medium-laser,extreme-lrm',
    );
    await expect(mediumWeaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
    );
    await mediumTargetHex.hover();
    const mediumWeaponOptions = page.getByTestId(
      'hex-combat-tooltip-weapon-options',
    );
    await expect(mediumWeaponOptions).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      /combat:megamek:MegaMek RangeType\.java:95-151 range bracket classification/,
    );
    await expect(
      page.getByTestId(
        'hex-combat-tooltip-weapon-options-option-medium-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      /combat:megamek:MegaMek Compute\.java:1313-1517 weapon range\/to-hit modifiers/,
    );
    const mediumImpactDetail = page.getByTestId(
      'hex-combat-tooltip-weapon-impact-detail',
    );
    await expect(mediumImpactDetail).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      /combat:megamek:MegaMek RangeType\.java:95-151 range bracket classification/,
    );
    await expect(
      page.getByTestId(
        'hex-combat-tooltip-weapon-impact-detail-impact-medium-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      /combat:megamek:MegaMek Compute\.java:1313-1517 weapon range\/to-hit modifiers/,
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
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'building',
    );
    await expect(blockedTargetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by building at (1, 0)',
    );
    const losInvalidBadge = page.getByTestId('hex-combat-invalid-badge-2-0');
    await expect(losInvalidBadge.locator('text')).toHaveText('BLDG');
    await expect(losInvalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    await expect(losInvalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by building at (1, 0)',
    );
    const losBlockerBadge = page.getByTestId(
      'hex-combat-los-blocker-badge-1-0',
    );
    await expect(losBlockerBadge.locator('text')).toHaveText('LOS BLDG');
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-hexes',
      '2,0',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-ids',
      'blocked-target',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'building',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    await blockedTargetHex.dispatchEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    const blockedLosContext = page.getByTestId(
      'hex-combat-tooltip-los-context',
    );
    await expect(blockedLosContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(blockedLosContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat|los-blocker',
    );
    await expect(blockedLosContext).toHaveAttribute(
      'data-tactical-rules-surface',
      'line-of-sight',
    );
    await expect(blockedLosContext).toHaveAttribute(
      'data-combat-los-context-rule-refs',
      /combat:megamek:MegaMek LosEffects\.java:797-911 LOS blocking and terrain modifiers/,
    );
    const hiddenContactHex = page.getByTestId('hex--2-1');
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-target-visibility',
      'hidden',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-target-ids',
      'hidden-contact',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      '',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'hidden-contact',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Hidden contact is not currently visible',
    );
    await expect(hiddenContactHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    await expect(
      page.getByTestId('hex-combat-visibility-badge--2-1'),
    ).toHaveAttribute('data-combat-visibility-badge-state', 'hidden');
    await expect(
      page.getByTestId('hex-combat-invalid-badge--2-1'),
    ).toHaveAttribute('data-invalid-badge-code', 'TargetNotVisible');
    const lastKnownContactHex = page.getByTestId('hex--1-2');
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-target-visibility',
      'lastKnown',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-target-ids',
      'last-known-contact',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      '',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'last-known-contact',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Last known contact is not currently visible',
    );
    await expect(lastKnownContactHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    await expect(
      page.getByTestId('hex-combat-visibility-badge--1-2'),
    ).toHaveAttribute('data-combat-visibility-badge-state', 'lastKnown');
    await expect(
      page.getByTestId('hex-combat-invalid-badge--1-2'),
    ).toHaveAttribute('data-invalid-badge-code', 'TargetNotVisible');
    await expectNonBlankRender(page, 'top-down tactical map');

    await switchToIsometric(page, projectionLayer);
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-current-mode',
      'isometric2d',
    );
    await expect(projectionToggle).toHaveAttribute(
      'data-map-projection-target-mode',
      'topDown',
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
    await expect(page.getByTestId('unit-token-hidden-contact')).toHaveAttribute(
      'data-isometric-visibility-rule',
      'hidden',
    );
    await expect(page.getByTestId('unit-token-hidden-contact')).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Hidden contact is limited by fog or visibility rules',
    );
    await expect(
      page
        .getByTestId('isometric-visibility-rule-hidden-contact')
        .locator('text'),
    ).toHaveText('FOG');
    await expect(page.getByTestId('fog-marker-hidden-contact')).toBeVisible();
    await expect(
      page.getByTestId('unit-token-last-known-contact'),
    ).toHaveAttribute('data-isometric-visibility-rule', 'lastKnown');
    await expect(
      page.getByTestId('unit-token-last-known-contact'),
    ).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Last known contact is limited to stale visibility information',
    );
    await expect(
      page
        .getByTestId('isometric-visibility-rule-last-known-contact')
        .locator('text'),
    ).toHaveText('LAST');
    await expect(
      page.getByTestId('fog-marker-last-known-contact'),
    ).toBeVisible();
    await expect(
      page.getByTestId('isometric-scene-token-last-known-contact'),
    ).toHaveAttribute('data-isometric-depth-key', '1003005');
    await expect(
      page.getByTestId('isometric-scene-token-last-known-contact'),
    ).toHaveAttribute('data-isometric-foreground-boost', 'true');
    await expect(page.getByTestId('hex--1-0')).toHaveAttribute(
      'data-path-step',
      'start',
    );
    await expect(page.getByTestId('hex-0-0')).toHaveAttribute(
      'data-path-step',
      '1',
    );
    await expect(page.getByTestId('hex-0-1')).toHaveAttribute(
      'data-path-step',
      '2',
    );
    await expect(
      page.getByTestId('hex-path-step-badge-0-1').locator('text'),
    ).toHaveText('#2');

    const eastHex = page.getByTestId('isometric-scene-hex-1-0');
    await expect(eastHex).toHaveAttribute(
      'data-isometric-hex-map-position',
      '1,0',
    );
    await expect(eastHex).toHaveAttribute('data-isometric-hex-elevation', '4');
    await expect(eastHex).toHaveAttribute(
      'data-isometric-hex-terrain-primary',
      'building',
    );
    await expect(eastHex).toHaveAttribute(
      'data-isometric-hex-sources',
      /terrain-elevation:mekstation/,
    );
    await expect(eastHex).toHaveAttribute(
      'data-isometric-hex-rule-refs',
      /terrain-elevation:mekstation:MekStation terrain\/elevation grid state/,
    );
    const eastDepthBefore = await eastHex.getAttribute(
      'data-isometric-depth-key',
    );

    await expectNonBlankRender(page, 'isometric tactical map');
    const rotateRight = page.getByTestId('projection-rotate-right');
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-source',
      'shared-tactical-map-projection',
    );
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-channel',
      'isometric-camera',
    );
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-current-step',
      '0',
    );
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-next-step',
      '1',
    );
    await rotateRight.click();

    await expect(
      page.getByTestId('isometric-rotation-heading'),
    ).toHaveAttribute('data-isometric-rotation-step', '1');
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-current-step',
      '1',
    );
    await expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-next-step',
      '2',
    );
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

    await page.getByTestId('hex-grid').focus();
    await page.keyboard.press('KeyE');
    await page.keyboard.press('KeyE');
    await page.keyboard.press('KeyE');

    await expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    await expect(eastHex).toHaveAttribute(
      'data-isometric-depth-key',
      eastDepthBefore ?? '',
    );
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
    await expect(
      page.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    const hexGrid = page.getByTestId('hex-grid');
    await expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-source',
      'shared-tactical-map-projection',
    );
    await expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-channel',
      'isometric-camera',
    );
    await expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-rules-surface',
      'presentation',
    );
    await expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-controls',
      'q:rotate-left|e:rotate-right',
    );
    await hexGrid.focus();
    await page.keyboard.press('KeyQ');
    await expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '5',
    );
    await page.keyboard.press('KeyE');
    await expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
  });

  test('keeps top-down elevation badges readable on a large board in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=large-topdown-legibility');

    const projectionLayer = page.getByTestId('map-projection-layer');
    const hexGrid = page.getByTestId('hex-grid');
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    await expect(page.getByTestId('hex-17-0')).toBeAttached();
    await expect(page.getByTestId('hex--17-0')).toBeAttached();

    const centralElevationLabel = page.getByTestId('hex-elevation-label-1-0');
    await expect(centralElevationLabel).toContainText('+4');
    const defaultBadgeBox = await centralElevationLabel.boundingBox();
    expect(
      defaultBadgeBox?.height ?? 0,
      'large-board default zoom should leave the central elevation badge measurable',
    ).toBeGreaterThan(3);

    const initialViewBox = await hexGrid.getAttribute('viewBox');
    await dragMouseOnLocator(hexGrid, 80, -60);
    await expect(hexGrid).not.toHaveAttribute('viewBox', initialViewBox ?? '');
    await expectNonBlankRender(page, 'large top-down tactical map after pan');

    await page.getByTestId('zoom-out-btn').click();
    await page.getByTestId('zoom-out-btn').click();
    await expect(page.getByTestId('hex-elevation-label-1-0')).toHaveCount(0);
    await expectNonBlankRender(
      page,
      'large top-down tactical map below badge readability zoom',
    );

    await page.getByTestId('zoom-in-btn').click();
    await page.getByTestId('zoom-in-btn').click();
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+4',
    );
    await expectNonBlankRender(page, 'large top-down tactical map after zoom');
  });

  test('renders every isometric occluder layer that may hide one unit in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=multi-isometric-occluders');

    const projectionLayer = page.getByTestId('map-projection-layer');
    await switchToIsometric(page, projectionLayer);

    const sceneToken = page.getByTestId('isometric-scene-token-occluded');
    await expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-hex',
      '1,0',
    );
    await expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-hexes',
      '1,0|0,1',
    );
    await expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-elevations',
      '5|3',
    );
    await expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-count',
      '2',
    );
    await expect(sceneToken).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      /Elevated terrain \+3 at \(0, 1\) may hide unit at elevation \+0/,
    );
    await expect(page.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    await expect(page.getByTestId('hex-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    await expect(
      page.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    await expect(
      page.getByTestId('hex-isometric-occluder-highlight-0-1'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    await expect(page.getByTestId('hex-elevation-stack-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    await expect(page.getByTestId('hex-elevation-stack-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );

    await page.getByTestId('projection-rotate-right').click();
    await page.getByTestId('projection-rotate-right').click();
    await page.getByTestId('projection-rotate-right').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    const southOccludesAfterRotation =
      (await page
        .getByTestId('hex-0-1')
        .getAttribute('data-isometric-occludes-units')) ?? '';
    expect(southOccludesAfterRotation.split(',')).not.toContain('occluded');
    const southHighlightAfterRotation =
      (await page
        .getByTestId('hex-isometric-occluder-highlight-0-1')
        .getAttribute('data-isometric-occludes-units')) ?? '';
    expect(southHighlightAfterRotation.split(',')).not.toContain('occluded');
  });

  test.describe('isometric pointer and touch camera smoke', () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });

    test('keeps pan and touch rotation on the shared isometric projection surface', async ({
      browserName,
      page,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'Synthetic touch gesture smoke is Chromium-specific',
      );

      await page.goto('/e2e/tactical-map?scenario=multi-isometric-occluders');

      const projectionLayer = page.getByTestId('map-projection-layer');
      await switchToIsometric(page, projectionLayer);

      const hexGrid = page.getByTestId('hex-grid');
      await expect(hexGrid).toHaveAttribute(
        'data-isometric-pointer-camera-source',
        'shared-tactical-map-projection',
      );
      await expect(hexGrid).toHaveAttribute(
        'data-isometric-pointer-camera-channel',
        'isometric-camera',
      );
      await expect(hexGrid).toHaveAttribute(
        'data-isometric-pointer-camera-rules-surface',
        'presentation',
      );
      await expect(hexGrid).toHaveAttribute(
        'data-isometric-pointer-camera-controls',
        'mouse-pan|touch-pan|pinch-zoom|touch-rotate|touch-rotate-buttons',
      );

      const initialViewBox = await hexGrid.getAttribute('viewBox');
      await dragMouseOnLocator(hexGrid, 72, 44);
      await expect
        .poll(() => hexGrid.getAttribute('viewBox'))
        .not.toBe(initialViewBox);
      await expect(projectionLayer).toHaveAttribute(
        'data-projection-mode',
        'isometric2d',
      );
      await expect(projectionLayer).toHaveAttribute(
        'data-isometric-rotation-step',
        '0',
      );

      const afterMouseViewBox = await hexGrid.getAttribute('viewBox');
      await dragTouchOnLocator(page, hexGrid, -64, 38);
      await expect
        .poll(() => hexGrid.getAttribute('viewBox'))
        .not.toBe(afterMouseViewBox);
      await expect(projectionLayer).toHaveAttribute(
        'data-projection-mode',
        'isometric2d',
      );
      await expect(projectionLayer).toHaveAttribute(
        'data-isometric-rotation-step',
        '0',
      );

      const afterTouchPanViewBox = await hexGrid.getAttribute('viewBox');
      await pinchZoomOnLocator(page, hexGrid, 48, 144);
      await expect
        .poll(() => hexGrid.getAttribute('viewBox'))
        .not.toBe(afterTouchPanViewBox);
      await expect(projectionLayer).toHaveAttribute(
        'data-projection-mode',
        'isometric2d',
      );
      await expect(projectionLayer).toHaveAttribute(
        'data-isometric-rotation-step',
        '0',
      );

      const rotateRight = page.getByTestId('projection-rotate-right');
      for (let tap = 0; tap < 3; tap += 1) {
        await tapLocatorWithTouchscreen(page, rotateRight);
      }

      await expect(projectionLayer).toHaveAttribute(
        'data-isometric-rotation-step',
        '3',
      );
      await expect(
        page.getByTestId('isometric-scene-token-occluded'),
      ).toHaveAttribute('data-isometric-occluder-hex', '-1,0');
      await expect(
        page.getByTestId('hex-isometric-occluder-highlight--1-0'),
      ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
      await expectNonBlankRender(page, 'mobile isometric interaction smoke');
    });
  });

  test('shows true height for capped isometric elevation stacks in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=capped-isometric-stack');

    const projectionLayer = page.getByTestId('map-projection-layer');
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+4',
    );
    await expect(page.getByTestId('hex-terrain-label-1-0')).toHaveAttribute(
      'data-terrain-feature-levels',
      'building:8',
    );
    await expect(page.getByTestId('hex-elevation-stack-1-0')).toHaveCount(0);

    await switchToIsometric(page, projectionLayer);

    const hex = page.getByTestId('hex-1-0');
    const stack = page.getByTestId('hex-elevation-stack-1-0');
    const cap = page.getByTestId('hex-elevation-stack-cap-1-0');

    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(hex).toHaveAttribute('data-elevation-effective-height', '12');
    await expect(hex).toHaveAttribute('data-elevation-rendered-layers', '8');
    await expect(hex).toHaveAttribute('data-elevation-stack-capped', 'true');
    await expect(hex).toHaveAttribute('data-elevation-stack-overflow', '4');

    await expect(stack).toBeVisible();
    await expect(stack).toHaveAttribute(
      'data-elevation-effective-height',
      '12',
    );
    await expect(stack).toHaveAttribute('data-elevation-rendered-layers', '8');
    await expect(stack).toHaveAttribute('data-elevation-stack-overflow', '4');
    await expect(
      page.getByTestId('hex-elevation-stack-layer-1-0-8'),
    ).toBeVisible();
    await expect(
      page.getByTestId('hex-elevation-stack-layer-1-0-9'),
    ).toHaveCount(0);

    await expect(cap).toBeVisible();
    await expect(cap).toHaveAttribute('data-elevation-effective-height', '12');
    await expect(cap).toHaveAttribute('data-elevation-rendered-layers', '8');
    await expect(cap).toHaveAttribute('data-elevation-stack-overflow', '4');
    await expect(cap).toContainText('+12');

    await expectNonBlankRender(page, 'capped isometric elevation stack');
  });

  test('shows elevation LOS blockers as attack rejection evidence in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=elevation-los-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    await expect(
      page.getByTestId('unit-token-elevation-blocked-target'),
    ).toContainText('LCT');

    const blockerHex = page.getByTestId('hex-1-0');
    await expect(blockerHex).toHaveAttribute('data-terrain-features', 'clear');
    await expect(blockerHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'clear:0',
    );
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+2',
    );
    await expect(page.getByTestId('hex-elevation-label-1--1')).toContainText(
      '+1',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'elevation-blocked-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by elevation +2 at (1, 0)',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-hex',
      '1,0',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'elevation',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by elevation +2 at (1, 0)',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-2-0');
    await expect(invalidBadge.locator('text')).toHaveText('ELEV');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by elevation +2 at (1, 0)',
    );

    const losBlockerBadge = page.getByTestId(
      'hex-combat-los-blocker-badge-1-0',
    );
    await expect(losBlockerBadge.locator('text')).toHaveText('LOS ELEV');
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-hexes',
      '2,0',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-ids',
      'elevation-blocked-target',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'elevation',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by elevation +2 at (1, 0)',
    );

    const coverTargetHex = page.getByTestId('hex-2--2');
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-target-ids',
      'elevation-cover-target',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-valid-target',
      'true',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-los-state',
      'clear',
    );
    await expect(coverTargetHex).not.toHaveAttribute(
      'data-combat-invalid-reason',
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
      'Target behind elevation +1 partial cover at (1, -1) (+1)',
    );
    await expect(coverTargetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Partial Cover:1/,
    );
    const elevationCoverBadge = page.getByTestId('hex-cover-badge-2--2');
    await expect(elevationCoverBadge.locator('text')).toHaveText('P+1');
    await expect(elevationCoverBadge).toHaveAttribute(
      'data-combat-cover-badge-reason',
      'Target behind elevation +1 partial cover at (1, -1) (+1)',
    );
  });

  test('shows cumulative woods LOS blockers as attack rejection evidence in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=woods-los-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    await expect(
      page.getByTestId('unit-token-woods-blocked-target'),
    ).toContainText('LCT');

    const firstWoodsHex = page.getByTestId('hex-1-0');
    await expect(firstWoodsHex).toHaveAttribute(
      'data-terrain-features',
      'heavy_woods',
    );
    await expect(firstWoodsHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'heavy_woods:2',
    );
    const blockerHex = page.getByTestId('hex-2-0');
    await expect(blockerHex).toHaveAttribute(
      'data-terrain-features',
      'heavy_woods',
    );
    await expect(blockerHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'heavy_woods:2',
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'woods-blocked-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '3');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by heavy woods at (2, 0)',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-hex',
      '2,0',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'heavy_woods',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by heavy woods at (2, 0)',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-3-0');
    await expect(invalidBadge.locator('text')).toHaveText('WOOD');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by heavy woods at (2, 0)',
    );

    const losBlockerBadge = page.getByTestId(
      'hex-combat-los-blocker-badge-2-0',
    );
    await expect(losBlockerBadge.locator('text')).toHaveText('LOS WDS');
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-hexes',
      '3,0',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-ids',
      'woods-blocked-target',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'heavy_woods',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by heavy woods at (2, 0)',
    );
  });

  test('shows stacked smoke and woods LOS blockers as shared terrain evidence', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=stacked-smoke-woods-los-blocked',
    );

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    await expect(
      page.getByTestId('unit-token-stacked-los-target'),
    ).toContainText('LCT');

    const blockerHex = page.getByTestId('hex-1-0');
    await expect(blockerHex).toHaveAttribute(
      'data-terrain-features',
      'heavy_woods,smoke',
    );
    await expect(blockerHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'smoke:1|heavy_woods:2',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'stacked-los-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by heavy woods and smoke at (1, 0)',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-hex',
      '1,0',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'smoke',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by heavy woods and smoke at (1, 0)',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-2-0');
    await expect(invalidBadge.locator('text')).toHaveText('WOOD');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by heavy woods and smoke at (1, 0)',
    );

    const losBlockerBadge = page.getByTestId(
      'hex-combat-los-blocker-badge-1-0',
    );
    await expect(losBlockerBadge.locator('text')).toHaveText('LOS SMK');
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-hexes',
      '2,0',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-ids',
      'stacked-los-target',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'smoke',
    );
    await expect(losBlockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by heavy woods and smoke at (1, 0)',
    );
  });

  test('shows jump elevation delta with zero elevation MP cost in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=jump-elevation-cost');

    const jumpHex = page.getByTestId('hex-0-1');
    await expect(jumpHex).toHaveAttribute('data-reachable', 'true');
    await expect(jumpHex).toHaveAttribute('data-movement-type', 'jump');
    await expect(jumpHex).toHaveAttribute('data-movement-mode', 'jump');
    await expect(jumpHex).toHaveAttribute('data-mp-cost', '2');
    await expect(jumpHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(jumpHex).toHaveAttribute('data-elevation-delta', '-4');
    await expect(jumpHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(jumpHex).toHaveAttribute('data-heat-generated', '3');

    const movementBadge = page.getByTestId('hex-movement-badge-0-1');
    await expect(movementBadge.locator('text')).toHaveText('J 2MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'jump',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'jump',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '2',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '3',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-0-1');
    await expect(costBadge.locator('text')).toHaveText('E+0 DN4');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '-4',
    );
    await expect(costBadge).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +0; elevation delta -4',
    );
  });

  test('shows biped walk run and jump options from shared movement projection in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=biped-option-projection');

    const optionHex = page.getByTestId('hex-0-1');
    await expect(optionHex).toHaveAttribute('data-reachable', 'true');
    await expect(optionHex).toHaveAttribute('data-movement-option-count', '3');
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-types',
      'walk,run,jump',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:reachable',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-costs',
      'walk:3|run:3|jump:1',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-terrain-costs',
      'walk:1|run:1|jump:0',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-elevation-deltas',
      'walk:1|run:1|jump:1',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-elevation-costs',
      'walk:1|run:1|jump:0',
    );
    await expect(optionHex).toHaveAttribute(
      'data-movement-option-heats',
      'walk:1|run:2|jump:3',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-0-1');
    await expect(movementBadge).toContainText('W3/R3/J1 MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-count',
      '3',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-costs',
      'walk:3|run:3|jump:1',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-heats',
      'walk:1|run:2|jump:3',
    );
  });

  test('switches movement projection from the map MP legend in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=legend-mode-selection');

    const optionHex = page.getByTestId('hex-0-1');
    const movementBadge = page.getByTestId('hex-movement-badge-0-1');
    await expect(page.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-non-color-encodings',
      'blocked:cross-hatch|run:dashed-border|jump:diagonal-hatch',
    );
    await expect(page.getByTestId('mp-legend-run')).toHaveAttribute(
      'data-non-color-encoding',
      'dashed-border',
    );
    await expect(optionHex).toHaveAttribute('data-movement-type', 'run');
    await expect(page.getByTestId('hex-overlay-0-1')).toHaveAttribute(
      'data-movement-non-color-encoding',
      'run-dashed-border',
    );
    await expect(page.getByTestId('run-range-outline-0-1')).toHaveAttribute(
      'stroke-dasharray',
      '5 3',
    );
    await expect(optionHex).toHaveAttribute('data-mp-cost', '3');
    await expect(optionHex).toHaveAttribute('data-heat-generated', '2');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    await expect(movementBadge.locator('text')).toHaveText('R 3MP');

    await page.getByTestId('mp-legend-jump').click();
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(optionHex).toHaveAttribute('data-movement-type', 'jump');
    await expect(optionHex).toHaveAttribute('data-movement-mode', 'jump');
    await expect(optionHex).toHaveAttribute('data-mp-cost', '1');
    await expect(optionHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(optionHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(optionHex).toHaveAttribute('data-heat-generated', '3');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'jump',
    );
    await expect(movementBadge.locator('text')).toHaveText('J 1MP');

    await page.getByTestId('mp-legend-walk').click();
    await expect(page.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(optionHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(optionHex).toHaveAttribute('data-movement-mode', 'walk');
    await expect(optionHex).toHaveAttribute('data-mp-cost', '3');
    await expect(optionHex).toHaveAttribute('data-terrain-cost', '1');
    await expect(optionHex).toHaveAttribute('data-elevation-cost', '1');
    await expect(optionHex).toHaveAttribute('data-heat-generated', '1');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge.locator('text')).toHaveText('W 3MP');
  });

  test('shows VTOL elevation delta with zero elevation MP cost in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vtol-elevation-cost');

    const vtolToken = page.getByTestId('unit-token-attacker');
    await expect(vtolToken).toContainText('KAR');
    await expect(vtolToken).toContainText('VT');
    await expect(vtolToken).toHaveAttribute('data-unit-type', 'vehicle');
    await expect(vtolToken).toHaveAttribute('data-vehicle-motion-type', 'vtol');
    await expect(vtolToken).toHaveAttribute('data-vehicle-altitude', '3');
    await expect(vtolToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('motion VTOL'),
    );
    await expect(vtolToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 3'),
    );

    const altitudeBadge = vtolToken.getByTestId('vehicle-altitude-badge');
    await expect(altitudeBadge).toHaveText('ALT3');
    await expect(altitudeBadge).toHaveAttribute(
      'data-vehicle-altitude-badge-motion',
      'vtol',
    );
    await expect(altitudeBadge).toHaveAttribute(
      'data-vehicle-altitude-badge-altitude',
      '3',
    );

    const vtolHex = page.getByTestId('hex-1-0');
    await expect(vtolHex).toHaveAttribute('data-reachable', 'true');
    await expect(vtolHex).toHaveAttribute('data-movement-type', 'run');
    await expect(vtolHex).toHaveAttribute('data-movement-mode', 'vtol');
    await expect(vtolHex).toHaveAttribute('data-mp-cost', '2');
    await expect(vtolHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(vtolHex).toHaveAttribute('data-elevation-delta', '4');
    await expect(vtolHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(vtolHex).toHaveAttribute('data-heat-generated', '0');

    const movementBadge = page.getByTestId('hex-movement-badge-1-0');
    await expect(movementBadge.locator('text')).toHaveText('R/VTOL 2MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'vtol',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '2',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '0',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-1-0');
    await expect(costBadge.locator('text')).toHaveText('E+0 UP4');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '4',
    );
    await expect(costBadge).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +0; elevation delta +4',
    );

    const projectionLayer = page.getByTestId('map-projection-layer');
    await switchToIsometric(page, projectionLayer);

    const isometricSceneToken = page.getByTestId(
      'isometric-scene-token-attacker',
    );
    await expect(isometricSceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      'vehicle',
    );
    await expect(isometricSceneToken).toHaveAttribute(
      'data-isometric-vehicle-motion-type',
      'vtol',
    );
    await expect(isometricSceneToken).toHaveAttribute(
      'data-isometric-vehicle-altitude',
      '3',
    );

    const isometricVtolToken = isometricSceneToken.getByTestId(
      'unit-token-attacker',
    );
    await expect(isometricVtolToken).toHaveAttribute(
      'data-vehicle-altitude',
      '3',
    );
    await expect(
      isometricVtolToken.getByTestId('vehicle-altitude-badge'),
    ).toHaveText('ALT3');
  });

  test('shows hover water crossing as legal zero-terrain movement in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=hover-water-crossing');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SM1');
    await expect(page.getByTestId('unit-token-attacker')).toContainText('HV');

    const waterHex = page.getByTestId('hex-1-0');
    await expect(waterHex).toHaveAttribute('data-reachable', 'true');
    await expect(waterHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(waterHex).toHaveAttribute('data-movement-mode', 'hover');
    await expect(waterHex).toHaveAttribute('data-mp-cost', '1');
    await expect(waterHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(waterHex).toHaveAttribute('data-elevation-delta', '0');
    await expect(waterHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(waterHex).toHaveAttribute('data-heat-generated', '0');
    await expect(waterHex).toHaveAttribute(
      'data-terrain-features',
      'water,smoke',
    );
    await expect(waterHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'smoke:1|water:2',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-1-0');
    await expect(movementBadge.locator('text')).toHaveText('W/HOV 1MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'hover',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '1',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '0',
    );
    await expect(page.getByTestId('hex-movement-cost-badge-1-0')).toHaveCount(
      0,
    );
  });

  test('shows Mek swim elevation movement as legal water movement in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=biped-swim-elevation');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SWM');

    const swimHex = page.getByTestId('hex-1-0');
    await expect(swimHex).toHaveAttribute('data-reachable', 'true');
    await expect(swimHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(swimHex).toHaveAttribute('data-movement-mode', 'biped_swim');
    await expect(swimHex).toHaveAttribute('data-mp-cost', '1');
    await expect(swimHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(swimHex).toHaveAttribute('data-elevation', '3');
    await expect(swimHex).toHaveAttribute('data-elevation-delta', '3');
    await expect(swimHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(swimHex).toHaveAttribute('data-heat-generated', '1');
    await expect(swimHex).toHaveAttribute('data-terrain-features', 'water');
    await expect(swimHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'water:2',
    );
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+3',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-1-0');
    await expect(movementBadge.locator('text')).toHaveText('W/BSW 1MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'biped_swim',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '1',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-1-0');
    await expect(costBadge.locator('text')).toHaveText('E+0 UP3');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '3',
    );
    await expect(costBadge).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +0; elevation delta +3',
    );
  });

  test('shows Frogman deep-water movement at reduced terrain cost in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=frogman-deep-water');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('FGM');

    const waterHex = page.getByTestId('hex-1-0');
    await expect(waterHex).toHaveAttribute('data-reachable', 'true');
    await expect(waterHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(waterHex).toHaveAttribute('data-movement-mode', 'walk');
    await expect(waterHex).toHaveAttribute('data-mp-cost', '3');
    await expect(waterHex).toHaveAttribute('data-terrain-cost', '2');
    await expect(waterHex).toHaveAttribute('data-elevation-delta', '0');
    await expect(waterHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(waterHex).toHaveAttribute('data-heat-generated', '1');
    await expect(waterHex).toHaveAttribute('data-terrain-features', 'water');
    await expect(waterHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'water:2',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-1-0');
    await expect(movementBadge.locator('text')).toHaveText('W 3MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '3',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-1-0');
    await expect(costBadge.locator('text')).toHaveText('T+2');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '2',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'aria-label',
      'Movement step cost: terrain +2',
    );
  });

  test('shows TacOps battlefield wreck rough terrain as movement cost in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=battlefield-wreck-rough-terrain',
    );

    const wreckHex = page.getByTestId('hex-1-0');
    await expect(wreckHex).toHaveAttribute('data-terrain-features', 'rough');
    await expect(wreckHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'rough:1',
    );
    await expect(wreckHex).toHaveAttribute('data-reachable', 'true');
    await expect(wreckHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(wreckHex).toHaveAttribute('data-movement-mode', 'walk');
    await expect(wreckHex).toHaveAttribute('data-mp-cost', '2');
    await expect(wreckHex).toHaveAttribute('data-terrain-cost', '1');
    await expect(wreckHex).toHaveAttribute('data-elevation-delta', '0');
    await expect(wreckHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(wreckHex).toHaveAttribute('data-heat-generated', '1');

    const movementBadge = page.getByTestId('hex-movement-badge-1-0');
    await expect(movementBadge.locator('text')).toHaveText('W 2MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mode',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-mp-cost',
      '2',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-1-0');
    await expect(costBadge.locator('text')).toHaveText('T+1');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '1',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '0',
    );
    await expect(costBadge).toHaveAttribute(
      'aria-label',
      'Movement step cost: terrain +1',
    );
  });

  test('shows prone stand-up movement cost and PSR metadata in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=prone-stand-up');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('PRN');

    const standDestination = page.getByTestId('hex-2-0');
    await expect(standDestination).toHaveAttribute('data-reachable', 'true');
    await expect(standDestination).toHaveAttribute(
      'data-movement-type',
      'walk',
    );
    await expect(standDestination).toHaveAttribute(
      'data-movement-mode',
      'walk',
    );
    await expect(standDestination).toHaveAttribute('data-mp-cost', '4');
    await expect(standDestination).toHaveAttribute('data-terrain-cost', '0');
    await expect(standDestination).toHaveAttribute('data-elevation-delta', '0');
    await expect(standDestination).toHaveAttribute('data-elevation-cost', '0');
    await expect(standDestination).toHaveAttribute('data-heat-generated', '1');
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-required',
      'true',
    );
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-mode',
      'normal',
    );
    await expect(standDestination).toHaveAttribute('data-stand-up-cost', '2');
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-psr-required',
      'true',
    );
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-psr-reason',
      'Standing up',
    );
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-psr-target',
      '5',
    );
    await expect(standDestination).toHaveAttribute(
      'data-stand-up-psr-modifier',
      '0',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-2-0');
    await expect(movementBadge.locator('text')).toHaveText('W 4MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );

    const standBadge = page.getByTestId('hex-stand-up-badge-2-0');
    await expect(standBadge.locator('text')).toHaveText('STAND 2MP PSR5');
    await expect(standBadge).toHaveAttribute('data-stand-up-mode', 'normal');
    await expect(standBadge).toHaveAttribute('data-stand-up-cost', '2');
    await expect(standBadge).toHaveAttribute(
      'data-stand-up-psr-required',
      'true',
    );
    await expect(standBadge).toHaveAttribute('data-stand-up-psr-target', '5');
    await expect(standBadge).toHaveAttribute(
      'aria-label',
      /Must stand before moving: stand-up cost 2 MP; PSR required TN 5/,
    );
  });

  test('shows impossible stand-up reasons in browser', async ({ page }) => {
    const reason = 'Cannot stand with a destroyed leg and both arms destroyed';
    await page.goto('/e2e/tactical-map?scenario=impossible-stand-up');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('IMP');

    const blockedDestination = page.getByTestId('hex-1-0');
    await expect(blockedDestination).toHaveAttribute('data-reachable', 'false');
    await expect(blockedDestination).toHaveAttribute(
      'data-movement-type',
      'walk',
    );
    await expect(blockedDestination).toHaveAttribute(
      'data-movement-mode',
      'walk',
    );
    await expect(blockedDestination).toHaveAttribute('data-mp-cost', '2');
    await expect(blockedDestination).toHaveAttribute(
      'data-stand-up-required',
      'true',
    );
    await expect(blockedDestination).toHaveAttribute(
      'data-stand-up-mode',
      'normal',
    );
    await expect(blockedDestination).toHaveAttribute('data-stand-up-cost', '2');
    await expect(blockedDestination).toHaveAttribute(
      'data-stand-up-psr-required',
      'true',
    );
    await expect(blockedDestination).toHaveAttribute(
      'data-stand-up-psr-impossible-reason',
      reason,
    );
    await expect(blockedDestination).toHaveAttribute(
      'data-movement-invalid-reason',
      'InvalidDestination',
    );
    await expect(blockedDestination).toHaveAttribute(
      'data-movement-invalid-details',
      reason,
    );

    const standBadge = page.getByTestId('hex-stand-up-badge-1-0');
    await expect(standBadge.locator('text')).toHaveText('STAND IMP');
    await expect(standBadge).toHaveAttribute(
      'data-stand-up-psr-impossible-reason',
      reason,
    );
    await expect(standBadge).toHaveAttribute(
      'aria-label',
      /Cannot stand before moving: Cannot stand with a destroyed leg and both arms destroyed; stand-up cost 2 MP; PSR impossible/,
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('STAND');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'InvalidDestination',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      reason,
    );

    await blockedDestination.dispatchEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    await expect(
      page.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toContainText(`Standing up impossible - ${reason}`);
    await expect(
      page.getByTestId('hex-tactical-tooltip-movement-reason'),
    ).toContainText(reason);
  });

  test('shows naval landfall as water-required blocked movement in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=naval-landfall-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('RVM');
    await expect(page.getByTestId('unit-token-attacker')).toContainText('NV');

    await expect(page.getByTestId('hex-0-0')).toHaveAttribute(
      'data-terrain-features',
      'water',
    );
    await expect(page.getByTestId('hex-0-0')).toHaveAttribute(
      'data-terrain-feature-levels',
      'water:1',
    );

    const landHex = page.getByTestId('hex-1-0');
    await expect(landHex).toHaveAttribute('data-reachable', 'false');
    await expect(landHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(landHex).toHaveAttribute('data-movement-mode', 'naval');
    await expect(landHex).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(landHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(landHex).toHaveAttribute('data-elevation-delta', '0');
    await expect(landHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(landHex).toHaveAttribute('data-heat-generated', '0');
    await expect(landHex).toHaveAttribute('data-terrain-features', 'clear');
    await expect(landHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'clear:0',
    );
    await expect(landHex).toHaveAttribute(
      'data-movement-blocked-reason',
      'Naval movement requires water terrain',
    );
    await expect(landHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(landHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Naval movement requires water terrain',
    );
    await expect(page.getByTestId('hex-movement-badge-1-0')).toHaveCount(0);

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('WTR');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Naval movement requires water terrain',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
  });

  test('shows tracked vehicle abrupt elevation as blocked in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=tracked-elevation-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SCN');
    await expect(page.getByTestId('unit-token-attacker')).toContainText('TK');

    const elevatedHex = page.getByTestId('hex-1-0');
    await expect(elevatedHex).toHaveAttribute('data-reachable', 'false');
    await expect(elevatedHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(elevatedHex).toHaveAttribute('data-movement-mode', 'tracked');
    await expect(elevatedHex).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(elevatedHex).toHaveAttribute('data-terrain-features', 'clear');
    await expect(elevatedHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'clear:0',
    );
    await expect(elevatedHex).toHaveAttribute('data-elevation', '2');
    await expect(elevatedHex).toHaveAttribute('data-elevation-delta', '2');
    await expect(elevatedHex).toHaveAttribute('data-elevation-cost', '4');
    await expect(elevatedHex).toHaveAttribute('data-heat-generated', '0');
    await expect(elevatedHex).toHaveAttribute(
      'data-movement-blocked-reason',
      'Elevation change of 2 exceeds Tracked movement limit',
    );
    await expect(elevatedHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(elevatedHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Elevation change of 2 exceeds Tracked movement limit',
    );
    await expect(page.getByTestId('hex-elevation-label-1-0')).toContainText(
      '+2',
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('ELEV');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Elevation change of 2 exceeds Tracked movement limit',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
  });

  test('shows runtime unit-height bridge clearance as blocked in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=runtime-height-bridge-clearance',
    );

    await expect(page.getByTestId('unit-token-attacker')).toContainText('NAV');
    await expect(page.getByTestId('unit-token-attacker')).toContainText('NV');

    const bridgeHex = page.getByTestId('hex-1-0');
    await expect(bridgeHex).toHaveAttribute('data-reachable', 'false');
    await expect(bridgeHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(bridgeHex).toHaveAttribute('data-movement-mode', 'naval');
    await expect(bridgeHex).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(bridgeHex).toHaveAttribute(
      'data-terrain-features',
      'water,bridge',
    );
    await expect(bridgeHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'bridge:1|water:1',
    );
    await expect(bridgeHex).toHaveAttribute(
      'data-movement-blocked-reason',
      'Naval movement lacks bridge clearance',
    );
    await expect(bridgeHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(bridgeHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Naval movement lacks bridge clearance',
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('BRDG');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Naval movement lacks bridge clearance',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
  });

  test('shows occupied destination as blocked movement in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=occupied-destination-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    await expect(page.getByTestId('unit-token-blocker')).toContainText('BLK');

    const occupiedHex = page.getByTestId('hex-1-0');
    await expect(occupiedHex).toHaveAttribute('data-reachable', 'false');
    await expect(occupiedHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(occupiedHex).toHaveAttribute('data-movement-mode', 'walk');
    await expect(occupiedHex).toHaveAttribute('data-mp-cost', '1');
    await expect(occupiedHex).toHaveAttribute('data-terrain-cost', '0');
    await expect(occupiedHex).toHaveAttribute('data-elevation-delta', '0');
    await expect(occupiedHex).toHaveAttribute('data-elevation-cost', '0');
    await expect(occupiedHex).toHaveAttribute('data-heat-generated', '0');
    await expect(occupiedHex).toHaveAttribute('data-terrain-features', 'clear');
    await expect(occupiedHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'clear:0',
    );
    await expect(occupiedHex).toHaveAttribute(
      'data-movement-blocked-reason',
      'Destination hex is occupied',
    );
    await expect(occupiedHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'DestinationOccupied',
    );
    await expect(occupiedHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Destination hex is occupied',
    );
    await expect(page.getByTestId('hex-movement-badge-1-0')).toHaveCount(0);

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('OCC');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Destination hex is occupied',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'DestinationOccupied',
    );
  });

  test('shows QuadVee Mek conversion mode as elevation-legal in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=quadvee-mek-elevation-climb');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('QVM');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'walk',
    );
    await expect(page.getByTestId('mp-legend-jump')).not.toHaveAttribute(
      'data-disabled',
      'true',
    );

    const mekClimb = page.getByTestId('hex-1-0');
    await expect(mekClimb).toHaveAttribute('data-reachable', 'true');
    await expect(mekClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(mekClimb).toHaveAttribute('data-movement-mode', 'walk');
    await expect(mekClimb).toHaveAttribute('data-mp-cost', '3');
    await expect(mekClimb).toHaveAttribute('data-terrain-cost', '0');
    await expect(mekClimb).toHaveAttribute('data-elevation', '2');
    await expect(mekClimb).toHaveAttribute('data-elevation-delta', '2');
    await expect(mekClimb).toHaveAttribute('data-elevation-cost', '2');
    await expect(mekClimb).toHaveAttribute('data-heat-generated', '1');
    await expect(page.getByTestId('hex-movement-badge-1-0')).toBeVisible();
    await expect(
      page.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveCount(0);
  });

  test('shows QuadVee vehicle conversion mode as tracked elevation-blocked in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=quadvee-vehicle-elevation-blocked',
    );

    await expect(page.getByTestId('unit-token-attacker')).toContainText('QVT');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'tracked',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled',
      'true',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-mp',
      '0',
    );

    const vehicleClimb = page.getByTestId('hex-1-0');
    await expect(vehicleClimb).toHaveAttribute('data-reachable', 'false');
    await expect(vehicleClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(vehicleClimb).toHaveAttribute('data-movement-mode', 'tracked');
    await expect(vehicleClimb).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(vehicleClimb).toHaveAttribute('data-elevation', '2');
    await expect(vehicleClimb).toHaveAttribute('data-elevation-delta', '2');
    await expect(vehicleClimb).toHaveAttribute('data-elevation-cost', '4');
    await expect(vehicleClimb).toHaveAttribute('data-heat-generated', '0');
    await expect(vehicleClimb).toHaveAttribute(
      'data-movement-blocked-reason',
      'Elevation change of 2 exceeds Tracked movement limit',
    );
    await expect(vehicleClimb).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(vehicleClimb).toHaveAttribute(
      'data-movement-invalid-details',
      'Elevation change of 2 exceeds Tracked movement limit',
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('ELEV');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
  });

  test('shows LAM Mek conversion mode as blocked before AirMek projection applies', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=lam-mek-elevation-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('LMM');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'walk',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '4',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-run-mp',
      '6',
    );

    const mekClimb = page.getByTestId('hex-3-0');
    await expect(mekClimb).toHaveAttribute('data-reachable', 'false');
    await expect(mekClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(mekClimb).toHaveAttribute('data-movement-mode', 'walk');
    await expect(mekClimb).toHaveAttribute('data-mp-cost', '5');
    await expect(mekClimb).toHaveAttribute('data-terrain-cost', '0');
    await expect(mekClimb).toHaveAttribute('data-elevation', '2');
    await expect(mekClimb).toHaveAttribute('data-elevation-delta', '2');
    await expect(mekClimb).toHaveAttribute('data-elevation-cost', '2');
    await expect(mekClimb).toHaveAttribute(
      'data-movement-blocked-reason',
      'Path costs 5 MP, but only 4 MP is available',
    );
    await expect(mekClimb).toHaveAttribute(
      'data-movement-invalid-reason',
      'InsufficientMP',
    );
    await expect(mekClimb).toHaveAttribute(
      'data-movement-invalid-details',
      'Path costs 5 MP, but only 4 MP is available',
    );
    await expect(page.getByTestId('hex-movement-badge-3-0')).toHaveCount(0);

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-3-0');
    await expect(invalidBadge.locator('text')).toHaveText('NO MP');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'InsufficientMP',
    );
  });

  test('shows LAM AirMek conversion mode as WiGE elevation crossing in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=lam-airmek-elevation-crossing');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('LMA');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'wige',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '6',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-run-mp',
      '9',
    );

    const airMekClimb = page.getByTestId('hex-3-0');
    await expect(airMekClimb).toHaveAttribute('data-reachable', 'true');
    await expect(airMekClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(airMekClimb).toHaveAttribute('data-movement-mode', 'wige');
    await expect(airMekClimb).toHaveAttribute('data-mp-cost', '3');
    await expect(airMekClimb).toHaveAttribute('data-terrain-cost', '0');
    await expect(airMekClimb).toHaveAttribute('data-elevation', '2');
    await expect(airMekClimb).toHaveAttribute('data-elevation-delta', '2');
    await expect(airMekClimb).toHaveAttribute('data-elevation-cost', '0');
    await expect(airMekClimb).toHaveAttribute('data-heat-generated', '1');
    await expect(page.getByTestId('hex-movement-badge-3-0')).toBeVisible();
    await expect(
      page.getByTestId('hex-movement-invalid-badge-3-0'),
    ).toHaveCount(0);
  });

  test('shows LAM AirMek long cruise heat from used movement points in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=lam-airmek-long-cruise-heat');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('LAH');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'wige',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '6',
    );

    const airMekCruise = page.getByTestId('hex-6-0');
    await expect(airMekCruise).toHaveAttribute('data-reachable', 'true');
    await expect(airMekCruise).toHaveAttribute('data-movement-type', 'walk');
    await expect(airMekCruise).toHaveAttribute('data-movement-mode', 'wige');
    await expect(airMekCruise).toHaveAttribute('data-mp-cost', '6');
    await expect(airMekCruise).toHaveAttribute('data-terrain-cost', '0');
    await expect(airMekCruise).toHaveAttribute('data-elevation', '0');
    await expect(airMekCruise).toHaveAttribute('data-elevation-delta', '0');
    await expect(airMekCruise).toHaveAttribute('data-elevation-cost', '0');
    await expect(airMekCruise).toHaveAttribute('data-heat-generated', '2');
    await expect(page.getByTestId('hex-movement-badge-6-0')).toBeVisible();
    await expect(
      page.getByTestId('hex-movement-invalid-badge-6-0'),
    ).toHaveCount(0);
  });

  test('shows grounded LAM Fighter conversion mode as wheeled elevation-blocked in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=lam-fighter-grounded-elevation-blocked',
    );

    await expect(page.getByTestId('unit-token-attacker')).toContainText('LMF');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'wheeled',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '1',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-run-mp',
      '1',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled',
      'true',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-mp',
      '0',
    );

    const fighterClimb = page.getByTestId('hex-1-0');
    await expect(fighterClimb).toHaveAttribute('data-reachable', 'false');
    await expect(fighterClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(fighterClimb).toHaveAttribute('data-movement-mode', 'wheeled');
    await expect(fighterClimb).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(fighterClimb).toHaveAttribute('data-terrain-cost', '0');
    await expect(fighterClimb).toHaveAttribute('data-elevation', '2');
    await expect(fighterClimb).toHaveAttribute('data-elevation-delta', '2');
    await expect(fighterClimb).toHaveAttribute('data-elevation-cost', '4');
    await expect(fighterClimb).toHaveAttribute('data-heat-generated', '0');
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-blocked-reason',
      'Elevation change of 2 exceeds Wheeled movement limit',
    );
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-invalid-details',
      'Elevation change of 2 exceeds Wheeled movement limit',
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('ELEV');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
  });

  test('shows airborne LAM Fighter ground movement as rules-blocked in browser', async ({
    page,
  }) => {
    const reason =
      'Airborne LAM Fighter movement uses aerospace flight rules and is not available in the ground movement projection';
    await page.goto(
      '/e2e/tactical-map?scenario=lam-fighter-airborne-ground-movement-blocked',
    );

    await expect(page.getByTestId('unit-token-attacker')).toContainText('LAF');
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'walk',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '2',
    );
    await expect(page.getByTestId('mp-legend')).toHaveAttribute(
      'data-run-mp',
      '3',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled',
      'true',
    );
    await expect(page.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-mp',
      '0',
    );

    const fighterClimb = page.getByTestId('hex-1-0');
    await expect(fighterClimb).toHaveAttribute('data-reachable', 'false');
    await expect(fighterClimb).toHaveAttribute('data-movement-type', 'walk');
    await expect(fighterClimb).toHaveAttribute('data-movement-mode', 'walk');
    await expect(fighterClimb).toHaveAttribute('data-mp-cost', 'Infinity');
    await expect(fighterClimb).toHaveAttribute('data-terrain-cost', '0');
    await expect(fighterClimb).toHaveAttribute('data-elevation', '2');
    await expect(fighterClimb).toHaveAttribute('data-elevation-cost', '0');
    await expect(fighterClimb).toHaveAttribute('data-heat-generated', '0');
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-blocked-reason',
      reason,
    );
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-invalid-reason',
      'InvalidDestination',
    );
    await expect(fighterClimb).toHaveAttribute(
      'data-movement-invalid-details',
      reason,
    );

    const invalidBadge = page.getByTestId('hex-movement-invalid-badge-1-0');
    await expect(invalidBadge.locator('text')).toHaveText('AERO');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'InvalidDestination',
    );
  });

  test('shows run-selected water fallback as walking with blocked run metadata', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=run-water-walk-fallback');

    const waterHex = page.getByTestId('hex-2-0');
    await expect(waterHex).toHaveAttribute('data-terrain-features', 'water');
    await expect(waterHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'water:2',
    );
    await expect(waterHex).toHaveAttribute('data-reachable', 'true');
    await expect(waterHex).toHaveAttribute('data-movement-type', 'walk');
    await expect(waterHex).toHaveAttribute('data-movement-mode', 'walk');
    await expect(waterHex).toHaveAttribute('data-movement-option-count', '2');
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-types',
      'walk,run',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:blocked',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-costs',
      'walk:5|run:Infinity',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-terrain-costs',
      'walk:3|run:0',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-heats',
      'walk:1|run:0',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-blocked-reasons',
      'run:Water blocks ground movement',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-invalid-reasons',
      'run:TerrainBlocked',
    );
    await expect(waterHex).toHaveAttribute(
      'data-movement-option-invalid-details',
      'run:Water blocks ground movement',
    );

    const movementBadge = page.getByTestId('hex-movement-badge-2-0');
    await expect(movementBadge).toContainText('W5 MP');
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-type',
      'walk',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-costs',
      'walk:5|run:Infinity',
    );
    await expect(movementBadge).toHaveAttribute(
      'data-movement-badge-option-blocked-reasons',
      'run:Water blocks ground movement',
    );

    const blockedOptionsBadge = page.getByTestId(
      'hex-movement-blocked-options-badge-2-0',
    );
    await expect(blockedOptionsBadge.locator('text')).toHaveText('R BLK');
    await expect(blockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-types',
      'run',
    );
    await expect(blockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-invalid-reasons',
      'run:TerrainBlocked',
    );
    await expect(blockedOptionsBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-invalid-details',
      'run:Water blocks ground movement',
    );

    const costBadge = page.getByTestId('hex-movement-cost-badge-2-0');
    await expect(costBadge).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '3',
    );
    await expect(costBadge.locator('text')).toHaveText('T+3');
  });

  test('renders mounted battle armor as a host passenger badge in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=mounted-ba-passenger');

    const projectionLayer = page.getByTestId('map-projection-layer');
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );

    const host = page.getByTestId('unit-token-attacker');
    const passenger = page.getByTestId('unit-token-ba-passenger');
    await expect(host).toBeVisible();
    await expect(passenger).toBeVisible();
    await expect(passenger).toHaveAttribute('data-unit-type', 'battle_armor');
    await expect(passenger).toHaveAttribute('data-mounted-on', 'attacker');
    await expect(passenger).toHaveAttribute('data-passenger-host', 'attacker');
    await expect(passenger).toHaveAttribute('data-passenger-slot', 'back');
    await expect(passenger).toHaveAttribute('data-token-map-position', '0,0');
    await expect(passenger).toHaveAttribute(
      'data-token-source-position',
      '2,0',
    );
    await expect(passenger).toHaveAttribute(
      'aria-label',
      /mounted on attacker/,
    );
    await expect(passenger).toHaveAttribute(
      'aria-label',
      /passenger slot back/,
    );

    const badge = page.getByTestId('ba-badge-ba-passenger');
    await expect(badge).toHaveAttribute(
      'data-ba-passenger-name',
      'Gray Death Scout BA',
    );
    await expect(badge).toHaveAttribute('data-ba-passenger-designation', 'GDS');
    await expect(badge).toHaveAttribute('data-ba-passenger-troopers', '4');
    await expect(badge.locator('text').first()).toContainText('BA');
    await expect(badge.locator('text').nth(1)).toHaveText('GDS');

    const topDownPassengerIsHostOwned = await passenger.evaluate((node) =>
      Boolean(node.closest('[data-testid="unit-token-attacker"]')),
    );
    expect(topDownPassengerIsHostOwned).toBe(true);

    await page.getByTestId('projection-toggle').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(
      page.getByTestId('isometric-scene-token-attacker'),
    ).toBeVisible();
    const isometricPassenger = page.getByTestId('unit-token-ba-passenger');
    await expect(isometricPassenger).toBeVisible();
    await expect(isometricPassenger).toHaveAttribute(
      'data-token-map-position',
      '0,0',
    );
    await expect(isometricPassenger).toHaveAttribute(
      'data-token-source-position',
      '2,0',
    );
    const isometricPassengerIsHostOwned = await isometricPassenger.evaluate(
      (node) =>
        Boolean(node.closest('[data-testid="isometric-scene-token-attacker"]')),
    );
    expect(isometricPassengerIsHostOwned).toBe(true);
  });

  test('renders state-derived aerospace altitude and velocity in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=aerospace-velocity-projection');

    const projectionLayer = page.getByTestId('map-projection-layer');
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );

    const aerospaceToken = page.getByTestId('unit-token-aero-attacker');
    await expect(aerospaceToken).toBeVisible();
    await expect(aerospaceToken).toHaveAttribute('data-unit-type', 'aerospace');
    await expect(aerospaceToken).toHaveAttribute(
      'data-aerospace-altitude',
      '4',
    );
    await expect(aerospaceToken).toHaveAttribute(
      'data-aerospace-velocity',
      '7',
    );
    await expect(aerospaceToken).toHaveAttribute('aria-label', /altitude 4/);
    await expect(aerospaceToken).toHaveAttribute('aria-label', /velocity 7/);
    await expect(page.getByTestId('altitude-badge')).toHaveText('4');
    await expect(page.getByTestId('velocity-vector')).toBeVisible();

    await page.getByTestId('projection-toggle').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-token-unit-type', 'aerospace');
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-token-map-position', '0,0');
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-token-source-position', '0,0');
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-token-facing', '1');
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-aerospace-altitude', '4');
    await expect(
      page.getByTestId('isometric-scene-token-aero-attacker'),
    ).toHaveAttribute('data-isometric-aerospace-velocity', '7');
    const isometricAerospaceToken = page.getByTestId(
      'unit-token-aero-attacker',
    );
    await expect(isometricAerospaceToken).toHaveAttribute(
      'data-aerospace-altitude',
      '4',
    );
    await expect(isometricAerospaceToken).toHaveAttribute(
      'data-aerospace-velocity',
      '7',
    );
    await expect(page.getByTestId('altitude-badge')).toHaveText('4');
    await expect(page.getByTestId('velocity-vector')).toBeVisible();
  });

  test('suppresses ground-only minimum range against airborne aerospace in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=airborne-aerospace-minimum-range',
    );

    const projectionLayer = page.getByTestId('map-projection-layer');
    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );

    const targetToken = page.getByTestId('unit-token-airborne-aero-target');
    await expect(targetToken).toBeVisible();
    await expect(targetToken).toHaveAttribute('data-unit-type', 'aerospace');
    await expect(targetToken).toHaveAttribute('data-aerospace-altitude', '3');
    await expect(targetToken).toHaveAttribute('data-aerospace-velocity', '5');
    await expect(targetToken).toHaveAttribute('aria-label', /altitude 3/);
    await expect(targetToken).toHaveAttribute('aria-label', /velocity 5/);

    const targetHex = page.getByTestId('hex-0-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'airborne-aero-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute('data-combat-distance', '1');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'minimum-lrm',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Ground-to-air altitude:1/,
    );
    expect(
      (await targetHex.getAttribute('data-combat-to-hit-modifiers')) ?? '',
    ).not.toContain('Minimum Range');
    expect(
      await targetHex.getAttribute('data-combat-minimum-range-penalty'),
    ).toBeNull();
    expect(
      await targetHex.getAttribute('data-combat-minimum-range-reason'),
    ).toBeNull();
    await expect(page.getByTestId('hex-minimum-range-badge-0-0')).toHaveCount(
      0,
    );

    const combatBadge = page.getByTestId('hex-combat-badge-0-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'true',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      'minimum-lrm',
    );

    await page.getByTestId('projection-toggle').click();

    await expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(
      page.getByTestId('isometric-scene-token-airborne-aero-target'),
    ).toBeVisible();
    await expect(
      page.getByTestId('unit-token-airborne-aero-target'),
    ).toHaveAttribute('data-aerospace-altitude', '3');
  });

  test('blocks indirect fire against airborne aerospace in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=airborne-aerospace-indirect-rejected',
    );

    const targetToken = page.getByTestId('unit-token-airborne-aero-target');
    await expect(targetToken).toBeVisible();
    await expect(targetToken).toHaveAttribute('data-unit-type', 'aerospace');
    await expect(targetToken).toHaveAttribute('data-aerospace-altitude', '3');
    await expect(targetToken).toHaveAttribute('data-aerospace-velocity', '5');

    const targetHex = page.getByTestId('hex-0-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'airborne-aero-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'InvalidTarget',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Indirect-fire weapons cannot engage airborne targets',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Indirect-fire weapons cannot engage airborne targets',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'minimum-lrm:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'minimum-lrm:blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'minimum-lrm:Indirect-fire weapons cannot engage airborne targets',
    );
    expect(
      await targetHex.getAttribute('data-combat-to-hit-number'),
    ).toBeNull();
    await expect(
      page.getByTestId('hex-combat-invalid-badge-0-0'),
    ).toHaveAttribute('data-invalid-badge-code', 'InvalidTarget');

    await page.getByTestId('projection-toggle').click();

    await expect(page.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    await expect(
      page.getByTestId('isometric-scene-token-airborne-aero-target'),
    ).toBeVisible();
  });

  test('shows C3 spotter range benefit in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=c3-range-benefit');

    await expect(page.getByTestId('unit-token-c3-spotter')).toContainText(
      'RVN',
    );

    const targetHex = page.getByTestId('hex-1-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'medium-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '4');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'medium-laser:medium',
    );
    await expect(targetHex).toHaveAttribute('data-combat-c3-benefit', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-c3-spotter',
      'c3-spotter',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-c3-spotter-range',
      '1',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /C3 Network:0/,
    );
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /C3: spotter c3-spotter at 1 hex improves to short range/,
    );
    await targetHex.dispatchEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    const c3Context = page.getByTestId('hex-combat-tooltip-c3-context');
    await expect(c3Context).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(c3Context).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    await expect(c3Context).toHaveAttribute(
      'data-combat-c3-rule-refs',
      /combat:megamek:MegaMek Compute\.java:1313-1517 weapon range\/to-hit modifiers/,
    );

    const combatBadge = page.getByTestId('hex-combat-badge-1-2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'short',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'S4');
  });

  test('shows underwater weapon environment restrictions in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=underwater-environment-restrictions',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'underwater-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute('data-weapons-available', 'lrt-15');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-environment-states',
      'medium-laser:blocked|lrt-15:legal',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'medium-laser:Target underwater, but not weapon.',
    );

    await targetHex.dispatchEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    const environmentContext = page.getByTestId(
      'hex-combat-tooltip-environment-context',
    );
    await expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-weapon-ids',
      'medium-laser',
    );
    await expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-reasons',
      'Target underwater, but not weapon.',
    );
    await expect(environmentContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(environmentContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    await expect(environmentContext).toHaveAttribute(
      'data-combat-environment-rule-refs',
      /combat:megamek:MegaMek common\/actions\/compute\/ComputeTerrainMods\.java:167-188 target water and partial-underwater handling/,
    );
  });

  test('shows LOS-spotter indirect fire in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=indirect-fire-spotter');

    await expect(page.getByTestId('unit-token-indirect-spotter')).toContainText(
      'RVN',
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'minimum-lrm',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'minimum-lrm:medium',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-spotter',
      'indirect-spotter',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'los',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter indirect-spotter (+1)',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Indirect fire:1/,
    );
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /Indirect fire via spotter indirect-spotter \(\+1\)/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toContainText('IND');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'los',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-spotter',
      'indirect-spotter',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'medium',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'M3');
  });

  // Audit C-5: this browser check formerly pinned the artillery-only
  // spotter-gunnery modifier; it now pins the corrected +1 spotter-attacking
  // modifier (MegaMek ComputeToHit.java L1540-1544).
  test('shows spotter-attacked indirect fire in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=indirect-fire-spotter-skill');

    await expect(page.getByTestId('unit-token-indirect-spotter')).toContainText(
      'RVN',
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-spotter',
      'indirect-spotter',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'los',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '2',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-spotter-attacked',
      'true',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter indirect-spotter (+2); spotter attacked this turn adds +1',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '8');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Indirect fire:2/,
    );
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /spotter attacked this turn adds \+1/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-spotter-attacked',
      'true',
    );
    await expect(indirectBadge).toHaveAttribute(
      'aria-label',
      /spotter attacked this turn adds \+1/,
    );
  });

  test('shows Forward Observer indirect-fire cancellation in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=forward-observer-indirect-fire',
    );

    await expect(page.getByTestId('unit-token-indirect-spotter')).toContainText(
      'RVN',
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'minimum-lrm',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-spotter',
      'indirect-spotter',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'los',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-forward-observer',
      'true',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty-cancelled',
      '1',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter indirect-spotter (+1); Forward Observer cancels walked spotter penalty',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /Forward Observer cancels walked spotter penalty/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toContainText('IND');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'los',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-spotter',
      'indirect-spotter',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-forward-observer',
      'true',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-penalty-cancelled',
      '1',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'medium',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'M3');
  });

  test('shows NARC beacon indirect fire in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=narc-beacon-indirect-fire');

    await expect(page.getByTestId('unit-token-indirect-target')).toContainText(
      'LCT',
    );
    await expect(page.getByTestId('unit-token-indirect-spotter')).toHaveCount(
      0,
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'minimum-lrm',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).not.toHaveAttribute('data-combat-indirect-spotter');
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'narc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via NARC beacon (+1)',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /Indirect fire via NARC beacon \(\+1\)/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toContainText('IND');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'narc',
    );
    await expect(indirectBadge).not.toHaveAttribute(
      'data-combat-indirect-badge-spotter',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-penalty',
      '1',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'medium',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'M3');
  });

  test('shows iNarc beacon indirect fire in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=inarc-beacon-indirect-fire');

    await expect(page.getByTestId('unit-token-indirect-target')).toContainText(
      'LCT',
    );
    await expect(page.getByTestId('unit-token-indirect-spotter')).toHaveCount(
      0,
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'minimum-lrm',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).not.toHaveAttribute('data-combat-indirect-spotter');
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'inarc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via INARC beacon (+1)',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    await expect(targetHex).toHaveAttribute(
      'aria-label',
      /Indirect fire via INARC beacon \(\+1\)/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toContainText('IND');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'inarc',
    );
    await expect(indirectBadge).not.toHaveAttribute(
      'data-combat-indirect-badge-spotter',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-penalty',
      '1',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'medium',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'M3');
  });

  test('shows semi-guided TAG indirect fire in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=semi-guided-tag-indirect-fire');

    await expect(page.getByTestId('unit-token-indirect-target')).toContainText(
      'LCT',
    );
    await expect(page.getByTestId('unit-token-indirect-spotter')).toHaveCount(
      0,
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'semi-guided-lrm-15',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    await expect(targetHex).not.toHaveAttribute('data-combat-indirect-spotter');
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-basis',
      'semi-guided-tag',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty',
      '0',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Semi-guided indirect fire via TAG (no indirect penalty)',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    await expect(targetHex).not.toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Indirect fire/,
    );

    const indirectBadge = page.getByTestId('hex-indirect-fire-badge-3-0');
    await expect(indirectBadge).toContainText('IND');
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'semi-guided-tag',
    );
    await expect(indirectBadge).not.toHaveAttribute(
      'data-combat-indirect-badge-spotter',
    );
    await expect(indirectBadge).toHaveAttribute(
      'data-combat-indirect-badge-penalty',
      '0',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'short',
    );
    await expect(combatBadge).toHaveAttribute('data-combat-badge-label', 'S3');
  });

  test('shows ECM-nullified TAG indirect fire blocked in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=ecm-nullified-tag-indirect-fire',
    );

    await expect(page.getByTestId('unit-token-indirect-target')).toContainText(
      'LCT',
    );
    await expect(page.getByTestId('unit-token-indirect-spotter')).toHaveCount(
      0,
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'indirect-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'semi-guided-lrm-15',
    );
    await expect(targetHex).not.toHaveAttribute('data-combat-indirect-fire');
    await expect(targetHex).not.toHaveAttribute('data-combat-indirect-basis');
    await expect(targetHex).toHaveAttribute(
      'data-combat-indirect-blocked-reason',
      ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      new RegExp(
        `${ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON}.*Blocked by`,
      ),
    );

    await expect(page.getByTestId('hex-indirect-fire-badge-3-0')).toHaveCount(
      0,
    );
    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-3-0');
    await expect(invalidBadge).toContainText('TAG');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      new RegExp(
        `${ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON}.*Blocked by`,
      ),
    );
  });

  test('shows target terrain to-hit modifiers without cover badges in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=target-terrain-modifier');

    const targetHex = page.getByTestId('hex-0-1');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'woods-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-terrain-features',
      'light_woods',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Terrain:1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Terrain \+1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    await expect(page.getByTestId('hex-cover-badge-0-1')).toHaveCount(0);

    const terrainBadge = page.getByTestId('hex-terrain-label-0-1');
    await expect(terrainBadge).toHaveAttribute(
      'data-terrain-features',
      'light_woods',
    );
    await expect(terrainBadge).toContainText('LW');

    await targetHex.dispatchEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Terrain/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /1/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Target in light woods: \+1/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      /combat:megamek:MegaMek Compute\.java:1313-1517 weapon range\/to-hit modifiers/,
    );
    const targetTerrainModifier = page.locator(
      '[data-testid="hex-combat-tooltip-to-hit-modifiers"] [data-combat-to-hit-modifier-name="Target Terrain"]',
    );
    await expect(targetTerrainModifier).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      /combat:megamek:MegaMek LosEffects\.java:797-911 LOS blocking and terrain modifiers/,
    );
    await expect(
      page.getByTestId('hex-combat-tooltip-modifiers'),
    ).toContainText('Target Terrain +1');
    await expect(page.getByTestId('hex-combat-tooltip-cover')).toHaveCount(0);
  });

  test('shows prone attacker and target to-hit modifiers in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=prone-combat-modifiers');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('PRN');
    await expect(page.getByTestId('unit-token-prone-target')).toContainText(
      'P-LCT',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'prone-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Attacker Prone:2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Prone:1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Attacker Prone \+2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Prone \+1/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN7');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '7',
    );

    await targetHex.hover({ force: true });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Attacker Prone/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Prone/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /2/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /1/,
    );
  });

  test('shows shutdown target immobile to-hit modifiers in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=immobile-combat-modifier');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    await expect(page.getByTestId('unit-token-shutdown-target')).toContainText(
      'SDN',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'shutdown-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Immobile:-4/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Immobile -4/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN0');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '0',
    );

    await targetHex.locator('path[data-terrain="clear"]').hover({
      position: { x: 72, y: 34 },
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Immobile/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /-4/,
    );
  });

  test('shows hot attacker to-hit modifiers in browser', async ({ page }) => {
    await page.goto('/e2e/tactical-map?scenario=heat-combat-modifier');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('HOT');
    await expect(page.getByTestId('unit-token-heat-target')).toContainText(
      'COOL',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'heat-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Heat:2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Heat \+2/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN6');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '6',
    );

    await targetHex.locator('path[data-terrain="clear"]').hover({
      position: { x: 72, y: 34 },
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Heat/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /2/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Heat 13: \+2/,
    );
  });

  test('shows attacker and target movement to-hit modifiers in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=movement-combat-modifier');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('RUN');
    await expect(page.getByTestId('unit-token-moving-target')).toContainText(
      'TMM',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'moving-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '8');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Attacker Movement:2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Movement \(TMM\):2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Attacker Movement \+2/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Movement \(TMM\) \+2/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN8');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '8',
    );

    await targetHex.locator('path[data-terrain="clear"]').hover({
      position: { x: 72, y: 34 },
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Attacker Movement/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Movement \(TMM\)/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /2/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Attacker run: \+2/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Target moved 5 hexes: \+2/,
    );
  });

  test('shows walked attacker and target movement to-hit modifiers in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=walk-combat-modifier');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('WLK');
    await expect(page.getByTestId('unit-token-walking-target')).toContainText(
      'W-TMM',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'walking-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Attacker Movement:1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Movement \(TMM\):1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Attacker Movement \+1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Movement \(TMM\) \+1/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN6');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '6',
    );

    await targetHex.locator('path[data-terrain="clear"]').hover({
      position: { x: 72, y: 34 },
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Attacker Movement/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Movement \(TMM\)/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /1/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Attacker walk: \+1/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Target moved 3 hexes: \+1/,
    );
  });

  test('shows jumped attacker and target movement to-hit modifiers in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=jump-combat-modifier');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('JMP');
    await expect(page.getByTestId('unit-token-jumping-target')).toContainText(
      'J-TMM',
    );

    const targetHex = page.getByTestId('hex-2-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'jumping-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '11');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Attacker Movement:3/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Target Movement \(TMM\):4/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Attacker Movement \+3/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Target Movement \(TMM\) \+4/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge-2-0');
    await expect(toHitBadge).toContainText('TN11');
    await expect(toHitBadge).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '11',
    );

    await targetHex.locator('path[data-terrain="clear"]').hover({
      position: { x: 72, y: 34 },
    });
    const toHitRows = page.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Attacker Movement/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      /Target Movement \(TMM\)/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /3/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      /4/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Attacker jump: \+3/,
    );
    await expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-descriptions',
      /Target moved 7 hexes \(jumped\): \+4/,
    );
  });

  test('keeps visible targets attackable on mixed same-hex fog contacts in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=mixed-visibility-targets');

    const targetHex = page.getByTestId('hex-1-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'medium-target,same-hex-hidden-contact,same-hex-last-known-contact',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      'medium-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'same-hex-hidden-contact,same-hex-last-known-contact',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target-ids',
      'medium-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-visibility',
      'mixed',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    await expect(targetHex).not.toHaveAttribute(
      'data-combat-visibility-blocked-reason',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser,extreme-lrm',
    );

    const visibilityBadge = page.getByTestId('hex-combat-visibility-badge-1-2');
    await expect(visibilityBadge.locator('text')).toHaveText('MIX');
    await expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-state',
      'mixed',
    );
    await expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Target visibility mixed',
    );

    await targetHex.hover();
    const tooltipVisibility = page.getByTestId('hex-combat-tooltip-visibility');
    await expect(tooltipVisibility).toContainText('Visibility: mixed');
    await expect(tooltipVisibility).toContainText('visible medium-target');
    await expect(tooltipVisibility).toContainText(
      'obscured same-hex-hidden-contact, same-hex-last-known-contact',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-combat-visibility-state',
      'mixed',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-combat-visibility-visible-target-ids',
      'medium-target',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-combat-visibility-obscured-target-ids',
      'same-hex-hidden-contact|same-hex-last-known-contact',
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-combat-visibility-source-refs',
      /combat:megamek:MegaMek combat target projection/,
    );
    await expect(tooltipVisibility).toHaveAttribute(
      'data-combat-visibility-rule-refs',
      /combat:megamek:MegaMek LosEffects\.java:797-911 LOS blocking and terrain modifiers/,
    );
    await expect(page.getByTestId('hex-combat-tooltip-status')).toContainText(
      'Attack available',
    );
  });

  test('shows grid-derived fog LOS blockers as non-attackable last-known contacts', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=fog-los-terrain-blocked');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('SHD');
    const targetToken = page.getByTestId('unit-token-fog-los-target');
    await expect(targetToken).toContainText('WSP');
    await expect(targetToken).toHaveAttribute('data-fog-status', 'lastKnown');
    await expect(page.getByTestId('fog-marker-fog-los-target')).toBeVisible();

    const heavyWoodsHex = page.getByTestId('hex-1-0');
    await expect(heavyWoodsHex).toHaveAttribute(
      'data-terrain-features',
      'heavy_woods',
    );
    await expect(heavyWoodsHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'heavy_woods:2',
    );
    const lightWoodsHex = page.getByTestId('hex-2-0');
    await expect(lightWoodsHex).toHaveAttribute(
      'data-terrain-features',
      'light_woods',
    );
    await expect(lightWoodsHex).toHaveAttribute(
      'data-terrain-feature-levels',
      'light_woods:1',
    );

    const targetHex = page.getByTestId('hex-3-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'fog-los-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      '',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'fog-los-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target-ids', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-visibility',
      'lastKnown',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    await expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-hex',
      '2,0',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      'light_woods',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by light woods at (2, 0)',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Last known contact is not currently visible',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Last known contact is not currently visible',
    );

    const visibilityBadge = page.getByTestId('hex-combat-visibility-badge-3-0');
    await expect(visibilityBadge.locator('text')).toHaveText('LAST');
    await expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-state',
      'lastKnown',
    );
    await expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Last known contact is not currently visible',
    );
    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-3-0');
    await expect(invalidBadge.locator('text')).toHaveText('HIDDEN');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TargetNotVisible',
    );

    await targetHex.hover();
    await expect(
      page.getByTestId('hex-combat-tooltip-visibility'),
    ).toContainText('Visibility: last known');
    await expect(page.getByTestId('hex-combat-tooltip-status')).toContainText(
      'Blocked',
    );
    await expect(page.getByTestId('hex-combat-tooltip-reason')).toContainText(
      'Last known contact is not currently visible',
    );
  });

  test('shows same-hex normal weapon attacks as blocked in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=same-hex-weapon-blocked');

    const targetHex = page.getByTestId('hex-0-0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'same-hex-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '0');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'SameHex',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Attacker and target occupy the same hex',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Attacker and target occupy the same hex',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'medium-laser:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'medium-laser:blocked',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-0-0');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'false',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-distance',
      '0',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      '',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-0-0');
    await expect(invalidBadge.locator('text')).toHaveText('SAME');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'SameHex',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Attacker and target occupy the same hex',
    );
  });

  test('shows selected weapon out of arc as blocked in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=selected-weapon-out-of-arc');

    const targetHex = page.getByTestId('hex-0-1');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'rear-arc-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '1');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute('data-combat-firing-arc', 'rear');
    await expect(targetHex).toHaveAttribute('data-combat-in-arc', 'false');
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfArc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No selected weapons can fire into the rear arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No weapons cover rear arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'front-arc-laser',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-in-arc', '');
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'front-arc-laser:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'front-arc-laser:out-of-arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'front-arc-laser:blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'front-arc-laser:out of rear arc',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-0-1');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'false',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-arc-states',
      'front-arc-laser:out-of-arc',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'front-arc-laser:out of rear arc',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-0-1');
    await expect(invalidBadge.locator('text')).toHaveText('ARC');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'OutOfArc',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'No selected weapons can fire into the rear arc',
    );

    const arcBadge = page.getByTestId('hex-combat-arc-badge-0-1');
    await expect(arcBadge.locator('text')).toHaveText('REAR');
    await expect(arcBadge).toHaveAttribute('data-combat-arc-badge-arc', 'rear');
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'false',
    );
  });

  test('shows vehicle sponson multi-arc weapon as available in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vehicle-sponson-in-arc');

    const targetHex = page.getByTestId('hex--2-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'left-arc-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-firing-arc',
      'left-side',
    );
    await expect(targetHex).toHaveAttribute('data-combat-in-arc', 'true');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'left-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-arc',
      'left-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'left-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'left-sponson-laser:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'left-sponson-laser:in-arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'left-sponson-laser:available',
    );

    const combatBadge = page.getByTestId('hex-combat-badge--2-2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'true',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-arc-states',
      'left-sponson-laser:in-arc',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'left-sponson-laser:available',
    );

    const arcBadge = page.getByTestId('hex-combat-arc-badge--2-2');
    await expect(arcBadge.locator('text')).toHaveText('L ARC');
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-arc',
      'left-side',
    );
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'true',
    );
  });

  test('shows right vehicle sponson multi-arc weapon as available in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vehicle-right-sponson-in-arc');

    const targetHex = page.getByTestId('hex-3--2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'right-arc-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '3');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-firing-arc',
      'right-side',
    );
    await expect(targetHex).toHaveAttribute('data-combat-in-arc', 'true');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'right-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-arc',
      'right-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'right-sponson-laser',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'right-sponson-laser:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'right-sponson-laser:in-arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'right-sponson-laser:available',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-3--2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'true',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-arc-states',
      'right-sponson-laser:in-arc',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'right-sponson-laser:available',
    );

    const arcBadge = page.getByTestId('hex-combat-arc-badge-3--2');
    await expect(arcBadge.locator('text')).toHaveText('R ARC');
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-arc',
      'right-side',
    );
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'true',
    );
  });

  test('shows chin turret pivot to-hit penalty in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vehicle-chin-turret-pivot');

    const targetHex = page.getByTestId('hex--2-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'chin-turret-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-firing-arc',
      'left-side',
    );
    await expect(targetHex).toHaveAttribute('data-combat-in-arc', 'true');
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'chin-turret-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      /Chin Turret Pivot:1/,
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      /Chin Turret Pivot \+1/,
    );

    const toHitBadge = page.getByTestId('hex-to-hit-badge--2-2');
    await expect(toHitBadge).toContainText('TN5');

    const arcBadge = page.getByTestId('hex-combat-arc-badge--2-2');
    await expect(arcBadge.locator('text')).toHaveText('L ARC');
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'true',
    );
  });

  test('shows mixed chin turret and body target numbers per weapon', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vehicle-mixed-chin-body-pivot');

    const targetHex = page.getByTestId('hex--2-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'mixed-chin-body-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    await expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'mixed-chin-turret-laser,left-body-laser',
    );
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-to-hit-numbers',
      'mixed-chin-turret-laser:5|left-body-laser:4',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-expected-damages',
      'mixed-chin-turret-laser:4.15|left-body-laser:4.6',
    );

    const aggregateModifiers = await targetHex.getAttribute(
      'data-combat-to-hit-modifiers',
    );
    expect(aggregateModifiers ?? '').not.toContain('Chin Turret Pivot:1');

    const weaponModifiers = await targetHex.getAttribute(
      'data-combat-weapon-option-to-hit-modifiers',
    );
    expect(weaponModifiers ?? '').toContain('mixed-chin-turret-laser:');
    expect(weaponModifiers ?? '').toContain('Chin Turret Pivot:1');
    const bodyModifiers = (weaponModifiers ?? '')
      .split('|')
      .find((entry) => entry.startsWith('left-body-laser:'));
    expect(bodyModifiers ?? '').not.toContain('Chin Turret Pivot:1');

    await targetHex.hover();
    const weaponOptions = page.getByTestId('hex-combat-tooltip-weapon-options');
    await expect(weaponOptions).toContainText(
      'mixed-chin-turret-laser: short range, in arc; TN 5; expected 4.2 damage; available',
    );
    await expect(weaponOptions).toContainText(
      'left-body-laser: short range, in arc; TN 4; expected 4.6 damage; available',
    );
  });

  test('shows locked vehicle turret side target as out of arc in browser', async ({
    page,
  }) => {
    await page.goto(
      '/e2e/tactical-map?scenario=vehicle-locked-turret-out-of-arc',
    );

    const targetHex = page.getByTestId('hex--2-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'locked-turret-side-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-firing-arc',
      'left-side',
    );
    await expect(targetHex).toHaveAttribute('data-combat-in-arc', 'false');
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfArc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No selected weapons can fire into the left-side arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No weapons cover left-side arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'locked-turret-ppc',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-in-arc', '');
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'locked-turret-ppc:short',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'locked-turret-ppc:out-of-arc',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'locked-turret-ppc:blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'locked-turret-ppc:out of left-side arc',
    );

    const combatBadge = page.getByTestId('hex-combat-badge--2-2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'false',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-arc-states',
      'locked-turret-ppc:out-of-arc',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'locked-turret-ppc:out of left-side arc',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge--2-2');
    await expect(invalidBadge.locator('text')).toHaveText('ARC');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'OutOfArc',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'No selected weapons can fire into the left-side arc',
    );

    const arcBadge = page.getByTestId('hex-combat-arc-badge--2-2');
    await expect(arcBadge.locator('text')).toHaveText('L ARC');
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-arc',
      'left-side',
    );
    await expect(arcBadge).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'false',
    );
  });

  test('shows all selected weapons out of range as blocked in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=out-of-range');

    const targetHex = page.getByTestId('hex-1-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'medium-target',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '4');
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-in-range', '');
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfRange',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      "Target at 4 hexes is outside the selected weapons' range",
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Out of weapon range',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'small-laser:out_of_range|minimum-lrm:out_of_range',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'small-laser:blocked|minimum-lrm:blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
    );
    await expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-1-2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'out_of_range',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-label',
      'OUT4',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'false',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      '',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'small-laser:out_of_range|minimum-lrm:out_of_range',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'small-laser:blocked|minimum-lrm:blocked',
    );

    const weaponCountBadge = page.getByTestId(
      'hex-combat-weapon-count-badge-1-2',
    );
    await expect(weaponCountBadge.locator('text')).toHaveText('0/2 WPN');
    await expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-available',
      '0',
    );
    await expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-total',
      '2',
    );
    await expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked',
      '2',
    );
    await expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-weapons-available',
      '',
    );
    await expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
    );

    await expect(
      page.getByTestId('hex-combat-invalid-badge-1-2'),
    ).toHaveAttribute('data-invalid-badge-code', 'OutOfRange');
    await expect(
      page.getByTestId('hex-projection-status-badge-1-2'),
    ).toHaveAttribute('data-projection-status-badge-status', 'blocked');
  });

  test('shows out-of-ammo attack rejection evidence in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=out-of-ammo');

    const targetHex = page.getByTestId('hex-1-2');
    await expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'medium-target',
    );
    await expect(targetHex).toHaveAttribute('data-combat-distance', '4');
    await expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    await expect(targetHex).toHaveAttribute('data-weapons-in-range', '');
    await expect(targetHex).toHaveAttribute('data-weapons-available', '');
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfAmmo',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No matching non-empty ammo bin for "AC/5"',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No matching non-empty ammo bin for "AC/5"',
    );
    await expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'dry-ac-5:medium',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'dry-ac-5:blocked',
    );
    await expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'dry-ac-5:No matching non-empty ammo bin for "AC/5"',
    );

    const combatBadge = page.getByTestId('hex-combat-badge-1-2');
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-range',
      'out_of_range',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-label',
      'OUT4',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-attackable',
      'false',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      '',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'dry-ac-5:medium',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'dry-ac-5:blocked',
    );
    await expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'dry-ac-5:No matching non-empty ammo bin for "AC/5"',
    );

    const invalidBadge = page.getByTestId('hex-combat-invalid-badge-1-2');
    await expect(invalidBadge.locator('text')).toHaveText('AMMO');
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'OutOfAmmo',
    );
    await expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'No matching non-empty ammo bin for "AC/5"',
    );
    await expect(
      page.getByTestId('hex-projection-status-badge-1-2'),
    ).toHaveAttribute('data-projection-status-badge-status', 'blocked');

    await targetHex.dispatchEvent('mouseover');
    await targetHex.dispatchEvent('mouseenter');
    await expect(page.getByTestId('hex-combat-tooltip-weapons')).toContainText(
      'Weapons: no ammunition',
    );
    await expect(page.getByTestId('hex-combat-tooltip-reason')).toContainText(
      'No matching non-empty ammo bin for "AC/5"',
    );
  });
});
