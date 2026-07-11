/**
 * combat-midbattle parity spec (task 4.2, W2-gated) — loads the combat
 * pilot pack (genesis: `anchor:seam-fresh-construction-no-instant-defeat`)
 * via `loadEncounterPack` and hard-asserts the SAME recovery-rehydration
 * invariant set the seam trust anchor itself established
 * (`e2e/active-session-recovery.spec.ts`'s
 * `expectMirroredRosterRecovered`): loading complete, no error, active
 * status, every deployed id resolves a movement capability, the bare
 * canonical ref does not, full roster count, no manufactured terminal
 * outcome. Blocking `expect`s only — no capture-tolerant findings, no
 * `@smoke` tag (spec: Parity Binding).
 *
 * The expected roster (deployed ids + the mirrored canonical `unitRef`)
 * is derived from the COMMITTED pack payload itself, never hand-pinned —
 * session-scoped deployed unit ids are never remapped by the stamper
 * (design D4.2), so the raw committed payload's roster is exactly what
 * the loaded session recovers.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D9)
 */

import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { loadEncounterPack } from '../helpers/scenarioPackLoading';
import { getManifestEntry } from './manifest';

// =============================================================================
// Roster derivation (from the committed payload, not a hand-pinned literal)
// =============================================================================

interface CapturedGameUnit {
  readonly id: string;
  readonly side: string;
  readonly unitRef: string;
}
interface CapturedGameCreatedEvent {
  readonly type: string;
  readonly payload: { readonly units: readonly CapturedGameUnit[] };
}
interface CapturedMatchLogPayload {
  readonly events: readonly CapturedGameCreatedEvent[];
}

interface CombatMidbattleRoster {
  readonly deployedIds: readonly string[];
  readonly bareCanonicalRef: string;
  readonly unitCount: number;
}

/**
 * Reads the committed `combat-midbattle` payload directly off disk (NOT
 * via the loader, which stamps ids — deployed unit ids are never among
 * the remapped families, design D4.2) to derive this spec's expectations
 * from the real captured fixture rather than a hardcoded literal.
 */
function readCombatMidbattleRoster(): CombatMidbattleRoster {
  const entry = getManifestEntry('combat-midbattle');
  const absolutePath = path.join(
    process.cwd(),
    'e2e',
    'scenario-packs',
    entry.payloadPath,
  );
  const payload = JSON.parse(
    fs.readFileSync(absolutePath, 'utf8'),
  ) as CapturedMatchLogPayload;
  const createdEvent = payload.events.find(
    (event) => event.type === 'game_created',
  );
  if (!createdEvent) {
    throw new Error(
      'combat-midbattle.parity.spec: no game_created event in the committed payload',
    );
  }
  const units = createdEvent.payload.units;
  const deployedIds = units.map((unit) => unit.id);

  const playerRefCounts = new Map<string, number>();
  for (const unit of units) {
    if (unit.side !== 'player') continue;
    playerRefCounts.set(
      unit.unitRef,
      (playerRefCounts.get(unit.unitRef) ?? 0) + 1,
    );
  }
  const mirroredRef = Array.from(playerRefCounts.entries()).find(
    ([, count]) => count >= 2,
  )?.[0];
  if (!mirroredRef) {
    throw new Error(
      'combat-midbattle.parity.spec: no mirrored canonical unitRef found on the player side of the committed payload',
    );
  }

  return {
    deployedIds,
    bareCanonicalRef: mirroredRef,
    unitCount: units.length,
  };
}

// =============================================================================
// Recovery-invariant snapshot (mirrors active-session-recovery.spec.ts's
// expectMirroredRosterRecovered / readMirroredRosterSnapshot)
// =============================================================================

