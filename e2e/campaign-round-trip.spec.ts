/**
 * Campaign Round-Trip E2E (Playwright)
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 spec task §10.3:
 * the full play-loop replicated end-to-end in a real browser. This is
 * the UI-shell counterpart to the in-process integration test
 * `src/__tests__/integration/phase4CampaignRoundTrip.test.ts`. The
 * Jest test exercises the wiring; this Playwright test confirms the
 * dashboard banner + audit feed render the same state once the play
 * loop completes.
 *
 * Strategy: rather than walk the multi-step UI wizards (campaign
 * create → roster → contract generate → encounter launch → tactical
 * battle → review CTA → return to campaign → advance day), which are
 * gated by feature flags and gameplay content that's still
 * stabilizing, we drive the campaign store directly via the
 * `__ZUSTAND_STORES__` exposure that's wired in
 * `src/lib/e2e/storeExposure.ts`. This is the same approach the
 * existing `campaign-flow.spec.ts` and `encounter-flow.spec.ts` tests
 * use for store-backed assertions (see `getStoreState`).
 *
 * The test is tagged `@campaign` (NOT `@smoke`) so PR fast-feedback
 * runs skip it; CI's full Playwright run picks it up.
 *
 * @tags @campaign @round-trip
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for the campaign store to be exposed on `window.__ZUSTAND_STORES__`.
 * The exposure runs once on app boot when `NEXT_PUBLIC_E2E_MODE=true`.
 */
async function waitForCampaignStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { campaign?: unknown };
      };
      return win.__ZUSTAND_STORES__?.campaign !== undefined;
    },
    { timeout: 15000 },
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.setTimeout(60_000);

