import {
  captureEquipmentMutationPolicy,
  matchesEquipmentMutationPolicy,
} from '../equipmentMutationPolicy';

describe('equipment mutation policy snapshots', () => {
  const equipment = [
    { instanceId: 'laser', isRemovable: true, isOmniPodMounted: true },
    { instanceId: 'engine', isRemovable: false, isOmniPodMounted: false },
  ];

  it('accepts equal copied rows in a different order', () => {
    const snapshot = captureEquipmentMutationPolicy(equipment);
    expect(
      matchesEquipmentMutationPolicy(
        snapshot,
        [...equipment].reverse().map((item) => ({ ...item })),
      ),
    ).toBe(true);
  });

  it('accepts an unchanged omitted pod flag', () => {
    const rows = [{ instanceId: 'laser', isRemovable: true }];
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(rows),
        rows,
      ),
    ).toBe(true);
  });

  it.each([false, true])('refuses omitted pod flag changed to %s', (flag) => {
    const rows = [{ instanceId: 'laser', isRemovable: true }];
    expect(
      matchesEquipmentMutationPolicy(captureEquipmentMutationPolicy(rows), [
        { ...rows[0], isOmniPodMounted: flag },
      ]),
    ).toBe(false);
  });

  it.each([false, true])(
    'refuses explicit pod flag %s becoming omitted',
    (flag) => {
      const row = { instanceId: 'laser', isRemovable: true };
      expect(
        matchesEquipmentMutationPolicy(
          captureEquipmentMutationPolicy([{ ...row, isOmniPodMounted: flag }]),
          [row],
        ),
      ).toBe(false);
    },
  );

  it('refuses a same-count replacement ID', () => {
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(equipment),
        [{ ...equipment[0], instanceId: 'replacement' }, equipment[1]],
      ),
    ).toBe(false);
  });

  it('refuses same-count removability swaps between IDs', () => {
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(equipment),
        equipment.map((item) => ({ ...item, isRemovable: !item.isRemovable })),
      ),
    ).toBe(false);
  });

  it('refuses same-count pod flag swaps between IDs', () => {
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(equipment),
        equipment.map((item) => ({
          ...item,
          isOmniPodMounted: !item.isOmniPodMounted,
        })),
      ),
    ).toBe(false);
  });

  it('refuses duplicate current IDs despite equal row counts', () => {
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(equipment),
        [equipment[0], { ...equipment[0] }],
      ),
    ).toBe(false);
  });

  it.each([
    { rows: [] },
    { rows: [...equipment, { ...equipment[0], instanceId: 'extra' }] },
  ])('refuses changed cardinality: %j', ({ rows }) => {
    expect(
      matchesEquipmentMutationPolicy(
        captureEquipmentMutationPolicy(equipment),
        rows,
      ),
    ).toBe(false);
  });

  it('accepts an empty snapshot only against empty current equipment', () => {
    const snapshot = captureEquipmentMutationPolicy([]);
    expect(matchesEquipmentMutationPolicy(snapshot, [])).toBe(true);
    expect(matchesEquipmentMutationPolicy(snapshot, equipment)).toBe(false);
  });

  it('captures raw values without retaining mutable row references', () => {
    const row = {
      instanceId: 'laser',
      isRemovable: true,
      isOmniPodMounted: true,
    };
    const snapshot = captureEquipmentMutationPolicy([row]);
    row.isRemovable = false;
    row.isOmniPodMounted = false;
    expect(matchesEquipmentMutationPolicy(snapshot, [row])).toBe(false);
    expect(
      matchesEquipmentMutationPolicy(snapshot, [
        { instanceId: 'laser', isRemovable: true, isOmniPodMounted: true },
      ]),
    ).toBe(true);
  });

  it('preserves existing Map last-entry capture semantics for duplicate IDs', () => {
    const first = { instanceId: 'laser', isRemovable: false };
    const last = {
      instanceId: 'laser',
      isRemovable: true,
      isOmniPodMounted: true,
    };
    const snapshot = captureEquipmentMutationPolicy([first, last]);
    expect(matchesEquipmentMutationPolicy(snapshot, [first, last])).toBe(false);
    expect(matchesEquipmentMutationPolicy(snapshot, [first])).toBe(false);
    expect(matchesEquipmentMutationPolicy(snapshot, [last])).toBe(true);
  });
});
