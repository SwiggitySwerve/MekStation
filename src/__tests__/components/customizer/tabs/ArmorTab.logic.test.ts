import {
  describeArmorPoints,
  describeMaximizeGain,
  armorTabColumns,
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
      '304 pts from 19.0 t · 3 more need +0.5 t',
    );
  });

  it('names points that are bought but not yet placed', () => {
    expect(describeArmorPoints({ ...base, allocatedPoints: 290 })).toBe(
      '304 pts from 19.0 t · 14 left to place',
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
      '304 pts from 19.0 t · 2 more than the tonnage buys',
    );
  });

  it('reports over-allocation', () => {
    expect(describeArmorPoints({ ...base, allocatedPoints: 310 })).toBe(
      '304 pts from 19.0 t · 3 over the max',
    );
  });
});

describe('diagramLegendMovesToInspector', () => {
  it('moves the legend only for status-colour biped silhouette diagrams', () => {
    expect(
      diagramLegendMovesToInspector(
        MechConfiguration.BIPED,
        'silhouette',
        'neon-operator',
      ),
    ).toBe(true);
    expect(
      diagramLegendMovesToInspector(
        MechConfiguration.BIPED,
        'schematic',
        'neon-operator',
      ),
    ).toBe(false);
    expect(
      diagramLegendMovesToInspector(
        MechConfiguration.QUAD,
        'silhouette',
        'neon-operator',
      ),
    ).toBe(false);
  });

  it('shows no status-colour legend for the Standard (Blueprint) silhouette', () => {
    expect(
      diagramLegendMovesToInspector(
        MechConfiguration.BIPED,
        'silhouette',
        'clean-tech',
      ),
    ).toBe(false);
  });
});

describe('armorTabColumns', () => {
  it('narrows the diagram column only for the Standard biped silhouette', () => {
    expect(
      armorTabColumns(MechConfiguration.BIPED, 'silhouette', 'clean-tech'),
    ).toBe('xl:grid-cols-[minmax(40rem,1.25fr)_minmax(19rem,1fr)]');
    const wide = 'xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]';
    expect(
      armorTabColumns(MechConfiguration.BIPED, 'silhouette', 'neon-operator'),
    ).toBe(wide);
    expect(
      armorTabColumns(MechConfiguration.BIPED, 'schematic', 'clean-tech'),
    ).toBe(wide);
    expect(
      armorTabColumns(MechConfiguration.QUAD, 'silhouette', 'clean-tech'),
    ).toBe(wide);
  });
});

describe('describeMaximizeGain', () => {
  const atlas = {
    armorTonnage: 19,
    availablePoints: 304,
    maxTotalArmor: 307,
    maxUsefulTonnage: 19.5,
    pointsAtMaxUsefulTonnage: 312,
  };

  it('counts only the points the chassis can still take', () => {
    // 19.5 t buys 312 points, but only 307 fit: +3, not +8.
    expect(describeMaximizeGain(atlas)).toBe('+0.5 t, +3 pts');
  });

  it('counts every bought point below the chassis max', () => {
    expect(
      describeMaximizeGain({
        ...atlas,
        armorTonnage: 10,
        availablePoints: 160,
      }),
    ).toBe('+9.5 t, +147 pts');
  });

  it('says nothing once the tonnage covers the chassis max', () => {
    expect(
      describeMaximizeGain({
        ...atlas,
        armorTonnage: 19.5,
        availablePoints: 312,
      }),
    ).toBeNull();
  });
});
