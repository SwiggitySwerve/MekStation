/**
 * Tactical command journey E2E.
 *
 * Proves the playable tactical screen can drive a visible movement command from
 * setup through preview, commit, state update, and event-log evidence.
 *
 * @spec openspec/changes/add-playable-command-screens/tasks.md task 2.6
 * @tags @game @command-screen @movement
 */

import { test, expect, type Page } from '@playwright/test';

interface HexCoord {
  readonly q: number;
  readonly r: number;
}

interface MovementJourneySetup {
  readonly sessionId: string;
  readonly eventCount: number;
}

interface MovementDestination {
  readonly unitId: string;
  readonly destination: HexCoord;
  readonly center: {
    readonly x: number;
    readonly y: number;
  };
  readonly visibleInViewport: boolean;
  readonly eventCount: number;
}

interface MovementCommitProof {
  readonly position: HexCoord;
  readonly eventCount: number;
  readonly appendedEventTypes: readonly string[];
  readonly selectedUnitId: string | null;
}

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function startInteractiveQuickSkirmish(
  page: Page,
  unitNames: readonly RegExp[] = [/Atlas AS7-D/i, /Marauder MAD-3R/i],
): Promise<void> {
  await page.goto('/gameplay/quick', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/gameplay\/quick/);

  const startQuickGame = page.getByRole('button', {
    name: /start quick game/i,
  });
  if (await startQuickGame.isVisible().catch(() => false)) {
    await startQuickGame.click();
  }

  await expect(
    page.getByRole('heading', { name: /select your units/i }),
  ).toBeVisible();
  for (const name of unitNames) {
    await page.getByRole('button', { name }).click();
  }
  await page.getByTestId('next-step-btn').click();

  await expect(
    page.getByRole('heading', { name: /configure scenario/i }),
  ).toBeVisible();
  await page.getByTestId('generate-scenario-btn').click();
  await expect(page.getByTestId('interactive-skirmish-btn')).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId('interactive-skirmish-btn').click();

  await page.waitForURL(/\/gameplay\/games\/[^/?]+$/, { timeout: 30_000 });
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('tactical-action-dock')).toBeVisible();
}

interface PhysicalLayoutSession {
  readonly events: readonly { readonly type: string }[];
  readonly currentState: {
    readonly phase: string;
    readonly units: Readonly<
      Record<
        string,
        {
          readonly id: string;
          readonly side: string;
          readonly destroyed?: boolean;
        }
      >
    >;
  };
}

interface PhysicalLayoutStore {
  getState: () => {
    readonly session: PhysicalLayoutSession | null;
    readonly interactiveSession: {
      advancePhase: () => void;
      completePhysicalAttack: (unitId: string) => void;
      getSession: () => PhysicalLayoutSession;
    } | null;
    setSession: (session: PhysicalLayoutSession) => void;
    selectUnit: (unitId: string) => void;
  };
}

async function preparePhysicalLayout(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay as
      | PhysicalLayoutStore
      | undefined;
    const interactive = gameplay?.getState().interactiveSession;
    if (!gameplay || !interactive)
      throw new Error('Interactive fixture missing');
    for (let i = 0; i < 6; i += 1) {
      if (interactive.getSession().currentState.phase === 'physical_attack')
        break;
      interactive.advancePhase();
    }
    const session = interactive.getSession();
    if (session.currentState.phase !== 'physical_attack') {
      throw new Error('Physical fixture did not reach the required phase');
    }
    const player = Object.values(session.currentState.units).find(
      (unit) => unit.side === 'player' && !unit.destroyed,
    );
    if (!player) throw new Error('Physical fixture has no living player');
    for (const unit of Object.values(session.currentState.units)) {
      if (unit.side === 'opponent' && !unit.destroyed) {
        interactive.completePhysicalAttack(unit.id);
      }
    }
    gameplay.getState().setSession(interactive.getSession());
    gameplay.getState().selectUnit(player.id);
  });
}

