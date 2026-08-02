import { expect, test, type Locator, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const SHORT_MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
const ADVERSARIAL_MOBILE_VIEWPORT = { width: 320, height: 844 } as const;

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
    expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
  }
}

async function expectReadableMapSurface(page: Page): Promise<void> {
  const mapContent = page.getByTestId('gameplay-main-content');
  const mapControls = page.getByTestId('zoom-controls');
  const hotkeyHint = page.getByTestId('hotkey-hint-badge');
  const [mapBox, controlsBox, hintBox] = await Promise.all([
    mapContent.boundingBox(),
    mapControls.boundingBox(),
    hotkeyHint.boundingBox(),
  ]);
  if (!mapBox || !controlsBox || !hintBox) {
    throw new Error('Expected map, hint, and control layout boxes');
  }
  expect(controlsBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(
    mapBox.y + mapBox.height,
  );
  expect(hintBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(controlsBox.y);
  const unobscuredMapHeight = controlsBox.y - (hintBox.y + hintBox.height);
  expect(unobscuredMapHeight).toBeGreaterThanOrEqual(64);
  await expectCenterUnoccluded(hotkeyHint);
}

async function seedBattleMorale(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay;
    const session = gameplay?.getState().session;
    if (!gameplay || !session) throw new Error('Expected gameplay session');
    gameplay.setState({
      session: {
        ...session,
        currentState: {
          ...session.currentState,
          battleMorale: { player: 'STEADY', opponent: 'STEADY' },
        },
      },
    });
  });
}

async function expectMobileChromeContained(page: Page): Promise<void> {
  const map = page.getByTestId('hex-map-container');
  const controls = page.getByTestId('zoom-controls');
  const overlays = page.getByTestId('overlay-toggles');
  const morale = page.getByTestId('morale-indicator');
  const [mapBox, controlsBox, overlaysBox, moraleBox] = await Promise.all([
    map.boundingBox(),
    controls.boundingBox(),
    overlays.boundingBox(),
    morale.boundingBox(),
  ]);
  if (!mapBox || !controlsBox || !overlaysBox || !moraleBox) {
    throw new Error('Expected map-control and morale layout boxes');
  }
  for (const box of [controlsBox, overlaysBox]) {
    expect(box.x).toBeGreaterThanOrEqual(mapBox.x);
    expect(box.y).toBeGreaterThanOrEqual(mapBox.y);
    expect(box.x + box.width).toBeLessThanOrEqual(mapBox.x + mapBox.width);
    expect(box.y + box.height).toBeLessThanOrEqual(mapBox.y + mapBox.height);
  }
  expect(moraleBox.height).toBeLessThanOrEqual(48);
  expect(mapBox.height).toBeGreaterThanOrEqual(220);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectOverlayControlsReachable(page: Page): Promise<void> {
  for (const testId of [
    'projection-toggle',
    'overlay-toggle-movement',
    'overlay-toggle-elevation',
    'overlay-toggle-cover',
    'overlay-toggle-arcs',
    'overlay-toggle-los',
  ]) {
    const control = page.getByTestId(testId);
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeInViewport();
    await expectCenterUnoccluded(control);
  }
}

async function seedOverflowingForceLists(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay;
    const session = gameplay?.getState().session;
    if (!gameplay || !session) {
      throw new Error('Expected the demo gameplay session');
    }

    const playerUnit = session.units.find((unit) => unit.side === 'player');
    const opponentUnit = session.units.find((unit) => unit.side === 'opponent');
    if (!playerUnit || !opponentUnit) {
      throw new Error('Expected player and opponent unit templates');
    }
    const playerState = session.currentState.units[playerUnit.id];
    const opponentState = session.currentState.units[opponentUnit.id];
    if (!playerState || !opponentState) {
      throw new Error('Expected player and opponent state templates');
    }

    const extraUnits = Array.from({ length: 10 }, (_, index) => {
      const template = index % 2 === 0 ? playerUnit : opponentUnit;
      const sideLabel = template.side === 'player' ? 'Allied' : 'Opposing';
      return {
        ...structuredClone(template),
        id: `overflow-${template.side}-${index}`,
        name: `${sideLabel} Overflow ${index + 1}`,
      };
    });
    const extraStates = Object.fromEntries(
      extraUnits.map((unit) => {
        const template = unit.side === 'player' ? playerState : opponentState;
        return [unit.id, { ...structuredClone(template), id: unit.id }];
      }),
    );

    gameplay.setState({
      session: {
        ...session,
        units: [...session.units, ...extraUnits],
        currentState: {
          ...session.currentState,
          units: { ...session.currentState.units, ...extraStates },
        },
      },
    });
  });
}