interface ExposedInteractiveSession {
  readonly getMovementCapability: (unitId: string) => unknown;
}
interface ExposedGameplayState {
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly session?: {
    readonly id?: string;
    readonly events?: readonly { readonly type?: string }[];
    readonly currentState?: {
      readonly status?: string;
      readonly units?: Record<string, unknown>;
    };
  };
  readonly interactiveSession?: ExposedInteractiveSession | null;
}
interface ExposedZustandStores {
  readonly gameplay?: { readonly getState: () => ExposedGameplayState };
}

interface CombatMidbattleSnapshot {
  readonly isLoading: boolean | undefined;
  readonly error: string | null | undefined;
  readonly sessionId: string | undefined;
  readonly status: string | undefined;
  readonly hasInteractiveSession: boolean;
  readonly deployedCapabilityPresent: Record<string, boolean>;
  readonly bareCanonicalRefCapabilityPresent: boolean;
  readonly unitCount: number;
  readonly eventTypes: readonly string[];
}

async function readCombatMidbattleSnapshot(
  page: Page,
  deployedIds: readonly string[],
  bareCanonicalRef: string,
): Promise<CombatMidbattleSnapshot> {
  return page.evaluate(
    ({ ids, bareRef }) => {
      const stores = (
        window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
      ).__ZUSTAND_STORES__;
      const state = stores?.gameplay?.getState();
      const interactiveSession = state?.interactiveSession;

      const deployedCapabilityPresent: Record<string, boolean> = {};
      for (const id of ids) {
        deployedCapabilityPresent[id] =
          !!interactiveSession &&
          interactiveSession.getMovementCapability(id) !== null;
      }

      return {
        isLoading: state?.isLoading,
        error: state?.error,
        sessionId: state?.session?.id,
        status: state?.session?.currentState?.status,
        hasInteractiveSession:
          interactiveSession !== null && interactiveSession !== undefined,
        deployedCapabilityPresent,
        bareCanonicalRefCapabilityPresent:
          !!interactiveSession &&
          interactiveSession.getMovementCapability(bareRef) !== null,
        unitCount: Object.keys(state?.session?.currentState?.units ?? {})
          .length,
        eventTypes: (state?.session?.events ?? []).map(
          (event) => event.type ?? '',
        ),
      };
    },
    { ids: deployedIds, bareRef: bareCanonicalRef },
  );
}

test.describe('scenario pack parity: combat-midbattle', () => {
  test('the recovered mid-battle session preserves every recovery-rehydration invariant', async ({
    page,
  }, testInfo) => {
    const roster = readCombatMidbattleRoster();

    const { matchId } = await loadEncounterPack(page, 'combat-midbattle', {
      workerIndex: testInfo.workerIndex,
    });

    await expect(page.getByTestId('game-error')).toHaveCount(0);
    await expect(page.getByTestId('tactical-turn-rail')).toBeVisible({
      timeout: 20_000,
    });

    const snapshot = await readCombatMidbattleSnapshot(
      page,
      roster.deployedIds,
      roster.bareCanonicalRef,
    );

    // Loading complete, no error (spec: "Cold route mount recovers the
    // seeded match").
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.error).toBeNull();
    expect(snapshot.sessionId).toBe(matchId);
    // Recovery does not manufacture a terminal outcome (status stays
    // active, not completed).
    expect(snapshot.status).toBe('active');
    expect(snapshot.hasInteractiveSession).toBe(true);

    // Every deployed id resolves a movement capability...
    for (const id of roster.deployedIds) {
      expect(snapshot.deployedCapabilityPresent[id]).toBe(true);
    }
    // ...while the bare canonical unitRef shared across the mirrored pair
    // does NOT itself resolve as a deployed unit id (the #1019 collision
    // signature).
    expect(snapshot.bareCanonicalRefCapabilityPresent).toBe(false);
    // Full seeded roster survives recovery with no id-collision collapse.
    expect(snapshot.unitCount).toBe(roster.unitCount);
    // No terminal-outcome event beyond the captured mid-battle log.
    expect(snapshot.eventTypes).not.toContain('game_ended');
  });
});