async function readPhysicalLayoutProof(page: Page) {
  return page.evaluate(() => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay as
      | PhysicalLayoutStore
      | undefined;
    const session = gameplay?.getState().session;
    if (!session) throw new Error('Physical fixture session missing');
    return {
      phase: session.currentState.phase,
      eventCount: session.events.length,
      phaseChanges: session.events.filter(
        (event) => event.type === 'phase_changed',
      ).length,
    };
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1018, height: 876 },
]) {
  test(`physical planning preserves pointer access to phase controls at ${viewport.width}x${viewport.height} @game @combat @command-screen`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const nativeDialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });
    await startInteractiveQuickSkirmish(page, [/Atlas AS7-D/i]);
    await preparePhysicalLayout(page);
    const planning = page.getByTestId('combat-planning-panel-physical');
    await expect(planning).toBeVisible();
    expect(
      await planning.locator('[data-testid^="weapon-row-"]').count(),
    ).toBeGreaterThanOrEqual(6);
    const skip = page.getByTestId('physical-attack-skip-button');
    await skip.scrollIntoViewIfNeeded();
    await skip.click();
    const endPhase = page.getByTestId('command-btn-heat-end.end-phase');
    await expect(endPhase).toBeEnabled();
    const before = await readPhysicalLayoutProof(page);
    expect(before.phase).toBe('physical_attack');
    await endPhase.scrollIntoViewIfNeeded();
    const hitProof = await endPhase.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const hit = document.elementFromPoint(center.x, center.y);
      const ancestors = [];
      for (
        let parent = button.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const box = parent.getBoundingClientRect();
        const css = getComputedStyle(parent);
        ancestors.push({
          testId: parent.getAttribute('data-testid'),
          rect: { x: box.x, y: box.y, width: box.width, height: box.height },
          clientHeight: parent.clientHeight,
          scrollHeight: parent.scrollHeight,
          scrollTop: parent.scrollTop,
          overflowY: css.overflowY,
          minHeight: css.minHeight,
        });
      }
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        center,
        viewport: { width: innerWidth, height: innerHeight },
        centerInViewport:
          center.x >= 0 &&
          center.x < innerWidth &&
          center.y >= 0 &&
          center.y < innerHeight,
        receivesPointer:
          hit === button || (hit !== null && button.contains(hit)),
        hitTestId: hit?.getAttribute('data-testid'),
        hitTag: hit?.tagName,
        ancestors,
      };
    });
    await testInfo.attach('physical-dock-hit-test.json', {
      body: JSON.stringify({ viewport, before, hitProof }, null, 2),
      contentType: 'application/json',
    });
    expect(hitProof.viewport).toEqual(viewport);
    expect(hitProof.centerInViewport).toBe(true);
    expect(hitProof.receivesPointer, JSON.stringify(hitProof)).toBe(true);
    await endPhase.click();
    const dialog = page.getByRole('dialog', { name: 'End Phase?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Cancel$/ }).click();
    expect(await readPhysicalLayoutProof(page)).toEqual(before);
    await endPhase.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm End Phase' }).click();
    await expect
      .poll(async () => (await readPhysicalLayoutProof(page)).phase)
      .toBe('heat');
    const after = await readPhysicalLayoutProof(page);
    expect(after.phaseChanges).toBe(before.phaseChanges + 1);
    await expect(dialog).toBeHidden();
    expect(nativeDialogs).toEqual([]);
  });
}

