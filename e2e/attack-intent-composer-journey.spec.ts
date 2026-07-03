/**
 * Attack Intent Composer journey E2E (change `attack-phase-intent-composer`,
 * phase 6.3).
 *
 * Proves the full weapon-attack loop through the composer on a real
 * interactive quick skirmish: enemy click focuses the working target →
 * weapon toggle assigns → Volley Resolver shows the primary group → Fire
 * commits atomically (attack_declared + attack_locked appended, composition
 * reset). Also pins Single Attack Authority in the live DOM: the composer
 * band is visible, the legacy fire/clear dock verbs are gone, and the
 * legacy weapon planning panel is not mounted.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 * @tags @game @command-screen @combat
 */

import { test, expect, type Page } from '@playwright/test';

interface HexCoord {
  readonly q: number;
  readonly r: number;
}

interface AttackJourneySetup {
  readonly sessionId: string;
  readonly eventCount: number;
  readonly attackerId: string;
  readonly enemyId: string;
}

interface VolleyCommitProof {
  readonly appendedEventTypes: readonly string[];
  readonly declaredTargetId: string | null;
  readonly assignmentsAfter: number;
  readonly selectedUnitId: string | null;
}

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/** Mirrors tactical-command-journey: drive the quick-skirmish launch UI. */
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

/**
 * Advance the interactive session into the weapon-attack phase with the
 * player as first mover, and normalize geometry so the enemy sits two hexes
 * inside the player's front arc (the composer's legality gating is the
 * production path under test — the geometry just guarantees at least one
 * legal assignment exists).
 */
async function normalizeToPlayerWeaponAttackPhase(
  page: Page,
): Promise<AttackJourneySetup> {
  return page.evaluate(() => {
    const stores = window.__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay as
      | {
          getState: () => {
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
                      facing: number;
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
      if (
        interactiveSession.getSession().currentState.phase === 'weapon_attack'
      ) {
        break;
      }
      interactiveSession.advancePhase();
    }
    const session = interactiveSession.getSession();
    if (session.currentState.phase !== 'weapon_attack') {
      throw new Error(
        `Expected weapon_attack phase, found ${session.currentState.phase}`,
      );
    }

    const units = Object.values(session.currentState.units);
    const attacker = units.find(
      (unit) => unit.side === 'player' && unit.destroyed !== true,
    );
    const enemy = units.find(
      (unit) => unit.side === 'opponent' && unit.destroyed !== true,
    );
    if (!attacker || !enemy) throw new Error('Missing attacker or enemy');

    // Front-arc geometry: attacker at origin facing North, enemy two hexes
    // straight ahead. Fixture-only direct mutation (same pattern as the
    // movement journey's normalization) — production state mutates via events.
    attacker.position = { q: 0, r: 0 };
    attacker.facing = 0;
    enemy.position = { q: 0, r: -2 };

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
      validTargetIds: [],
      hitChance: null,
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
      attackerId: attacker.id,
      enemyId: enemy.id,
    };
  });
}

