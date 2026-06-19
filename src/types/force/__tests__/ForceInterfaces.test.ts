import {
  canHaveSubForces,
  createEmptyAssignments,
  ForcePosition,
  ForceType,
  getDefaultSlotCount,
  getForceTypeName,
} from '@/types/force/ForceInterfaces';

describe('force type helpers', () => {
  const forceTypes: readonly {
    readonly forceType: ForceType;
    readonly slotCount: number;
    readonly displayName: string;
    readonly canHaveSubForces: boolean;
  }[] = [
    {
      forceType: ForceType.Lance,
      slotCount: 4,
      displayName: 'Lance',
      canHaveSubForces: false,
    },
    {
      forceType: ForceType.Star,
      slotCount: 5,
      displayName: 'Star',
      canHaveSubForces: false,
    },
    {
      forceType: ForceType.Level_II,
      slotCount: 6,
      displayName: 'Level II',
      canHaveSubForces: false,
    },
    {
      forceType: ForceType.Company,
      slotCount: 12,
      displayName: 'Company',
      canHaveSubForces: true,
    },
    {
      forceType: ForceType.Binary,
      slotCount: 10,
      displayName: 'Binary',
      canHaveSubForces: true,
    },
    {
      forceType: ForceType.Battalion,
      slotCount: 36,
      displayName: 'Battalion',
      canHaveSubForces: true,
    },
    {
      forceType: ForceType.Cluster,
      slotCount: 50,
      displayName: 'Cluster',
      canHaveSubForces: true,
    },
    {
      forceType: ForceType.Custom,
      slotCount: 4,
      displayName: 'Custom',
      canHaveSubForces: false,
    },
  ];

  it.each(forceTypes)(
    'returns slot count and display metadata for $forceType',
    ({ forceType, slotCount, displayName, canHaveSubForces: expected }) => {
      expect(getDefaultSlotCount(forceType)).toBe(slotCount);
      expect(getForceTypeName(forceType)).toBe(displayName);
      expect(canHaveSubForces(forceType)).toBe(expected);
    },
  );

  it('preserves unknown force fallback behavior', () => {
    const unknown = 'legacy_unknown' as ForceType;

    expect(getDefaultSlotCount(unknown)).toBe(4);
    expect(getForceTypeName(unknown)).toBe('Unknown');
  });
});

describe('createEmptyAssignments', () => {
  it('creates a lead slot followed by member slots', () => {
    const assignments = createEmptyAssignments(ForceType.Star);

    expect(assignments).toHaveLength(5);
    expect(assignments[0]).toMatchObject({
      id: 'slot-1',
      pilotId: null,
      unitId: null,
      position: ForcePosition.Lead,
      slot: 1,
    });
    expect(
      assignments.slice(1).map((assignment) => assignment.position),
    ).toEqual([
      ForcePosition.Member,
      ForcePosition.Member,
      ForcePosition.Member,
      ForcePosition.Member,
    ]);
  });
});
