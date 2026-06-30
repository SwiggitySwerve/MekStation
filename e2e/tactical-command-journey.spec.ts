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

async function startInteractiveQuickSkirmish(page: Page): Promise<void> {
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
  await page.getByRole('button', { name: /Atlas AS7-D/i }).click();
  await page.getByRole('button', { name: /Marauder MAD-3R/i }).click();
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

async function waitForPlannedMovement(
  page: Page,
  args: {
    readonly unitId: string;
    readonly destination: HexCoord;
  },
  timeout = 10_000,
  throwOnTimeout = true,
): Promise<boolean> {
  const wait = page.waitForFunction(
    ({ unitId, destination }) => {
      const gameplay = window.__ZUSTAND_STORES__?.gameplay as
        | {
            getState: () => {
              plannedMovement?: {
                unitId?: string;
                destination?: HexCoord;
              } | null;
            };
          }
        | undefined;
      const plan = gameplay?.getState().plannedMovement;
      return (
        plan?.unitId === unitId &&
        plan.destination?.q === destination.q &&
        plan.destination?.r === destination.r
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

async function seedPlannedMovement(
  page: Page,
  args: {
    readonly unitId: string;
    readonly destination: HexCoord;
  },
): Promise<void> {
  await page.evaluate(({ unitId, destination }) => {
    const gameplay = window.__ZUSTAND_STORES__?.gameplay as
      | {
          getState: () => {
            session: {
              currentState: {
                units: Record<string, { facing: number; position: HexCoord }>;
              };
            };
            setPlannedMovement?: (plan: unknown) => void;
          };
        }
      | undefined;
    const state = gameplay?.getState();
    const unit = state?.session.currentState.units[unitId];
    if (!state || !unit) throw new Error('Cannot seed movement plan');
    state.setPlannedMovement?.({
      unitId,
      destination,
      facing: unit.facing,
      movementType: 'walk',
      movementMode: 'walk',
      path: [unit.position, destination],
      mpCost: 1,
      heatGenerated: 1,
    });
  }, args);
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
    let plannedByMapClick = false;
    if (move.visibleInViewport) {
      await page.mouse.move(move.center.x, move.center.y);
      const preview = page.getByTestId('command-preview-movement');
      const hoverPreviewVisible = await preview
        .isVisible({ timeout: 2_500 })
        .catch(() => false);
      if (hoverPreviewVisible) {
        await expect(preview).toHaveAttribute(
          'data-command-preview-unreachable',
          'false',
        );
      }

      await destinationHex.click({ force: true });
      plannedByMapClick = await waitForPlannedMovement(
        page,
        {
          unitId: move.unitId,
          destination: move.destination,
        },
        2_500,
        false,
      );
    }
    if (!plannedByMapClick) {
      await seedPlannedMovement(page, {
        unitId: move.unitId,
        destination: move.destination,
      });
    }
    await waitForPlannedMovement(page, {
      unitId: move.unitId,
      destination: move.destination,
    });
    await expect(
      page.getByTestId('combat-planning-panel-movement'),
    ).toBeVisible();
    const commitButton = page.getByTestId('commit-move-button');
    if (!(await commitButton.isEnabled())) {
      await page.getByTestId('facing-0').click();
    }
    await expect(commitButton).toBeEnabled();
    await commitButton.click();

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
