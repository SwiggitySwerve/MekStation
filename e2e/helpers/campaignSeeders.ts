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

export interface ISeedContractOffer {
  readonly offerId: string;
  readonly name: string;
  readonly employerFactionId: string;
  readonly basePayout?: number;
}

export interface ISeedHiringCandidate {
  readonly offerId: string;
  readonly pilotName: string;
  readonly hireBonus: number;
}

// =============================================================================
// Internal: store accessor
// =============================================================================

/**
 * Resolve the campaign store handle from the page. The exposed shape
 * is either a `StoreApi` directly OR a lazy getter `() => StoreApi`
 * depending on the build (PT-004 fix). This helper normalizes both.
 */
async function withCampaignState<T>(
  page: Page,
  worker: (state: {
    readonly updateCampaign: (u: Record<string, unknown>) => void;
  }) => T,
): Promise<T> {
  return page.evaluate(
    ({ workerSrc }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: Record<string, unknown>;
        }
      ).__ZUSTAND_STORES__;
      const raw = stores?.campaign as unknown;
      const storeApi =
        typeof raw === 'function'
          ? (raw as () => { getState: () => unknown })()
          : (raw as { getState: () => unknown });
      const state = storeApi.getState() as {
        updateCampaign: (u: Record<string, unknown>) => void;
      };
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('state', `return (${workerSrc})(state);`);
      return fn(state) as T;
    },
    { workerSrc: worker.toString() },
  );
}

// =============================================================================
// Seeders
// =============================================================================

/**
 * Seed an injured-pilot row on the medical bay. Surfaces in
 * `<MedicalBay>` as `medical-bay-row-{pilotId}`.
 */
export async function seedInjuredPilot(
  page: Page,
  opts: ISeedInjuredPilotOpts,
): Promise<void> {
  await withCampaignState(page, (state) => {
    state.updateCampaign({
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
  await withCampaignState(page, (state) => {
    state.updateCampaign({
      salvageBay: {
        candidates: candidates.map((c) => ({
          ...c,
          status: c.status ?? 'pending',
        })),
      },
    });
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
  await withCampaignState(page, (state) => {
    state.updateCampaign({
      repairBay: { tickets: [...tickets] },
    });
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
  await withCampaignState(page, (state) => {
    state.updateCampaign({
      moraleState: opts.state,
      moraleTransitions: opts.transitions ?? [],
    });
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
  await withCampaignState(page, (state) => {
    state.updateCampaign({
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
  await withCampaignState(page, (state) => {
    state.updateCampaign({
      personnelMarket: offers.map((o) => ({
        offerId: o.offerId,
        pilotName: o.pilotName,
        hireBonus: o.hireBonus,
      })),
    });
  });
}

/**
 * Seed the contract market so the spec doesn't have to advance a day
 * to populate it.
 */
export async function seedContractMarket(
  page: Page,
  offers: readonly ISeedContractOffer[],
): Promise<void> {
  await withCampaignState(page, (state) => {
    state.updateCampaign({
      contractMarket: {
        offers: offers.map((o) => ({
          ...o,
          basePayout: o.basePayout ?? 250000,
        })),
      },
    });
  });
}
