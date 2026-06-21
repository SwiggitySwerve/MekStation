/**
 * Campaign-state seed helpers for Phase 6.1.C subsystem validation specs.
 *
 * Each helper mutates `window.__ZUSTAND_STORES__.campaign.getState()`
 * directly via the PT-004 store-exposure pattern. The helpers exist so
 * subsystem specs don't have to drive multi-step campaign flows just to
 * reach a particular pre-condition state — e.g. a Medical Bay spec
 * needs an injured pilot in the store before it can assert recovery
 * countdown, but injuring a pilot through the UI requires running a
 * combat encounter. The seed helper does it directly.
 *
 * The helpers are intentionally thin — they call `updateCampaign` with
 * the same shape the production code uses. No new store contract.
 *
 * @spec openspec/changes/add-subsystem-validation-specs/specs/e2e-testing/spec.md
 */

import type { Page } from '@playwright/test';

import { createTestPilot, PILOT_SKILL_PRESETS } from '../fixtures/pilot';

// =============================================================================
// Helper input shapes
// =============================================================================

export interface ISeedInjuredPilotOpts {
  readonly pilotId: string;
  readonly pilotName?: string;
  readonly daysToRecovery: number;
}

export interface ISeedSalvageCandidate {
  readonly partId: string;
  readonly partName: string;
  readonly value: number;
  readonly status?: 'pending' | 'accepted' | 'declined';
}

export interface ISeedRepairTicket {
  readonly ticketId: string;
  readonly unitId: string;
  readonly description: string;
  readonly hours: number;
}

export interface ISeedMoraleStateOpts {
  readonly state: 'Confident' | 'Steady' | 'Cautious' | 'Wavering' | 'Routed';
  readonly transitions?: readonly {
    readonly fromState: string;
    readonly toState: string;
    readonly atDay: number;
  }[];
}

export interface ISeedRefitReadyUnit {
  readonly unitId: string;
  readonly unitName: string;
}

export interface ISeedHiringCandidate {
  readonly offerId: string;
  readonly pilotName: string;
  readonly hireBonus: number;
}

export interface ISeedCareerPilotOpts {
  readonly name?: string;
  readonly callsign?: string;
  readonly affiliation?: string;
}

export interface ISeedCareerPilotResult {
  readonly id: string;
  readonly name: string;
  readonly callsign: string;
  readonly affiliation: string;
}

// =============================================================================
// Internal: store accessor
// =============================================================================

async function waitForPilotStore(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as unknown as { __ZUSTAND_STORES__?: Record<string, unknown> })
          .__ZUSTAND_STORES__?.pilot,
      ),
    undefined,
    { timeout: 15_000 },
  );
}

/**
 * Apply a campaign-store `updateCampaign(updates)` from the test side.
 *
 * Each seeder builds its (JSON-serializable) update payload in Node and
 * passes it INTO the page. The previous implementation serialized a
 * worker callback via `worker.toString()` + `new Function` — closure
 * variables (the seeder's own arguments) did not survive serialization
 * and threw `ReferenceError: <arg> is not defined` inside the page
 * (e2e triage RC17 follow-on, surfaced once the invalid-hook-call
 * normalization bug ahead of it was fixed).
 */
async function applyCampaignUpdate(
  page: Page,
  updates: Record<string, unknown>,
): Promise<void> {
  // Store exposure runs in a post-hydration `useEffect` (`_app.tsx` →
  // `exposeStoresForE2E()`); seeders frequently run right after a `goto`,
  // so poll for the handle instead of racing it (CI failure mode).
  await page.waitForFunction(
    () =>
      Boolean(
        (window as unknown as { __ZUSTAND_STORES__?: Record<string, unknown> })
          .__ZUSTAND_STORES__?.campaign,
      ),
    undefined,
    { timeout: 15_000 },
  );

  await page.evaluate((u) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: Record<string, unknown>;
      }
    ).__ZUSTAND_STORES__;
    const raw = stores?.campaign as unknown;
    // The exposed campaign store is a zustand bound hook — a FUNCTION
    // carrying `getState`/`setState` statics (`useCampaignStore()` returns
    // `create()`'s result, `useCampaignStore.ts`). Calling it would be an
    // invalid React hook call, so detect the StoreApi shape FIRST and only
    // fall back to invoking a legacy lazy getter that lacks the statics.
    const storeApi =
      raw !== null &&
      (typeof raw === 'object' || typeof raw === 'function') &&
      'getState' in (raw as object)
        ? (raw as { getState: () => unknown })
        : (raw as () => { getState: () => unknown })();
    const state = storeApi.getState() as {
      updateCampaign: (updates2: Record<string, unknown>) => void;
    };
    state.updateCampaign(u);
  }, updates);
}

// =============================================================================
// Seeders
// =============================================================================

/**
 * Seed a pilot that the roster and career-history navigation specs can assert
 * against without relying on ambient local database state.
 */