async function normalizeToPlayerMovementPhase(
  page: Page,
): Promise<MovementJourneySetup> {
  return page.evaluate(() => {
    const stores = window.__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay as
      | {
          getState: () => {
            session?: {
              id: string;
              events: readonly unknown[];
              currentState: {
                phase: string;
                units: Record<
                  string,
                  {
                    id: string;
                    side: string;
                    destroyed?: boolean;
                    position: HexCoord;
                  }
                >;
              };
            } | null;
            interactiveSession?: {
              advancePhase: () => void;
              getSession: () => {
                id: string;
                events: readonly unknown[];
                currentState: {
                  phase: string;
                  units: Record<
                    string,
                    {
                      id: string;
                      side: string;
                      destroyed?: boolean;
                      position: HexCoord;
                    }
                  >;
                };
              };
            } | null;
            ui?: Record<string, unknown>;
          };
          setState: (state: Record<string, unknown>) => void;
        }
      | undefined;

    if (!gameplay) throw new Error('Gameplay store not exposed');
    const interactiveSession = gameplay.getState().interactiveSession;
    if (!interactiveSession) throw new Error('Interactive session missing');

    for (let i = 0; i < 8; i += 1) {
      if (interactiveSession.getSession().currentState.phase === 'movement') {
        break;
      }
      interactiveSession.advancePhase();
    }

    const session = interactiveSession.getSession();
    if (session.currentState.phase !== 'movement') {
      throw new Error(
        `Expected movement phase, found ${session.currentState.phase}`,
      );
    }

    const playerUnit = Object.values(session.currentState.units).find(
      (unit) => unit.side === 'player' && unit.destroyed !== true,
    );
    if (!playerUnit) throw new Error('No movable player unit found');

    const normalizedSession = {
      ...session,
      currentState: {
        ...session.currentState,
        firstMover: 'player',
        activationIndex: 0,
      },
    };
    (interactiveSession as { session?: typeof normalizedSession }).session =
      normalizedSession;

    const previousUi = gameplay.getState().ui ?? {};
    gameplay.setState({
      session: normalizedSession,
      interactivePhase: 'select_unit',
      plannedMovement: null,
      validMovementHexes: [],
      ui: {
        ...previousUi,
        selectedUnitId: null,
        targetUnitId: null,
        queuedWeaponIds: [],
      },
    });

    return {
      sessionId: normalizedSession.id,
      eventCount: normalizedSession.events.length,
    };
  });
}

async function selectActiveUnitAndDestination(
  page: Page,
): Promise<MovementDestination> {
  const activeRailUnit = page
    .locator('[data-testid^="rail-unit-"][aria-current="true"]')
    .first();
  await expect(activeRailUnit).toBeVisible({ timeout: 20_000 });
  await activeRailUnit.scrollIntoViewIfNeeded();

  const railTestId = await activeRailUnit.getAttribute('data-testid');
  const unitId = railTestId?.replace(/^rail-unit-/, '');
  if (!unitId) throw new Error('Active rail unit did not expose a unit id');

  await activeRailUnit.click({ force: true });
  let selected = await waitForSelectedUnitWithReachableHexes(
    page,
    unitId,
    3_000,
  );
  if (!selected) {
    const token = page.getByTestId(`unit-token-${unitId}`);
    if (await token.isVisible().catch(() => false)) {
      await token.click({ force: true });
      selected = await waitForSelectedUnitWithReachableHexes(
        page,
        unitId,
        3_000,
      );
    }
  }
  if (!selected) {
    await page.evaluate((selectedUnitId) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              selectUnitForMovement?: (unitId: string) => void;
            };
          }
        | undefined;
      gameplay?.getState().selectUnitForMovement?.(selectedUnitId);
    }, unitId);
  }

  await waitForSelectedUnitWithReachableHexes(page, unitId, 20_000, true);

  return page.evaluate((selectedUnitId) => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay as {
      getState: () => {
        session: {
          events: readonly unknown[];
          currentState: {
            units: Record<string, { position: HexCoord }>;
          };
        };
      };
    };
    const state = gameplay.getState();
    const origin = state.session.currentState.units[selectedUnitId]?.position;
    if (!origin) throw new Error('Selected unit disappeared from session');
    const parseHexTestId = (testId: string | undefined): HexCoord | null => {
      const match = /^hex-(-?\d+)-(-?\d+)$/.exec(testId ?? '');
      if (!match) return null;
      return { q: Number(match[1]), r: Number(match[2]) };
    };

    const destination = Array.from(
      document.querySelectorAll<SVGGElement>(
        '[data-testid^="hex-"][data-reachable="true"]',
      ),
    )
      .map((element) => {
        const testId = element.dataset.testid;
        const hex = parseHexTestId(testId);
        if (!testId || !hex) return null;

        const rect = element.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        const visibleInViewport =
          rect.width > 0 &&
          rect.height > 0 &&
          center.x >= 0 &&
          center.y >= 0 &&
          center.x <= window.innerWidth &&
          center.y <= window.innerHeight;

        return {
          hex,
          center,
          visibleInViewport,
          distance:
            Math.abs(hex.q - origin.q) +
            Math.abs(hex.r - origin.r) +
            Math.abs(hex.q + hex.r - origin.q - origin.r),
        };
      })
      .filter(
        (
          candidate,
        ): candidate is {
          readonly hex: HexCoord;
          readonly center: { readonly x: number; readonly y: number };
          readonly visibleInViewport: boolean;
          readonly distance: number;
        } =>
          candidate !== null &&
          (candidate.hex.q !== origin.q || candidate.hex.r !== origin.r),
      )
      .sort((a, b) => {
        if (a.visibleInViewport !== b.visibleInViewport) {
          return a.visibleInViewport ? -1 : 1;
        }
        return a.distance - b.distance;
      })[0];
    if (!destination)
      throw new Error('No non-origin movement destination found');
    return {
      unitId: selectedUnitId,
      destination: destination.hex,
      center: destination.center,
      visibleInViewport: destination.visibleInViewport,
      eventCount: state.session.events.length,
    };
  }, unitId);
}

