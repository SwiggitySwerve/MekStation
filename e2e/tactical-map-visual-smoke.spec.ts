import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

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
      'data-combat-weapon-option-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
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
      'data-combat-badge-weapon-option-blocked-reasons',
      'small-laser:out of range|minimum-lrm:out of range',
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

  test('shows VTOL elevation delta with zero elevation MP cost in browser', async ({
    page,
  }) => {
    await page.goto('/e2e/tactical-map?scenario=vtol-elevation-cost');

    await expect(page.getByTestId('unit-token-attacker')).toContainText('KAR');
    await expect(page.getByTestId('unit-token-attacker')).toContainText('VT');

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
    ).toBeVisible();
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
    await expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
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

    await targetHex.hover();
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
    await expect(
      page.getByTestId('hex-combat-tooltip-modifiers'),
    ).toContainText('Target Terrain +1');
    await expect(page.getByTestId('hex-combat-tooltip-cover')).toHaveCount(0);
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
    await expect(page.getByTestId('hex-combat-tooltip-status')).toContainText(
      'Attack available',
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
});
