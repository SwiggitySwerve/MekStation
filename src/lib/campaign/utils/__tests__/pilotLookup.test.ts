/**
 * pilotLookup helper — unit tests.
 *
 * Asserts the pre-join template helper used by every two-arg
 * `(entry, pilot | null)` processor in the IPerson hard-cutover migration
 * (Council #2, Cluster E). Builds Map<pilotId, IPilot> in linear time so
 * helpers can resolve vault pilots by `entry.pilotId` without N² find().
 *
 * @spec openspec/specs/campaign-personnel-architecture/spec.md
 */

import {
  PilotStatus,
  PilotType,
  type IPilot,
} from '@/types/pilot/PilotInterfaces';

import { buildPilotLookup } from '../pilotLookup';

// =============================================================================
// Fixture builder
// =============================================================================

function makeVaultPilot(overrides?: Partial<IPilot>): IPilot {
  const now = new Date('2025-01-01T00:00:00Z').toISOString();
  return {
    id: 'pilot-vault-1',
    name: 'Sarah Connor',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 3, piloting: 4 },
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
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('buildPilotLookup', () => {
  it('returns an empty Map when vault is empty', () => {
    const lookup = buildPilotLookup([]);
    expect(lookup.size).toBe(0);
  });

  it('keys each pilot by their id', () => {
    const a = makeVaultPilot({ id: 'pilot-a', name: 'Alpha' });
    const b = makeVaultPilot({ id: 'pilot-b', name: 'Bravo' });
    const c = makeVaultPilot({ id: 'pilot-c', name: 'Charlie' });
    const lookup = buildPilotLookup([a, b, c]);

    expect(lookup.size).toBe(3);
    expect(lookup.get('pilot-a')).toBe(a);
    expect(lookup.get('pilot-b')).toBe(b);
    expect(lookup.get('pilot-c')).toBe(c);
  });

  it('returns undefined for unknown pilot ids (NPC contract: caller coerces to null)', () => {
    const lookup = buildPilotLookup([makeVaultPilot()]);
    expect(lookup.get('npc-roster-local-id')).toBeUndefined();
  });

  it('preserves pilot reference identity (no clone)', () => {
    const original = makeVaultPilot();
    const lookup = buildPilotLookup([original]);
    expect(lookup.get(original.id)).toBe(original);
  });

  it('overwrites duplicate ids with the later occurrence (last write wins)', () => {
    const first = makeVaultPilot({ id: 'dup', name: 'First' });
    const second = makeVaultPilot({ id: 'dup', name: 'Second' });
    const lookup = buildPilotLookup([first, second]);
    expect(lookup.size).toBe(1);
    expect(lookup.get('dup')).toBe(second);
  });

  it('accepts a readonly array (type contract)', () => {
    const vault: readonly IPilot[] = [makeVaultPilot()];
    const lookup = buildPilotLookup(vault);
    expect(lookup.size).toBe(1);
  });
});
