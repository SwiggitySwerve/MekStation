/**
 * Strict encounter -> combat -> campaign continuity proof.
 *
 * This supplements the broader encounter smoke tests with a non-optional path:
 * seeded campaign missions launch through the real pre-battle UI, queue
 * campaign outcomes from both auto-resolve and interactive play, and apply
 * those outcomes from the post-battle review screen.
 *
 * @tags @campaign @encounter @combat @smoke
 */

import { expect, test, type Page } from '@playwright/test';

import { createMinimalCampaign } from './fixtures/campaign';
import { createEncounterWithForces } from './fixtures/encounter';
import { assignPilotAndUnit, createTestLance } from './fixtures/force';
import { createRegularPilot } from './fixtures/pilot';

const PLAYER_UNIT_ID = 'atlas-as7-d';
const OPPONENT_UNIT_ID = 'marauder-mad-3r';

interface AssignmentSlot {
  readonly id: string;
}

interface ContinuityProof {
  readonly sessionId: string | null;
  readonly config: {
    readonly campaignId?: string | null;
    readonly contractId?: string | null;
    readonly scenarioId?: string | null;
    readonly encounterId?: string | null;
  } | null;
  readonly pendingBattleOutcomes: readonly {
    readonly matchId: string;
    readonly contractId: string;
    readonly scenarioId: string;
  }[];
  readonly processedBattleIds: readonly string[];
}

interface CampaignEncounterContext {
  readonly campaignId: string;
  readonly missionId: string;
  readonly encounterId: string;
  readonly encounterName: string;
}

interface AttackResolutionProof {
  readonly sessionId: string;
  readonly phaseBefore: string;
  readonly phaseAfter: string;
  readonly status: string;
  readonly winner: string | null;
  readonly reason: string | null;
  readonly weaponIds: readonly string[];
  readonly attackCycles: number;
  readonly eventTypes: readonly string[];
  readonly destroyedOpponent: boolean;
  readonly opponentUnits: readonly {
    readonly id: string;
    readonly destroyed: boolean;
    readonly hasRetreated: boolean;
    readonly hasEjected: boolean;
    readonly side: string | null;
  }[];
}

test.setTimeout(90_000);

async function waitForE2EStores(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __E2E_MODE__?: boolean;
        __ZUSTAND_STORES__?: Record<string, unknown>;
      };
      const stores = win.__ZUSTAND_STORES__;
      return Boolean(
        win.__E2E_MODE__ &&
        stores?.campaign &&
        stores.force &&
        stores.pilot &&
        stores.encounter &&
        stores.gameplay,
      );
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function firstAssignmentId(page: Page, forceId: string): Promise<string> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          force?: {
            getState: () => {
              forces: Array<{
                id: string;
                assignments: readonly AssignmentSlot[];
              }>;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;

    const force = stores?.force
      ?.getState()
      .forces.find((candidate) => candidate.id === id);
    const assignmentId = force?.assignments[0]?.id;
    if (!assignmentId) {
      throw new Error(`Force ${id} has no assignment slot`);
    }
    return assignmentId;
  }, forceId);
}

async function createAssignedLance({
  page,
  forceName,
  pilotName,
  unitId,
}: {
  readonly page: Page;
  readonly forceName: string;
  readonly pilotName: string;
  readonly unitId: string;
}): Promise<string> {
  const forceId = await createTestLance(page, forceName, 'Mercenary');
  expect(forceId).toBeTruthy();

  const pilotId = await createRegularPilot(page, pilotName);
  expect(pilotId).toBeTruthy();

  const assignmentId = await firstAssignmentId(page, forceId!);
  await expect(
    assignPilotAndUnit(page, assignmentId, pilotId!, unitId),
  ).resolves.toBe(true);

  return forceId!;
}

