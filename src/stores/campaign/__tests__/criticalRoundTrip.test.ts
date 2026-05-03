/**
 * PR4 Critical→Wounded round-trip regression test.
 *
 * Locks in the lossy-status fix shipped by PR4 of
 * `wire-iperson-hard-cutover`.
 *
 * ## The bug (pre-PR4)
 *
 * Pilots used to be persisted via `ICampaign.personnel: Map<string, IPerson>`.
 * The `IPerson` shape had no representation for `Critical`, so the
 * legacy `personToRosterEntry` bridge collapsed any wounded pilot to
 * `CampaignPilotStatus.Wounded` on load — a Critical pilot saved by
 * the post-battle pipeline reappeared as Wounded after a reload, with
 * no surfaced warning.
 *
 * ## The fix (PR4)
 *
 * `personnel: Map<string, IPerson>` is gone. The roster store
 * (`useCampaignRosterStore`) now persists pilots directly via its own
 * Zustand `persist` middleware, so the on-disk shape preserves
 * `CampaignPilotStatus` values verbatim — Critical stays Critical
 * across save → reload. `postBattleProcessor.pilotFinalToRosterStatus`
 * is also responsible for *escalating* Wounded → Critical when
 * `wounds >= 5` (a separate concern; see postBattleProcessor.test.ts
 * for that branch).
 *
 * This test would FAIL pre-PR4 (status round-trips to Wounded) and
 * PASSES post-PR4 (status round-trips to Critical).
 */

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import { useCampaignRosterStore } from '../useCampaignRosterStore';

// =============================================================================
// localStorage mock — required because clientSafeStorage delegates to
// `window.localStorage` and we need a deterministic store across hydrate
// cycles within one Jest test process.
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// =============================================================================
// Fixture helper
// =============================================================================

function makeCriticalPilot(): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-critical-001',
    pilotName: 'Critically Wounded Pilot',
    status: CampaignPilotStatus.Critical,
    wounds: 5,
    recoveryTime: 35,
    xp: 100,
    campaignXpEarned: 100,
    campaignKills: 0,
    campaignMissions: 1,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [],
  };
}

// =============================================================================
// Test
// =============================================================================

describe('PR4 — Critical→Wounded round-trip regression', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useCampaignRosterStore.setState({
      campaignId: null,
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
  });

  it('preserves Critical status across persist → rehydrate (no Wounded collapse)', async () => {
    // 1. Seed the roster store with a Critical pilot. Zustand `persist`
    //    middleware auto-writes to clientSafeStorage on every set().
    useCampaignRosterStore.setState({
      campaignId: 'campaign-pr4-regression',
      units: [],
      pilots: [makeCriticalPilot()],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    // 2. Verify the persist envelope hit localStorage with status=critical
    //    (sanity check — proves the round-trip *substrate* preserves the
    //    enum value verbatim).
    const persisted = localStorageMock.getItem('campaign-roster-store');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!) as {
      state: { pilots: ICampaignRosterEntry[] };
    };
    expect(parsed.state.pilots[0].status).toBe(CampaignPilotStatus.Critical);

    // 3. Snapshot the persisted blob, wipe in-memory state (which would
    //    overwrite localStorage), then restore the snapshot before
    //    rehydrate — same shape as a fresh page load reading the
    //    pre-existing campaign-roster-store key.
    const persistedSnapshot = persisted!;
    useCampaignRosterStore.setState({
      campaignId: null,
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    localStorageMock.setItem('campaign-roster-store', persistedSnapshot);
    await useCampaignRosterStore.persist.rehydrate();

    // 4. Critical MUST round-trip back as Critical. Pre-PR4 this asserted
    //    Wounded due to the IPerson Map bridge collapsing the enum.
    const reloaded = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'pilot-critical-001');

    expect(reloaded).toBeDefined();
    expect(reloaded!.status).toBe(CampaignPilotStatus.Critical);
    expect(reloaded!.status).not.toBe(CampaignPilotStatus.Wounded);
    expect(reloaded!.wounds).toBe(5);
    expect(reloaded!.recoveryTime).toBe(35);
  });
});
