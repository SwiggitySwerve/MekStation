/**
 * `inProcessApiFetch` drives the REAL `/api/forces` and `/api/encounters`
 * Pages Router handler modules against real `:memory:` SQLite — no
 * handler module is mocked anywhere in this file (design D3). Proves the
 * route table for every one of `materializeCampaignMissionEncounter`'s
 * five call shapes plus the combat runner's force read-back (design D2),
 * and that an unmatched route throws naming the method+path instead of
 * being absorbed as a silent 404 (risk R1).
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import {
  getEncounterRepository,
  resetEncounterRepository,
} from '@/services/encounter/EncounterRepository';
import {
  getEncounterService,
  resetEncounterService,
} from '@/services/encounter/EncounterService';
import {
  getForceRepository,
  resetForceRepository,
} from '@/services/forces/ForceRepository';
import {
  getForceService,
  resetForceService,
} from '@/services/forces/ForceService';
import { resetSQLiteService } from '@/services/persistence/SQLiteService';
import { resetPilotRepository } from '@/services/pilots/PilotRepository';
import { ForceType } from '@/types/force';

import {
  createInProcessApiFetch,
  initializeInProcessApiDatabase,
} from '../inProcessApiRouter';

// =============================================================================
// Response shapes (test-local — mirrors the materializer's own narrow views)
// =============================================================================

interface ForceOperationResponse {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly force?: {
    readonly id: string;
    readonly assignments: readonly {
      readonly id: string;
      readonly slot: number;
    }[];
  };
}

interface ForceGetResponse {
  readonly force: {
    readonly id: string;
    readonly assignments: readonly {
      readonly id: string;
      readonly unitId: string | null;
    }[];
  };
}

interface EncounterOperationResponse {
  readonly success: boolean;
  readonly id?: string;
  readonly error?: string;
  readonly encounter?: { readonly id: string; readonly description?: string };
}

interface EncounterGetResponse {
  readonly encounter: {
    readonly id: string;
    readonly description?: string;
    readonly playerForce?: { readonly forceId: string } | null;
    readonly opponentForce?: { readonly forceId: string } | null;
  };
}

// =============================================================================
// Setup
// =============================================================================

function resetDatabaseState(): void {
  resetForceService();
  resetForceRepository();
  resetEncounterService();
  // Correction (verified during group-3 authoring, task 3.3):
  // `EncounterRepository` guards its `CREATE TABLE` DDL behind its own
  // `this.initialized` instance flag — the same pattern `ForceRepository`
  // uses — so it DOES need its own reset; only `PilotRepository` has no
  // module-level singleton cache beyond the shared SQLite handle.
  // Skipping this reset is latent in a single-encounters-touching-test
  // file like this one, but bites the moment a second test in the same
  // file also touches encounters (see `fastForwardCombatRunner.test.ts`).
  resetEncounterRepository();
  resetPilotRepository();
  resetSQLiteService();
}

describe('createInProcessApiFetch', () => {
  beforeEach(() => {
    resetDatabaseState();
    initializeInProcessApiDatabase();
  });

  afterEach(() => {
    resetDatabaseState();
  });

  it('drives every routed method+path against the real handlers and real :memory: SQLite rows', async () => {
    const fetchImpl = createInProcessApiFetch();

    // ---- POST /api/forces (player + opponent) ------------------------------
    const playerForceRes = await fetchImpl('/api/forces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Router Test Player Lance',
        forceType: ForceType.Lance,
      }),
    });
    expect(playerForceRes.status).toBe(201);
    expect(playerForceRes.ok).toBe(true);
    const playerForce = (await playerForceRes.json()) as ForceOperationResponse;
    expect(playerForce.success).toBe(true);
    expect(playerForce.force?.assignments).toHaveLength(4);
    const playerForceId = playerForce.force?.id;
    const firstSlotId = playerForce.force?.assignments[0]?.id;
    if (!playerForceId || !firstSlotId) {
      throw new Error(
        'Player force creation did not return the expected shape',
      );
    }

    const opponentForceRes = await fetchImpl('/api/forces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Router Test Opponent Lance',
        forceType: ForceType.Lance,
      }),
    });
    const opponentForce =
      (await opponentForceRes.json()) as ForceOperationResponse;
    const opponentForceId = opponentForce.force?.id;
    if (!opponentForceId) {
      throw new Error('Opponent force creation did not return an id');
    }

    // Real rows exist independent of the router — read straight from the
    // repository the handler itself writes through.
    expect(getForceRepository().getForceById(playerForceId)).not.toBeNull();
    expect(getForceRepository().getForceById(opponentForceId)).not.toBeNull();

    // ---- PUT /api/forces/assignments/:id ------------------------------------
    const assignRes = await fetchImpl(
      `/api/forces/assignments/${encodeURIComponent(firstSlotId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: 'atlas-as7-d' }),
      },
    );
    expect(assignRes.status).toBe(200);
    const assignResult = (await assignRes.json()) as {
      readonly success: boolean;
    };
    expect(assignResult.success).toBe(true);

    // ---- GET /api/forces/:id (design D2's read-back shape) -----------------
    const rereadForceRes = await fetchImpl(
      `/api/forces/${encodeURIComponent(playerForceId)}`,
    );
    expect(rereadForceRes.status).toBe(200);
    const rereadForce = (await rereadForceRes.json()) as ForceGetResponse;
    expect(rereadForce.force.assignments[0]?.unitId).toBe('atlas-as7-d');

    // ---- POST /api/encounters ------------------------------------------------
    const createEncounterRes = await fetchImpl('/api/encounters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Router Test Encounter' }),
    });
    expect(createEncounterRes.status).toBe(201);
    const createdEncounter =
      (await createEncounterRes.json()) as EncounterOperationResponse;
    const encounterId = createdEncounter.encounter?.id;
    if (!encounterId) {
      throw new Error('Encounter creation did not return an id');
    }
    expect(
      getEncounterRepository().getEncounterById(encounterId),
    ).not.toBeNull();

    // ---- PATCH /api/encounters/:id -------------------------------------------
    const patchRes = await fetchImpl(
      `/api/encounters/${encodeURIComponent(encounterId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Router test description' }),
      },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as EncounterOperationResponse;
    expect(patched.success).toBe(true);
    expect(patched.encounter?.description).toBe('Router test description');

    // ---- PUT /api/encounters/:id/player-force + opponent-force --------------
    const playerAttachRes = await fetchImpl(
      `/api/encounters/${encodeURIComponent(encounterId)}/player-force`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceId: playerForceId }),
      },
    );
    expect(playerAttachRes.status).toBe(200);

    const opponentAttachRes = await fetchImpl(
      `/api/encounters/${encodeURIComponent(encounterId)}/opponent-force`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceId: opponentForceId }),
      },
    );
    expect(opponentAttachRes.status).toBe(200);

    // ---- GET /api/encounters/:id — both forces + the patch landed ----------
    const rereadEncounterRes = await fetchImpl(
      `/api/encounters/${encodeURIComponent(encounterId)}`,
    );
    expect(rereadEncounterRes.status).toBe(200);
    const rereadEncounter =
      (await rereadEncounterRes.json()) as EncounterGetResponse;
    expect(rereadEncounter.encounter.playerForce?.forceId).toBe(playerForceId);
    expect(rereadEncounter.encounter.opponentForce?.forceId).toBe(
      opponentForceId,
    );
    expect(rereadEncounter.encounter.description).toBe(
      'Router test description',
    );

    // `getForceService()` / `getEncounterService()` prove the singletons
    // the router bootstrapped are the same ones production code reaches —
    // no parallel service instance was created for the test.
    expect(getForceService().getForce(playerForceId)?.id).toBe(playerForceId);
    expect(getEncounterService().getEncounter(encounterId)?.id).toBe(
      encounterId,
    );
  });

  it('throws naming the method and path for a route the table does not recognize', async () => {
    const fetchImpl = createInProcessApiFetch();

    await expect(
      fetchImpl('/api/unknown-route', { method: 'GET' }),
    ).rejects.toThrow(
      'inProcessApiFetch: no route registered for GET /api/unknown-route',
    );

    // A path the table DOES own for other methods, but not this one —
    // proves matching is method-scoped, not path-only.
    await expect(
      fetchImpl('/api/forces', { method: 'DELETE' }),
    ).rejects.toThrow(
      'inProcessApiFetch: no route registered for DELETE /api/forces',
    );
  });
});