async function waitForSelectedUnitWithReachableHexes(
  page: Page,
  unitId: string,
  timeout: number,
  throwOnTimeout = false,
): Promise<boolean> {
  const wait = page.waitForFunction(
    (selectedUnitId) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              ui: { selectedUnitId: string | null };
            };
          }
        | undefined;
      const state = gameplay?.getState();
      return (
        state?.ui.selectedUnitId === selectedUnitId &&
        document.querySelectorAll(
          '[data-testid^="hex-"][data-reachable="true"]',
        ).length > 0
      );
    },
    unitId,
    { timeout },
  );
  if (throwOnTimeout) {
    await wait;
    return true;
  }
  return wait.then(
    () => true,
    () => false,
  );
}

/**
 * Wait for the Movement Intent Composer to hold a composed Locomotion Path whose
 * final leg lands on `destination`. Under the intent-first flow (change
 * `tactical-movement-intent-composer`) a reachable-hex click no longer stages a
 * legacy `plannedMovement` — it appends a Waypoint to `movementIntent.items`, so
 * the composed intent is the source-of-truth this step polls. The routed leg's
 * `to.hex` is the placed waypoint; a single click to the destination is the
 * degenerate one-leg case.
 */
async function waitForComposedWaypoint(
  page: Page,
  args: {
    readonly destination: HexCoord;
  },
  timeout = 10_000,
  throwOnTimeout = true,
): Promise<boolean> {
  const wait = page.waitForFunction(
    ({ destination }) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              movementIntent?: {
                items?: readonly {
                  kind: string;
                  legs?: readonly {
                    to?: { hex?: HexCoord };
                  }[];
                }[];
              };
            };
          }
        | undefined;
      const items = gameplay?.getState().movementIntent?.items ?? [];
      const locomotion = items.find((item) => item.kind === 'locomotion');
      const legs = locomotion?.legs ?? [];
      return legs.some(
        (leg) =>
          leg.to?.hex?.q === destination.q && leg.to?.hex?.r === destination.r,
      );
    },
    args,
    { timeout },
  );
  if (throwOnTimeout) {
    await wait;
    return true;
  }
  return wait.then(
    () => true,
    () => false,
  );
}

async function waitForMovementCommit(
  page: Page,
  args: {
    readonly unitId: string;
    readonly destination: HexCoord;
    readonly eventCountBeforeCommit: number;
  },
): Promise<MovementCommitProof> {
  const handle = await page.waitForFunction(
    ({ unitId, destination, eventCountBeforeCommit }) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              session: {
                events: readonly { type: string }[];
                currentState: {
                  units: Record<string, { position: HexCoord }>;
                };
              };
              ui: { selectedUnitId: string | null };
            };
          }
        | undefined;
      const state = gameplay?.getState();
      const unit = state?.session.currentState.units[unitId];
      if (!state || !unit) return false;

      const appendedEventTypes = state.session.events
        .slice(eventCountBeforeCommit)
        .map((event) => event.type);
      const moved =
        unit.position.q === destination.q && unit.position.r === destination.r;
      const logged =
        appendedEventTypes.includes('movement_declared') &&
        appendedEventTypes.includes('movement_locked');
      if (!moved || !logged) return false;

      return {
        position: unit.position,
        eventCount: state.session.events.length,
        appendedEventTypes,
        selectedUnitId: state.ui.selectedUnitId,
      };
    },
    args,
    { timeout: 20_000 },
  );
  return (await handle.jsonValue()) as MovementCommitProof;
}

