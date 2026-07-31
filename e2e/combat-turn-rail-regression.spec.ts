import { expect, test, type Locator, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const SHORT_MOBILE_VIEWPORT = { width: 375, height: 667 } as const;

async function waitForGame(page: Page): Promise<void> {
  await page.goto('/gameplay/games/demo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('game-session')).toBeVisible();
  await expect(page.getByTestId('tactical-turn-rail')).toBeVisible();
  await expect(page.getByTestId('tactical-action-dock')).toBeVisible();
}

async function expectDistinctStackedRows(
  groups: readonly Locator[],
): Promise<void> {
  const boxes = await Promise.all(groups.map((group) => group.boundingBox()));
  for (const box of boxes) {
    expect(box).not.toBeNull();
  }
  await Promise.all(groups.map(expectCenterUnoccluded));
  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1];
    const current = boxes[index];
    if (!previous || !current) {
      throw new Error('Expected every force group to have a layout box');
    }
    expect(current.y).toBeGreaterThan(previous.y);
  }
}

async function expectMobileCommandFraming(page: Page): Promise<void> {
  const actionDock = page.getByTestId('tactical-action-dock');
  const mapContent = page.getByTestId('gameplay-main-content');
  const mapControls = page.getByTestId('zoom-controls');
  const hotkeyHint = page.getByTestId('hotkey-hint-badge');
  await expect(actionDock).toBeInViewport();
  await expect(mapControls).toBeVisible();
  await expect(hotkeyHint).toBeVisible();
  const phaseCommand = page.getByTestId('command-btn-heat-end.end-phase');
  const mobileNavigation = page.getByRole('navigation', {
    name: 'Mobile navigation',
  });
  await expect(phaseCommand).toBeVisible();
  const [commandBox, navigationBox, dockBox, mapBox, controlsBox, hintBox] =
    await Promise.all([
      phaseCommand.boundingBox(),
      mobileNavigation.boundingBox(),
      actionDock.boundingBox(),
      mapContent.boundingBox(),
      mapControls.boundingBox(),
      hotkeyHint.boundingBox(),
    ]);
  expect(commandBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(hintBox).not.toBeNull();
  if (
    !commandBox ||
    !navigationBox ||
    !dockBox ||
    !mapBox ||
    !controlsBox ||
    !hintBox
  ) {
    throw new Error(
      'Expected map, hint, controls, dock, command, and navigation layout boxes',
    );
  }
  expect(dockBox.height).toBeLessThanOrEqual(240);
  expect(mapBox.height).toBeGreaterThanOrEqual(176);
  expect(controlsBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(
    mapBox.y + mapBox.height,
  );
  expect(hintBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(controlsBox.y);
  const unobscuredMapHeight = controlsBox.y - (hintBox.y + hintBox.height);
  expect(unobscuredMapHeight).toBeGreaterThanOrEqual(64);
  await expectCenterUnoccluded(hotkeyHint);
  expect(commandBox.y + commandBox.height).toBeLessThanOrEqual(navigationBox.y);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByTestId('reset-view-btn').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('reset-view-btn')).toBeInViewport();
  await page.getByTestId('projection-toggle').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('projection-toggle')).toBeInViewport();
}

async function expectCenterUnoccluded(locator: Locator): Promise<void> {
  const isUnoccluded = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return hit !== null && (hit === element || element.contains(hit));
  });
  expect(isUnoccluded).toBe(true);
}

async function removeOpponentSideMetadata(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay;
    const session = gameplay?.getState().session;
    if (!gameplay || !session) {
      throw new Error('Expected the demo gameplay session');
    }

    const mutatedSession = structuredClone(session);
    const opponent = mutatedSession.units.find(
      (gameUnit) => gameUnit.side === 'opponent',
    );
    if (!opponent) {
      throw new Error('Expected an opponent unit');
    }
    const opponentState = mutatedSession.currentState.units[opponent.id];
    if (!opponentState) {
      throw new Error('Expected opponent unit state');
    }

    Reflect.deleteProperty(opponent, 'side');
    Reflect.deleteProperty(opponentState, 'side');
    gameplay.setState({ session: mutatedSession });
  });
}

test.describe('combat turn rail narrow framing @game @combat', () => {
  test('keeps two or three force rows framed above a visible command dock', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitForGame(page);

    await expectDistinctStackedRows([
      page.getByTestId('rail-force-allied'),
      page.getByTestId('rail-force-opposing'),
    ]);
    await expect(page.getByTestId('rail-force-unassigned')).toHaveCount(0);
    await expectMobileCommandFraming(page);

    await removeOpponentSideMetadata(page);

    await expect(page.getByTestId('rail-force-unassigned')).toBeVisible();
    await expect(page.getByTestId('rail-blocker-badge')).toBeVisible();
    await expectCenterUnoccluded(page.getByTestId('rail-blocker-badge'));
    await expectDistinctStackedRows([
      page.getByTestId('rail-force-allied'),
      page.getByTestId('rail-force-opposing'),
      page.getByTestId('rail-force-unassigned'),
    ]);
    await expectMobileCommandFraming(page);
  });

  test('keeps the map and phase command reachable on a short viewport', async ({
    page,
  }) => {
    await page.setViewportSize(SHORT_MOBILE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitForGame(page);

    const mapBox = await page
      .getByTestId('gameplay-main-content')
      .boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox?.height).toBeGreaterThanOrEqual(176);
    await expect(page.getByTestId('hex-map-container')).toBeVisible();

    const layoutScroll = await page
      .getByTestId('gameplay-layout')
      .evaluate((layout) => ({
        clientHeight: layout.clientHeight,
        scrollHeight: layout.scrollHeight,
      }));
    expect(layoutScroll.scrollHeight).toBeGreaterThan(
      layoutScroll.clientHeight,
    );

    const phaseCommand = page.getByTestId('command-btn-heat-end.end-phase');
    const mobileNavigation = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await phaseCommand.scrollIntoViewIfNeeded();
    await expect(phaseCommand).toBeInViewport();
    const [commandBox, navigationBox] = await Promise.all([
      phaseCommand.boundingBox(),
      mobileNavigation.boundingBox(),
    ]);
    expect(commandBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    if (!commandBox || !navigationBox) {
      throw new Error('Expected phase command and mobile navigation boxes');
    }
    expect(commandBox.y + commandBox.height).toBeLessThanOrEqual(
      navigationBox.y,
    );
  });
});
