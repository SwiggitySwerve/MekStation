import {
  DISTRIBUTED_ALLOCATION_RULES,
  MechLocation,
} from '../CriticalSlotAllocation';

function getDistributedRule(componentType: string) {
  const rule = DISTRIBUTED_ALLOCATION_RULES.find(
    (candidate) => candidate.componentType === componentType,
  );

  if (!rule) {
    throw new Error(`Missing distributed allocation rule: ${componentType}`);
  }

  return rule;
}

describe('distributed critical-slot allocation rules', () => {
  it('preserves preferred placement order for Inner Sphere endo steel', () => {
    expect(getDistributedRule('Endo Steel (IS)').preferredLocations).toEqual([
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
      MechLocation.LEFT_ARM,
      MechLocation.RIGHT_ARM,
      MechLocation.LEFT_LEG,
      MechLocation.RIGHT_LEG,
    ]);
  });

  it('does not share mutable preferred-location arrays between rules', () => {
    expect(getDistributedRule('Endo Steel (IS)').preferredLocations).not.toBe(
      getDistributedRule('Ferro-Fibrous (IS)').preferredLocations,
    );
  });
});
