/**
 * Roster Employment Derivation — integration tests.
 *
 * Verifies that the day pipeline reads correctly-derived `campaign.personnel`
 * from `useCampaignRosterStore.pilots` + `usePilotStore.pilots` via the
 * `rosterEntryToPerson` shim.
 *
 * Specifically tests the read-side wiring: salary calculation (and the
 * surrounding finance pipeline) sees populated personnel data instead of
 * the deleted (Phase 5) empty personnel sub-store.
 *
 * @spec openspec/changes/migrate-personnel-to-roster-employment/specs/personnel-management/spec.md
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { calculateTotalMonthlySalary } from '@/lib/finances/salaryService';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import {
  PilotStatus,
  PilotType,
  type IPilot,
} from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Fixtures
// =============================================================================

function makeVaultPilot(id: string, name: string): IPilot {
  const now = new Date('2025-01-01T00:00:00Z').toISOString();
  return {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: 0,
      totalXpEarned: 0,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeRosterEntry(
  pilotId: string,
  pilotName: string,
): ICampaignRosterEntry {
  return {
    pilotId,
    pilotName,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    // Hard-cutover policy (PR2 cluster J): hireDate is required.
    hireDate: new Date('2025-01-01T00:00:00Z'),
  };
}

beforeEach(() => {
  // Reset both stores so each test runs in isolation.
  usePilotStore.setState({
    pilots: [
      makeVaultPilot('pilot-1', 'Sarah Connor'),
      makeVaultPilot('pilot-2', 'John Connor'),
    ],
    selectedPilotId: null,
    isLoading: false,
    error: null,
  });

  useCampaignRosterStore.setState({
    campaignId: 'campaign-test',
    units: [],
    pilots: [
      makeRosterEntry('pilot-1', 'Sarah Connor'),
      makeRosterEntry('pilot-2', 'John Connor'),
    ],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('Roster employment derivation — integration', () => {
  describe('salary calculation (read-side)', () => {
    it('returns zero salary when payForSalaries is disabled (control case)', () => {
      const campaign = {
        id: 'campaign-test',
        personnel: new Map(), // legacy empty Map (the canonical bug — see council decision)
        options: { payForSalaries: false },
      } as unknown as Parameters<typeof calculateTotalMonthlySalary>[0];

      const breakdown = calculateTotalMonthlySalary(campaign);
      expect(breakdown.total.amount).toBe(0);
      expect(breakdown.personnelCount).toBe(0);
    });

    it('reads from a derived personnel Map and computes a non-zero total', () => {
      // Simulate what `advanceDay` does: derive personnel from roster + vault.
      // Use the same code path the production `advanceDay` uses.
      const roster = useCampaignRosterStore.getState().pilots;
      const vault = usePilotStore.getState().pilots;

      // Inline-import the shim (doesn't pollute the test module).
      const { rosterEntryToPerson } = jest.requireActual(
        '@/lib/campaign/utils/rosterEntryToPerson',
      ) as typeof import('@/lib/campaign/utils/rosterEntryToPerson');

      const derivedPersonnel = new Map(
        roster.map((entry) => {
          const vaultPilot = vault.find((p) => p.id === entry.pilotId) ?? null;
          return [entry.pilotId, rosterEntryToPerson(entry, vaultPilot)];
        }),
      );

      // Build a minimal campaign with payForSalaries enabled + derived personnel.
      const campaign = {
        id: 'campaign-test',
        personnel: derivedPersonnel,
        options: {
          payForSalaries: true,
          payForSecondaryRole: false,
          salaryMultiplier: 1.0,
        },
      } as unknown as Parameters<typeof calculateTotalMonthlySalary>[0];

      const breakdown = calculateTotalMonthlySalary(campaign);

      // Both seeded pilots should be eligible (Active status maps to ACTIVE).
      expect(breakdown.personnelCount).toBe(2);
      // Combat salaries should be non-zero (PILOT primary role lands in combat bucket).
      expect(breakdown.combatSalaries.amount).toBeGreaterThan(0);
      expect(breakdown.total.amount).toBe(breakdown.combatSalaries.amount);
    });
  });

  describe('useCampaignStore wiring', () => {
    it('exposes the campaign store factory, vault store, and roster store as siblings', () => {
      // Smoke test: verify the imports compile and work together. This guards
      // against accidentally breaking the import graph (which would block the
      // derive helper in `advanceDay`).
      expect(typeof useCampaignStore).toBe('function');
      expect(useCampaignRosterStore.getState().pilots).toHaveLength(2);
      expect(usePilotStore.getState().pilots).toHaveLength(2);
    });
  });
});