export async function seedCareerPilot(
  page: Page,
  opts: ISeedCareerPilotOpts = {},
): Promise<ISeedCareerPilotResult> {
  await waitForPilotStore(page);

  const seededPilot = {
    name: opts.name ?? `E2E Career Pilot ${Date.now()}`,
    callsign: opts.callsign ?? 'Ledger',
    affiliation: opts.affiliation ?? 'E2E Test Command',
  };
  const id = await createTestPilot(page, {
    ...seededPilot,
    skills: PILOT_SKILL_PRESETS.veteran,
    startingXp: 12,
    rank: 'MechWarrior',
  });

  if (!id) {
    throw new Error('Pilot seeder failed to create a career-history pilot');
  }

  await page.waitForFunction(
    (pilotId) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            pilot?: {
              getState?: () => {
                pilots?: unknown;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;
      const pilots = stores?.pilot?.getState?.().pilots;

      if (pilots instanceof Map) {
        return pilots.has(pilotId);
      }

      if (Array.isArray(pilots)) {
        return pilots.some(
          (pilot) =>
            typeof pilot === 'object' &&
            pilot !== null &&
            'id' in pilot &&
            pilot.id === pilotId,
        );
      }

      return false;
    },
    id,
    { timeout: 15_000 },
  );

  return { id, ...seededPilot };
}

/**
 * Seed an injured-pilot row on the medical bay. Surfaces in
 * `<MedicalBay>` as `medical-bay-row-{pilotId}`.
 */
export async function seedInjuredPilot(
  page: Page,
  opts: ISeedInjuredPilotOpts,
): Promise<void> {
  await applyCampaignUpdate(page, {
    medical: {
      injuries: [
        {
          pilotId: opts.pilotId,
          pilotName: opts.pilotName ?? `Pilot ${opts.pilotId}`,
          daysToRecovery: opts.daysToRecovery,
        },
      ],
    },
  });
}

/**
 * Seed post-battle salvage candidates so the salvage acceptance panel
 * has rows to render.
 */
export async function seedSalvageCandidates(
  page: Page,
  candidates: readonly ISeedSalvageCandidate[],
): Promise<void> {
  await applyCampaignUpdate(page, {
    salvageBay: {
      candidates: candidates.map((c) => ({
        ...c,
        status: c.status ?? 'pending',
      })),
    },
  });
}

/**
 * Seed repair-bay tickets — Phase 6.1.C #2.7 spec consumes this to
 * drive the up/down priority reorder controls.
 */
export async function seedRepairTickets(
  page: Page,
  tickets: readonly ISeedRepairTicket[],
): Promise<void> {
  await applyCampaignUpdate(page, {
    repairBay: { tickets: [...tickets] },
  });
}

/**
 * Seed the campaign's morale state + transition history so the
 * `<PrestigeMoralePanel>` renders a deterministic snapshot.
 */
export async function seedMoraleState(
  page: Page,
  opts: ISeedMoraleStateOpts,
): Promise<void> {
  await applyCampaignUpdate(page, {
    moraleState: opts.state,
    moraleTransitions: opts.transitions ? [...opts.transitions] : [],
  });
}

/**
 * Seed a unit ready for refit — the mech-bay spec uses this to open
 * the refit panel without running a campaign.
 */
export async function seedRefitReadyUnit(
  page: Page,
  unit: ISeedRefitReadyUnit,
): Promise<void> {
  await applyCampaignUpdate(page, {
    mechBay: {
      units: [
        {
          ...unit,
          readiness: 'Active',
          damageState: 'undamaged',
        },
      ],
    },
  });
}

/**
 * Seed the hiring-hall personnel market so the spec doesn't have to
 * advance a day to populate it.
 */
export async function seedHiringHall(
  page: Page,
  offers: readonly ISeedHiringCandidate[],
): Promise<void> {
  // Canonical `IPersonnelMarketOffer` shape (marketTypes.ts:160-181): the
  // panel keys cards by `id`, renders `name`, badges `experienceLevel`,
  // and builds the hire price via `new Money(offer.hireCost)` — all
  // JSON-safe, so a page-evaluate seed satisfies the full contract.
  const expirationDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await applyCampaignUpdate(page, {
    personnelMarket: offers.map((o) => ({
      id: o.offerId,
      name: o.pilotName,
      role: 'Pilot', // CampaignPersonnelRole.PILOT
      experienceLevel: 'regular', // MarketExperienceLevel.REGULAR
      skills: { gunnery: 4, piloting: 5 },
      hireCost: o.hireBonus,
      expirationDate,
    })),
  });
}

// NOTE: there is deliberately NO seedContractMarket helper. Contract-market
// offers are full `IContract` records whose `paymentTerms.basePayment` must
// be a live `Money` INSTANCE (`OfferCard` calls `.format()` on it,
// ContractMarketPanel.tsx:88) — a page-evaluate seed can only inject plain
// JSON and would crash the card. The contract-market page auto-seeds a
// deterministic 5-offer market on first open (`generateAtBContracts`,
// contract-market.tsx:63-72), so specs assert against that instead.