test.describe('attack intent composer journey @game @command-screen @combat', () => {
  test('composes and fires a volley through the composer with event-log proof', async ({
    page,
  }) => {
    await startInteractiveQuickSkirmish(page);
    const setup = await normalizeToPlayerWeaponAttackPhase(page);

    // Select the attacker (token click path — same as a player would).
    const attackerToken = page.getByTestId(`unit-token-${setup.attackerId}`);
    if (await attackerToken.isVisible().catch(() => false)) {
      await attackerToken.click({ force: true });
    } else {
      await page.evaluate((unitId) => {
        const gameplay = window.__ZUSTAND_STORES__?.gameplay as
          | {
              getState: () => {
                handleInteractiveTokenClick?: (unitId: string) => void;
              };
            }
          | undefined;
        gameplay?.getState().handleInteractiveTokenClick?.(unitId);
      }, setup.attackerId);
    }
    await page.waitForFunction(
      (unitId) => {
        const gameplay = window.__ZUSTAND_STORES__?.gameplay as
          | { getState: () => { ui: { selectedUnitId: string | null } } }
          | undefined;
        return gameplay?.getState().ui.selectedUnitId === unitId;
      },
      setup.attackerId,
      { timeout: 10_000 },
    );

    // Single Attack Authority in the live DOM: composer band present, the
    // legacy fire/clear dock verbs gone, legacy weapon planning panel gone.
    await expect(page.getByTestId('attack-intent-composer')).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByTestId('command-btn-weapon.fire-volley'),
    ).toHaveCount(0);
    await expect(
      page.getByTestId('command-btn-weapon.clear-attacks'),
    ).toHaveCount(0);
    await expect(page.getByTestId('weapon-selector')).toHaveCount(0);

    // Enemy click focuses the working target — no declaration (D6).
    await page.getByTestId(`unit-token-${setup.enemyId}`).click({
      force: true,
    });
    await page.waitForFunction(
      (enemyId) => {
        const gameplay = window.__ZUSTAND_STORES__?.gameplay as
          | {
              getState: () => {
                attackIntent: { focusedTargetId: string | null };
              };
            }
          | undefined;
        return gameplay?.getState().attackIntent.focusedTargetId === enemyId;
      },
      setup.enemyId,
      { timeout: 10_000 },
    );

    // Toggle the first LEGAL weapon in the palette (block-at-source leaves
    // illegal rows disabled with reasons — we only require one legal row).
    const enabledToggle = page
      .locator('[data-testid^="weapon-toggle-"]:not([disabled])')
      .first();
    await expect(enabledToggle).toBeVisible({ timeout: 10_000 });
    await enabledToggle.click();

    // The volley resolver shows the enemy as the PRIMARY group and Fire arms.
    await expect(
      page.getByTestId(`volley-group-${setup.enemyId}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`volley-group-${setup.enemyId}`),
    ).toHaveAttribute('data-volley-primary', 'true');
    const fireButton = page.getByTestId('volley-fire-button');
    await expect(fireButton).toBeEnabled();

    // Fire commits the whole volley atomically.
    await fireButton.click();
    const proof: VolleyCommitProof = await page
      .waitForFunction(
        ({ eventCountBefore }) => {
          const gameplay = window.__ZUSTAND_STORES__?.gameplay as
            | {
                getState: () => {
                  session: {
                    events: readonly {
                      type: string;
                      payload?: { targetId?: string };
                    }[];
                  } | null;
                  attackIntent: { assignments: readonly unknown[] };
                  ui: { selectedUnitId: string | null };
                };
              }
            | undefined;
          const state = gameplay?.getState();
          if (!state?.session) return false;
          const appended = state.session.events.slice(eventCountBefore);
          const appendedEventTypes = appended.map((event) => event.type);
          if (
            !appendedEventTypes.includes('attack_declared') ||
            !appendedEventTypes.includes('attack_locked')
          ) {
            return false;
          }
          const declared = appended.find(
            (event) => event.type === 'attack_declared',
          );
          return {
            appendedEventTypes,
            declaredTargetId: declared?.payload?.targetId ?? null,
            assignmentsAfter: state.attackIntent.assignments.length,
            selectedUnitId: state.ui.selectedUnitId,
          };
        },
        { eventCountBefore: setup.eventCount },
        { timeout: 20_000 },
      )
      .then((handle) => handle.jsonValue() as Promise<VolleyCommitProof>);

    expect(proof.appendedEventTypes).toEqual(
      expect.arrayContaining(['attack_declared', 'attack_locked']),
    );
    expect(proof.declaredTargetId).toBe(setup.enemyId);
    // Composition resets after the atomic commit (zero-commit guarantee held
    // until Fire; nothing lingers after it).
    expect(proof.assignmentsAfter).toBe(0);
    expect(proof.selectedUnitId).toBeNull();
  });
});