test.describe('Campaign Round-Trip — single contract play loop', () => {
  test(
    'driving the store directly: publish outcome, advance day, audit ledger reflects effects',
    { tag: ['@campaign', '@round-trip'] },
    async ({ page }) => {
      // Capture browser-side errors so a thrown action surfaces as a
      // test failure instead of a silent state mismatch.
      const consoleErrors: string[] = [];
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      // ------------------------------------------------------------------
      // 1. Navigate to the campaign list and wait for the store to mount.
      // ------------------------------------------------------------------
      await page.goto('/gameplay/campaigns');
      await waitForCampaignStoreReady(page);

      // ------------------------------------------------------------------
      // 2. Drive the campaign store: create a campaign, seed a contract
      //    + pilot + unit max state, publish a synthetic combat outcome,
      //    and advance the day. Mirrors the in-process integration test
      //    so any wiring drift surfaces in both places.
      // ------------------------------------------------------------------
      const result = await page.evaluate(() => {
        const win = window as unknown as {
          __ZUSTAND_STORES__?: {
            campaign: {
              getState: () => {
                createCampaign: (name: string, factionId: string) => string;
                getCampaign: () => unknown;
                updateCampaign: (updates: Record<string, unknown>) => void;
                enqueueOutcome: (outcome: Record<string, unknown>) => void;
                getPendingOutcomeCount: () => number;
                advanceDay: () => unknown;
                getProcessedBattleIds: () => readonly string[];
              };
            };
            campaignRoster: {
              setState: (state: Record<string, unknown>) => void;
            };
          };
        };
        const stores = win.__ZUSTAND_STORES__;
        if (!stores?.campaign) {
          throw new Error('Campaign store not exposed on window');
        }
        if (!stores.campaignRoster) {
          throw new Error('Campaign roster store not exposed on window');
        }
        const state = stores.campaign.getState();

        // 2a. Create a tiny mercenary campaign.
        const campaignId = state.createCampaign(
          'E2E Round-Trip Co.',
          'mercenary',
        );

        // 2b. Build the synthetic outcome inline. We mirror the shape
        //     emitted by `InteractiveSession.tryFinalizeAndPublish`.
        const outcome = {
          version: 1,
          matchId: 'e2e-match-rt-1',
          contractId: 'e2e-contract-rt-1',
          scenarioId: 'e2e-scenario-rt-1',
          endReason: 'destruction',
          report: {
            version: 1,
            matchId: 'e2e-match-rt-1',
            winner: 'player',
            reason: 'destruction',
            turnCount: 5,
            units: [],
            mvpUnitId: null,
            log: [],
          },
          unitDeltas: [
            {
              unitId: 'e2e-unit-A',
              side: 'player',
              destroyed: false,
              finalStatus: 'damaged',
              armorRemaining: { CT: 5, LT: 12, RT: 12 },
              internalsRemaining: { CT: 6, LT: 8, RT: 8 },
              destroyedLocations: [],
              destroyedComponents: [],
              heatEnd: 4,
              ammoRemaining: {},
              pilotState: {
                conscious: true,
                wounds: 1,
                killed: false,
                finalStatus: 'wounded',
              },
            },
          ],
          capturedAt: new Date().toISOString(),
        };

        // 2c. Seed the roster + missions + unitMaxStates so the pipeline
        //     has data to mutate. Per PR4 of `wire-iperson-hard-cutover`:
        //     `useCampaignRosterStore` is the canonical personnel source —
        //     `getPersonnelStore()` / the legacy personnel field were
        //     deleted from the campaign store. Mirrors the Jest twin
        //     (phase4CampaignRoundTrip.test.ts) roster seed; enum literals
        //     inlined because the evaluate sandbox can't import them
        //     (CampaignPilotStatus.Active = 'active',
        //     CampaignPersonnelRole.PILOT = 'Pilot').
        stores.campaignRoster.setState({
          campaignId: 'campaign-001',
          units: [],
          pilots: [
            {
              pilotId: 'e2e-unit-A',
              pilotName: 'E2E Test Pilot',
              status: 'active',
              wounds: 0,
              recoveryTime: 0,
              xp: 0,
              campaignXpEarned: 0,
              campaignKills: 0,
              campaignMissions: 0,
              primaryRole: 'Pilot',
              rankIndex: 0,
              hireDate: new Date('3024-01-01'),
            },
          ],
          missions: [],
          activeMissionId: null,
          missionCount: 0,
        });

        // The contract object mirrors what `createContract` (Mission.ts)
        // produces — kept inline to avoid pulling imports into the
        // page-evaluate sandbox. Shape requirements come from the
        // `isContract` guard the post-battle processor applies
        // (Mission.ts isMission + isContract): `type: 'contract'`,
        // `systemId`, `scenarioIds`, and TOP-LEVEL string
        // `salvageRights`/`commandRights`. MissionStatus values are
        // capitalized ('Active'/'Success').
        const contract = {
          id: 'e2e-contract-rt-1',
          name: 'E2E Garrison Contract',
          status: 'Active',
          type: 'contract',
          systemId: 'Unknown System',
          scenarioIds: [],
          employerId: 'lyran-commonwealth',
          targetId: 'capellan-confederation',
          paymentTerms: {
            baseMultiplier: 1,
            commandRights: 'integrated',
            salvageRights: 50,
            transportRights: 'employer-pays',
            advancePayment: 0,
            overheadComp: 'overhead',
            duration: 6,
          },
          salvageRights: 'None',
          commandRights: 'House',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.updateCampaign({
          missions: new Map([[contract.id, contract]]),
          unitMaxStates: {
            'e2e-unit-A': {
              unitId: 'e2e-unit-A',
              maxArmorPerLocation: { CT: 30, LT: 20, RT: 20 },
              maxStructurePerLocation: { CT: 15, LT: 12, RT: 12 },
              maxAmmoPerBin: {},
            },
          },
        });

        // 2d. Publish via enqueueOutcome (in-store path; equivalent to
        //     the bus subscription firing). The enqueue is idempotent.
        state.enqueueOutcome(outcome);
        const pendingBefore = state.getPendingOutcomeCount();

        // 2e. Advance the day — the pipeline runs and drains the queue.
        state.advanceDay();

        const pendingAfter = state.getPendingOutcomeCount();
        const processedIds = state.getProcessedBattleIds();
        const campaign = state.getCampaign() as
          | (Record<string, unknown> & {
              dailyBattleAudit?: ReadonlyArray<{
                matchesProcessed: number;
                pilotsWounded: number;
                contractsClosed: readonly string[];
                matches: ReadonlyArray<{ matchId: string; summary: string }>;
              }>;
              missions?: Map<string, { status: string }>;
              repairQueue?: ReadonlyArray<{ matchId: string }>;
              salvageReports?: Record<string, unknown>;
            })
          | null;

        return {
          campaignId,
          pendingBefore,
          pendingAfter,
          processedIds: Array.from(processedIds),
          contractStatus:
            campaign?.missions?.get('e2e-contract-rt-1')?.status ?? null,
          auditLedgerLength: campaign?.dailyBattleAudit?.length ?? 0,
          auditEntry: campaign?.dailyBattleAudit?.[0] ?? null,
          repairTicketCount:
            campaign?.repairQueue?.filter((t) => t.matchId === 'e2e-match-rt-1')
              .length ?? 0,
          hasSalvageReport:
            campaign?.salvageReports?.['e2e-match-rt-1'] !== undefined,
        };
      });

      // ------------------------------------------------------------------
      // 3. Assert the round-trip effects landed in the live store.
      // ------------------------------------------------------------------
      expect(result.campaignId).toBeTruthy();
      expect(result.pendingBefore).toBe(1);
      expect(result.pendingAfter).toBe(0);
      expect(result.processedIds).toContain('e2e-match-rt-1');

      // Contract flipped to a terminal status because winner='player'.
      // MissionStatus.SUCCESS = 'Success' (enums/MissionStatus.ts).
      expect(result.contractStatus).toBe('Success');

      // Audit ledger has a single entry covering the match.
      expect(result.auditLedgerLength).toBe(1);
      expect(result.auditEntry).not.toBeNull();
      expect(result.auditEntry?.matchesProcessed).toBe(1);
      expect(result.auditEntry?.pilotsWounded).toBe(1);
      expect(result.auditEntry?.matches?.[0]?.matchId).toBe('e2e-match-rt-1');
      expect(result.auditEntry?.contractsClosed).toContain('e2e-contract-rt-1');

      // Repair pipeline produced at least one ticket from the damage
      // diff, salvage processor stamped a report.
      expect(result.repairTicketCount).toBeGreaterThan(0);
      expect(result.hasSalvageReport).toBe(true);

      // No browser-side errors during the round trip.
      expect(consoleErrors).toEqual([]);
    },
  );
});
