import {
  describeArmorPoints,
  diagramLegendMovesToInspector,
} from '@/components/customizer/tabs/ArmorTab.logic';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';

const base = {
  availablePoints: 304,
  armorTonnage: 19,
  allocatedPoints: 304,
  maxTotalArmor: 307,
  maxUsefulTonnage: 19.5,
};

describe('describeArmorPoints', () => {
  it('explains the gap between allocated points and the chassis max', () => {
    expect(describeArmorPoints(base)).toBe(
      '304 pts from 19 t · 3 more need +0.5 t',
    );
  });

  it('names points that are bought but not yet placed', () => {
    expect(describeArmorPoints({ ...base, allocatedPoints: 290 })).toBe(
      '304 pts from 19 t · 14 left to place',
    );
  });

  it('reports points beyond what the chassis can hold once maxed', () => {
    expect(
      describeArmorPoints({
        availablePoints: 312,
        armorTonnage: 19.5,
        allocatedPoints: 307,
        maxTotalArmor: 307,
        maxUsefulTonnage: 19.5,
      }),
    ).toBe('312 pts from 19.5 t · 5 beyond the chassis max');
  });

  it('reports points placed beyond what the tonnage buys', () => {
    expect(describeArmorPoints({ ...base, allocatedPoints: 306 })).toBe(
      '304 pts from 19 t · 2 more than the tonnage buys',
    );
  });

  it('reports over-allocation', () => {
    expect(describeArmorPoints({ ...base, allocatedPoints: 310 })).toBe(
      '304 pts from 19 t · 3 over the max',
    );
  });
});

describe('diagramLegendMovesToInspector', () => {
  it('moves the legend only for biped silhouette diagrams', () => {
    expect(
      diagramLegendMovesToInspector(MechConfiguration.BIPED, 'silhouette'),
    ).toBe(true);
    expect(
      diagramLegendMovesToInspector(MechConfiguration.BIPED, 'schematic'),
    ).toBe(false);
    expect(
      diagramLegendMovesToInspector(MechConfiguration.QUAD, 'silhouette'),
    ).toBe(false);
  });
});