async function createCampaignEncounter(
  page: Page,
  label: string,
): Promise<CampaignEncounterContext> {
  const campaignId = await createMinimalCampaign(page);
  const missionId = `mission-${Date.now()}-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
  const playerForceId = await createAssignedLance({
    page,
    forceName: `${label} Player Lance`,
    pilotName: `${label} Player Pilot`,
    unitId: PLAYER_UNIT_ID,
  });
  const opponentForceId = await createAssignedLance({
    page,
    forceName: `${label} Opponent Lance`,
    pilotName: `${label} Opponent Pilot`,
    unitId: OPPONENT_UNIT_ID,
  });
  const encounterName = `${label} Encounter`;
  const encounterId = await createEncounterWithForces(
    page,
    encounterName,
    playerForceId,
    opponentForceId,
  );
  if (!encounterId) {
    throw new Error(`Failed to create ${label} encounter`);
  }

  return { campaignId, missionId, encounterId, encounterName };
}

async function getContinuityProof(page: Page): Promise<ContinuityProof> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              pendingBattleOutcomes: Array<{
                matchId: string;
                contractId: string;
                scenarioId: string;
              }>;
              processedBattleIds: string[];
            };
          };
          gameplay?: {
            getState: () => {
              session: {
                id: string;
                config: ContinuityProof['config'];
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const session = stores?.gameplay?.getState().session ?? null;
    const campaign = stores?.campaign?.getState();
    return {
      sessionId: session?.id ?? null,
      config: session?.config ?? null,
      pendingBattleOutcomes:
        campaign?.pendingBattleOutcomes.map((outcome) => ({
          matchId: outcome.matchId,
          contractId: outcome.contractId,
          scenarioId: outcome.scenarioId,
        })) ?? [],
      processedBattleIds: campaign?.processedBattleIds ?? [],
    };
  });
}

async function resolveInteractiveBattleByWeaponAttack(
  page: Page,
): Promise<AttackResolutionProof> {
  return page.evaluate(
    ({ attackerId, targetId }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            gameplay?: {
              getState: () => {
                interactiveSession: {
                  getSession: () => {
                    id: string;
                    currentState: {
                      phase: string;
                      status: string;
                      result?: { winner?: string; reason?: string };
                      units: Record<
                        string,
                        {
                          position: { q: number; r: number };
                          facing: number;
                          side?: string;
                          destroyed: boolean;
                          destroyedLocations?: string[];
                          hasRetreated?: boolean;
                          hasEjected?: boolean;
                          pilotConscious?: boolean;
                        }
                      >;
                    };
                    events: Array<{
                      type: string;
                      payload?: Record<string, unknown>;
                    }>;
                  };
                  getAvailableActions?: (unitId: string) => {
                    validTargets: Array<{
                      unitId: string;
                      weapons: string[];
                    }>;
                  };
                  applyAttack: (
                    attackerId: string,
                    targetId: string,
                    weaponIds: readonly string[],
                  ) => void;
                  advancePhase: () => void;
                } & Record<string, unknown>;
                advanceInteractivePhase: () => void;
                checkGameOver?: () => boolean;
              };
              setState?: (state: Record<string, unknown>) => void;
            };
          };
        }
      ).__ZUSTAND_STORES__;
      const gameplay = stores?.gameplay;
      if (!gameplay) throw new Error('Gameplay store not exposed');

      const getInteractiveSession = () => {
        const interactiveSession = gameplay.getState().interactiveSession;
        if (!interactiveSession) {
          throw new Error('Interactive session not available');
        }
        return interactiveSession;
      };
      const syncStoreSession = () => {
        gameplay.setState?.({ session: getInteractiveSession().getSession() });
      };
      const advanceSessionPhase = () => {
        getInteractiveSession().advancePhase();
        syncStoreSession();
        gameplay.getState().checkGameOver?.();
      };

      for (let i = 0; i < 6; i += 1) {
        if (
          getInteractiveSession().getSession().currentState.phase ===
          'weapon_attack'
        ) {
          break;
        }
        advanceSessionPhase();
      }

      const interactiveSession = getInteractiveSession();
      let session = interactiveSession.getSession();
      if (session.currentState.phase !== 'weapon_attack') {
        throw new Error(
          `Expected weapon_attack phase, found ${session.currentState.phase}`,
        );
      }

      const attacker = session.currentState.units[attackerId];
      const target = session.currentState.units[targetId];
      if (!attacker || !target) {
        throw new Error('Expected attacker and target units to be present');
      }

      const candidateTargetHexes = [
        { q: 0, r: -2 },
        { q: 2, r: -2 },
        { q: 2, r: 0 },
        { q: 0, r: 2 },
        { q: -2, r: 2 },
        { q: -2, r: 0 },
      ];

      const runtimeContext = Reflect.get(
        interactiveSession,
        'runtimeContext',
      ) as
        | {
            d6Roller?: () => number;
            weaponsByUnit?: Map<
              string,
              readonly { id: string; destroyed?: boolean }[]
            >;
          }
        | undefined;
      if (!runtimeContext) {
        throw new Error('Interactive session runtime context not available');
      }
      const deterministicRolls = [6, 6];
      let rollIndex = 0;
      runtimeContext.d6Roller = () =>
        deterministicRolls[rollIndex++ % deterministicRolls.length] ?? 6;

      const chooseWeaponIds = (weaponIds: readonly string[]): string[] => {
        const directWeapons = weaponIds.filter((id) => {
          const normalized = id.toLowerCase();
          return (
            !normalized.includes('lrm') &&
            !normalized.includes('srm') &&
            !normalized.includes('missile') &&
            !normalized.includes('ams')
          );
        });
        return directWeapons.length > 0 ? directWeapons : [...weaponIds];
      };

      const placeUnitsAndPickWeapons = (): string[] => {
        const current = getInteractiveSession().getSession();
        const currentAttacker = current.currentState.units[attackerId];
        const currentTarget = current.currentState.units[targetId];
        if (!currentAttacker || !currentTarget) {
          throw new Error('Expected attacker and target units during attack');
        }

        for (let facing = 0; facing < 6; facing += 1) {
          currentAttacker.position = { q: 0, r: 0 };
          currentAttacker.facing = facing;
          for (const position of candidateTargetHexes) {
            currentTarget.position = position;
            syncStoreSession();
            const weaponIds = chooseWeaponIds(
              runtimeContext.weaponsByUnit
                ?.get(attackerId)
                ?.filter((weapon) => !weapon.destroyed)
                .map((weapon) => weapon.id) ?? [],
            );
            if (weaponIds.length > 0) {
              return weaponIds;
            }
          }
        }

        const actions =
          getInteractiveSession().getAvailableActions?.(attackerId);
        throw new Error(
          `No usable weapon attack was available: ${JSON.stringify({
            phase: current.currentState.phase,
            status: current.currentState.status,
            attacker: {
              side: currentAttacker.side ?? null,
              destroyed: currentAttacker.destroyed,
              hasRetreated: currentAttacker.hasRetreated ?? false,
              hasEjected: currentAttacker.hasEjected ?? false,
              pilotConscious: currentAttacker.pilotConscious ?? null,
            },
            target: {
              side: currentTarget.side ?? null,
              destroyed: currentTarget.destroyed,
              hasRetreated: currentTarget.hasRetreated ?? false,
              hasEjected: currentTarget.hasEjected ?? false,
              pilotConscious: currentTarget.pilotConscious ?? null,
            },
            validTargets: actions?.validTargets ?? [],
            weaponMapIds:
              runtimeContext.weaponsByUnit
                ?.get(attackerId)
                ?.map((weapon) => weapon.id) ?? [],
          })}`,
        );
      };

      const advanceToWeaponPhase = () => {
        for (let i = 0; i < 12; i += 1) {
          const current = getInteractiveSession().getSession().currentState;
          if (
            current.status === 'completed' ||
            current.phase === 'weapon_attack'
          ) {
            return;
          }
          advanceSessionPhase();
        }
        const currentPhase =
          getInteractiveSession().getSession().currentState.phase;
        throw new Error(
          `Unable to reach weapon_attack phase from ${currentPhase}`,
        );
      };

      const beforeEventCount = session.events.length;
      const phaseBefore = session.currentState.phase;
      const usedWeaponIds = new Set<string>();
      let attackCycles = 0;
      for (let cycle = 0; cycle < 8; cycle += 1) {
        session = getInteractiveSession().getSession();
        if (session.currentState.status === 'completed') break;
        advanceToWeaponPhase();
        session = getInteractiveSession().getSession();
        if (session.currentState.status === 'completed') break;

        const weaponIds = placeUnitsAndPickWeapons();
        for (const id of weaponIds) usedWeaponIds.add(id);
        rollIndex = 0;
        getInteractiveSession().applyAttack(attackerId, targetId, weaponIds);
        syncStoreSession();
        attackCycles += 1;
        advanceSessionPhase();
      }

      session = getInteractiveSession().getSession();
      const newEvents = session.events.slice(beforeEventCount);
      const result = session.currentState.result;
      return {
        sessionId: session.id,
        phaseBefore,
        phaseAfter: session.currentState.phase,
        status: session.currentState.status,
        winner: result?.winner ?? null,
        reason: result?.reason ?? null,
        weaponIds: Array.from(usedWeaponIds),
        attackCycles,
        eventTypes: newEvents.map((event) => event.type),
        destroyedOpponent: Boolean(
          session.currentState.units[targetId]?.destroyed,
        ),
        opponentUnits: Object.entries(session.currentState.units)
          .filter(([, unit]) => unit.side === 'opponent')
          .map(([id, unit]) => ({
            id,
            destroyed: Boolean(unit.destroyed),
            hasRetreated: Boolean(unit.hasRetreated),
            hasEjected: Boolean(unit.hasEjected),
            side: unit.side ?? null,
          })),
      };
    },
    { attackerId: PLAYER_UNIT_ID, targetId: OPPONENT_UNIT_ID },
  );
}

test.describe('encounter-combat campaign continuity', () => {
  test(
    'auto-resolved pre-battle launch queues and applies a campaign outcome',
    { tag: ['@campaign', '@encounter', '@combat', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay');
      await waitForE2EStores(page);

      const { campaignId, missionId, encounterId, encounterName } =
        await createCampaignEncounter(page, 'Continuity Auto');

      await page.goto(
        `/gameplay/encounters/${encounterId}?campaignId=${campaignId}&missionId=${missionId}`,
      );
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled({
        timeout: 20_000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(
        (url) =>
          url.pathname === `/gameplay/encounters/${encounterId}/pre-battle` &&
          url.searchParams.get('campaignId') === campaignId &&
          url.searchParams.get('missionId') === missionId,
        { timeout: 20_000 },
      );
      await expect(
        page.getByRole('heading', {
          name: `Pre-Battle: ${encounterName}`,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('mode-selection')).toBeVisible();
      await expect(page.getByTestId('auto-resolve-btn')).toBeEnabled();

      await page.getByTestId('auto-resolve-btn').click();

      await page.waitForURL(
        new RegExp(
          `/gameplay/games/[^?]+\\?campaignId=${campaignId}&missionId=${missionId}`,
        ),
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('game-completed')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('return-to-campaign-btn')).toBeVisible();

      const queued = await getContinuityProof(page);
      expect(queued.sessionId).toBeTruthy();
      expect(queued.config).toMatchObject({
        campaignId,
        contractId: missionId,
        scenarioId: encounterId,
        encounterId,
      });
      expect(queued.pendingBattleOutcomes).toContainEqual({
        matchId: queued.sessionId!,
        contractId: missionId,
        scenarioId: encounterId,
      });

      await page.goto(`/gameplay/games/${queued.sessionId}/review`);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByTestId('apply-outcome-cta').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/campaigns/${campaignId}\\?pendingBattle=${queued.sessionId}`,
        ),
        { timeout: 20_000 },
      );

      const applied = await getContinuityProof(page);
      expect(applied.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: queued.sessionId }),
      );
      expect(applied.processedBattleIds).toContain(queued.sessionId);
    },
  );

  test(
    'interactive pre-battle launch queues, reloads, and applies a campaign outcome',
    { tag: ['@campaign', '@encounter', '@combat', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay');
      await waitForE2EStores(page);

      const { campaignId, missionId, encounterId, encounterName } =
        await createCampaignEncounter(page, 'Continuity Interactive');

      await page.goto(
        `/gameplay/encounters/${encounterId}?campaignId=${campaignId}&missionId=${missionId}`,
      );
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(
        (url) =>
          url.pathname === `/gameplay/encounters/${encounterId}/pre-battle` &&
          url.searchParams.get('campaignId') === campaignId &&
          url.searchParams.get('missionId') === missionId,
        { timeout: 20_000 },
      );
      await expect(
        page.getByRole('heading', {
          name: `Pre-Battle: ${encounterName}`,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('play-manually-btn')).toBeEnabled();

      await page.getByTestId('play-manually-btn').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/games/[^?]+\\?campaignId=${campaignId}&missionId=${missionId}`,
        ),
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('tactical-action-dock')).toBeVisible({
        timeout: 20_000,
      });

      const launched = await getContinuityProof(page);
      expect(launched.sessionId).toBeTruthy();
      expect(launched.config).toMatchObject({
        campaignId,
        contractId: missionId,
        scenarioId: encounterId,
        encounterId,
      });
      expect(launched.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: launched.sessionId }),
      );

      await expect(page.getByTestId('concede-button')).toBeEnabled();
      await page.getByTestId('concede-button').click();
      await expect(page.getByTestId('concede-confirm-text')).toContainText(
        'Concede match?',
      );
      await page.getByTestId('concede-confirm').click();
      await page.waitForURL(
        new RegExp(`/gameplay/games/${launched.sessionId}/victory`),
        { timeout: 20_000 },
      );

      await expect
        .poll(async () => {
          const queued = await getContinuityProof(page);
          return queued.pendingBattleOutcomes.some(
            (outcome) =>
              outcome.matchId === launched.sessionId &&
              outcome.contractId === missionId &&
              outcome.scenarioId === encounterId,
          );
        })
        .toBe(true);

      await page.goto(`/gameplay/games/${launched.sessionId}/review`);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 20_000,
      });
      await page.reload();
      await waitForE2EStores(page);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 20_000,
      });

      const queuedAfterReload = await getContinuityProof(page);
      expect(queuedAfterReload.pendingBattleOutcomes).toContainEqual({
        matchId: launched.sessionId!,
        contractId: missionId,
        scenarioId: encounterId,
      });

      await page.getByTestId('apply-outcome-cta').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/campaigns/${campaignId}\\?pendingBattle=${launched.sessionId}`,
        ),
        { timeout: 20_000 },
      );

      const applied = await getContinuityProof(page);
      expect(applied.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: launched.sessionId }),
      );
      expect(applied.processedBattleIds).toContain(launched.sessionId);

      await page.reload();
      await waitForE2EStores(page);
      const appliedAfterReload = await getContinuityProof(page);
      expect(appliedAfterReload.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: launched.sessionId }),
      );
      expect(appliedAfterReload.processedBattleIds).toContain(
        launched.sessionId!,
      );
    },
  );

  test(
    'interactive weapon attack resolution queues, reloads, and applies a campaign outcome',
    { tag: ['@campaign', '@encounter', '@combat', '@smoke'] },
    async ({ page }) => {
      await page.goto('/gameplay');
      await waitForE2EStores(page);

      const { campaignId, missionId, encounterId, encounterName } =
        await createCampaignEncounter(page, 'Continuity Attack');

      await page.goto(
        `/gameplay/encounters/${encounterId}?campaignId=${campaignId}&missionId=${missionId}`,
      );
      await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByTestId('launch-encounter-btn').click();
      await page.waitForURL(
        (url) =>
          url.pathname === `/gameplay/encounters/${encounterId}/pre-battle` &&
          url.searchParams.get('campaignId') === campaignId &&
          url.searchParams.get('missionId') === missionId,
        { timeout: 20_000 },
      );
      await expect(
        page.getByRole('heading', {
          name: `Pre-Battle: ${encounterName}`,
        }),
      ).toBeVisible({
        timeout: 20_000,
      });
      await page.getByTestId('play-manually-btn').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/games/[^?]+\\?campaignId=${campaignId}&missionId=${missionId}`,
        ),
        { timeout: 30_000 },
      );
      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20_000,
      });

      const proof = await resolveInteractiveBattleByWeaponAttack(page);
      expect(proof.sessionId).toBeTruthy();
      expect(proof.phaseBefore).toBe('weapon_attack');
      expect(proof.status, JSON.stringify(proof, null, 2)).toBe('completed');
      expect(proof.reason).not.toBe('concede');
      expect(proof.attackCycles).toBeGreaterThan(0);
      expect(proof.weaponIds.length).toBeGreaterThan(0);
      expect(proof.weaponIds.some((id) => id.includes('medium-laser'))).toBe(
        true,
      );
      expect(proof.destroyedOpponent).toBe(true);
      expect(proof.eventTypes).toEqual(
        expect.arrayContaining([
          'attack_declared',
          'attack_resolved',
          'damage_applied',
          'unit_destroyed',
          'game_ended',
        ]),
      );
      await expect(page.getByTestId('game-completed')).toBeVisible({
        timeout: 20_000,
      });

      await expect
        .poll(async () => {
          const queued = await getContinuityProof(page);
          return queued.pendingBattleOutcomes.some(
            (outcome) =>
              outcome.matchId === proof.sessionId &&
              outcome.contractId === missionId &&
              outcome.scenarioId === encounterId,
          );
        })
        .toBe(true);

      await page.goto(`/gameplay/games/${proof.sessionId}/review`);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 20_000,
      });
      await page.reload();
      await waitForE2EStores(page);
      await expect(page.getByTestId('post-battle-review-screen')).toBeVisible({
        timeout: 20_000,
      });

      const queuedAfterReload = await getContinuityProof(page);
      expect(queuedAfterReload.pendingBattleOutcomes).toContainEqual({
        matchId: proof.sessionId,
        contractId: missionId,
        scenarioId: encounterId,
      });

      await page.getByTestId('apply-outcome-cta').click();
      await page.waitForURL(
        new RegExp(
          `/gameplay/campaigns/${campaignId}\\?pendingBattle=${proof.sessionId}`,
        ),
        { timeout: 20_000 },
      );

      const applied = await getContinuityProof(page);
      expect(applied.pendingBattleOutcomes).not.toContainEqual(
        expect.objectContaining({ matchId: proof.sessionId }),
      );
      expect(applied.processedBattleIds).toContain(proof.sessionId);
    },
  );
});