test.describe('tactical command journey @game @command-screen', () => {
  test('previews and commits a player movement command with state and log proof', async ({
    page,
  }) => {
    await startInteractiveQuickSkirmish(page);
    const setup = await normalizeToPlayerMovementPhase(page);

    await expect(page.getByTestId('phase-name')).toContainText(/Movement/i);
    const move = await selectActiveUnitAndDestination(page);
    const destinationId = `hex-${move.destination.q}-${move.destination.r}`;
    const destinationHex = page.getByTestId(destinationId);

    await expect(destinationHex).toHaveAttribute('data-reachable', 'true');

    // Single Movement Authority: the Movement Intent Composer is the sole
    // movement surface, and the legacy planning panel is gated off while it
    // owns the unit. Prove both before driving the composed move.
    await expect(page.getByTestId('movement-intent-composer')).toBeVisible();
    await expect(
      page.getByTestId('combat-planning-panel-movement'),
    ).toBeHidden();

    // A reachable-hex click now APPENDS a Waypoint to the composed intent (no
    // legacy plannedMovement is staged). Hover first so the map preview renders,
    // then click the destination to compose the single-leg path.
    //
    // Note: under the intent-first flow the hover preview anchors on the CHEAPEST
    // affordable mode, so its `unreachable` hint can read true for a hex that is
    // still placeable under a pricier affordable mode (the envelope merges every
    // affordable mode). Reachability is proven by `data-reachable="true"` above
    // and by the waypoint actually composing below — not by the soft hover hint,
    // so this step drives the hover for coverage without asserting its verdict.
    let composedByMapClick = false;
    if (move.visibleInViewport) {
      await page.mouse.move(move.center.x, move.center.y);
      await page
        .getByTestId('command-preview-movement')
        .isVisible({ timeout: 2_500 })
        .catch(() => false);

      await destinationHex.click({ force: true });
      composedByMapClick = await waitForComposedWaypoint(
        page,
        { destination: move.destination },
        2_500,
        false,
      );
    }
    if (!composedByMapClick) {
      // Off-viewport fallback: bring the hex into view and retry the click
      // rather than store-seeding — the composer routes the leg (and its MP) via
      // movement-system, so the test never hand-computes a cost.
      await destinationHex.scrollIntoViewIfNeeded();
      await destinationHex.click({ force: true });
    }
    await waitForComposedWaypoint(page, { destination: move.destination });

    // The composed leg surfaces as the first Cost Ledger row (rules-derived MP).
    await expect(
      page.getByTestId('movement-cost-ledger').getByTestId('ledger-row-0'),
    ).toBeVisible();

    // Pick an affordable Movement Budget last (Walk when it affords the leg,
    // else the first affordable mode). The resolver never auto-picks, so
    // Lock-In stays disabled until a budget is chosen — then commit atomically.
    const walkOption = page.getByTestId('budget-option-walk');
    const budgetOption = (await walkOption.count())
      ? walkOption
      : page.locator('[data-testid^="budget-option-"]').first();
    await expect(budgetOption).toBeVisible();
    await budgetOption.click();

    const lockInButton = page.getByTestId('movement-lock-in-btn');
    await expect(lockInButton).toBeEnabled();
    await lockInButton.click();

    const proof = await waitForMovementCommit(page, {
      unitId: move.unitId,
      destination: move.destination,
      eventCountBeforeCommit: move.eventCount,
    });

    expect(proof.position).toEqual(move.destination);
    expect(proof.selectedUnitId).toBeNull();
    expect(proof.eventCount).toBeGreaterThan(setup.eventCount);
    expect(proof.appendedEventTypes).toEqual(
      expect.arrayContaining(['movement_declared', 'movement_locked']),
    );
    await expect(page.getByTestId('event-log-count')).toContainText(
      `Event Log (${proof.eventCount})`,
    );
  });
});