async function expectIndependentForceListScrolling(page: Page): Promise<void> {
  const alliedList = page.getByTestId('rail-force-allied-list');
  const opposingList = page.getByTestId('rail-force-opposing-list');
  const alliedLabel = page.getByTestId('rail-force-allied-label');
  const opposingLabel = page.getByTestId('rail-force-opposing-label');
  const lists = [alliedList, opposingList] as const;

  for (const list of lists) {
    const dimensions = await list.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  }

  const labelBoxesBefore = await Promise.all([
    alliedLabel.boundingBox(),
    opposingLabel.boundingBox(),
  ]);
  await alliedList.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const alliedScrollLeft = await alliedList.evaluate(
    (element) => element.scrollLeft,
  );
  expect(alliedScrollLeft).toBeGreaterThan(0);
  expect(await opposingList.evaluate((element) => element.scrollLeft)).toBe(0);

  await opposingList.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  expect(
    await opposingList.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0);
  expect(await alliedList.evaluate((element) => element.scrollLeft)).toBe(
    alliedScrollLeft,
  );

  const labelBoxesAfter = await Promise.all([
    alliedLabel.boundingBox(),
    opposingLabel.boundingBox(),
  ]);
  expect(labelBoxesAfter).toEqual(labelBoxesBefore);
  await expectCenterUnoccluded(alliedLabel);
  await expectCenterUnoccluded(opposingLabel);
}

async function expectMobileCommandFraming(page: Page): Promise<void> {
  const actionDock = page.getByTestId('tactical-action-dock');
  await expect(actionDock).toBeInViewport();
  await expectReadableMapSurface(page);
  const phaseCommand = page.getByTestId('command-btn-heat-end.end-phase');
  const mobileNavigation = page.getByRole('navigation', {
    name: 'Mobile navigation',
  });
  await phaseCommand.scrollIntoViewIfNeeded();
  await expect(phaseCommand).toBeInViewport();
  await expectCenterUnoccluded(phaseCommand);
  const [commandBox, navigationBox, dockBox] = await Promise.all([
    phaseCommand.boundingBox(),
    mobileNavigation.boundingBox(),
    actionDock.boundingBox(),
  ]);
  if (!commandBox || !navigationBox || !dockBox) {
    throw new Error('Expected dock, command, and navigation layout boxes');
  }
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
  test('contains mobile chrome and preserves the battlefield at 320px', async ({
    page,
  }) => {
    await page.setViewportSize(ADVERSARIAL_MOBILE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitForGame(page);
    await seedBattleMorale(page);

    const projectionToggle = page.getByTestId('projection-toggle');
    await expectMobileChromeContained(page);
    await expectReadableMapSurface(page);
    await expectOverlayControlsReachable(page);
    await projectionToggle.scrollIntoViewIfNeeded();
    await expectCenterUnoccluded(projectionToggle);
    await expectCenterUnoccluded(page.getByTestId('reset-view-btn'));

    await projectionToggle.click();
    await expect(projectionToggle).toHaveAttribute('aria-pressed', 'true');
    await expectMobileChromeContained(page);
    await page.getByTestId('projection-rotate-left').scrollIntoViewIfNeeded();
    await expectCenterUnoccluded(page.getByTestId('projection-rotate-left'));
    await page.getByTestId('projection-rotate-right').scrollIntoViewIfNeeded();
    await expectCenterUnoccluded(page.getByTestId('projection-rotate-right'));
    await expectMobileCommandFraming(page);
  });

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
    await expect(page.getByText(/Swipe/)).toHaveCount(0);
    await expectMobileCommandFraming(page);

    await seedOverflowingForceLists(page);
    await expect(page.getByText(/Swipe/)).toHaveCount(2);
    await expectIndependentForceListScrolling(page);
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

    await expect(page.getByTestId('hex-map-container')).toBeVisible();
    await expectReadableMapSurface(page);

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
