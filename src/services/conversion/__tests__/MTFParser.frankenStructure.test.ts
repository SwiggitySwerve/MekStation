import { UnitContract } from '@/types/contracts';

/**
 * FrankenMek per-location structure tonnage in the in-app MTF importer.
 * Same rule and cases as the converter (scripts/__tests__/test_mtf_franken_structure.py):
 * MegaMek 48fcb2f6 MtfFile.java:362-411,669-702. Internal points per location
 * come only from calcTotalStructure (Mek.java:1062-1087).
 */
import { calcTotalStructure } from '../../../../scripts/validate-bv-unit-derived';
import { MTFParserService } from '../MTFParserService';
import fixtures from './MTFParser.pinned-sources.json';

const GUSTAV = [
  'chassis:Schwerer Gustav',
  'model:',
  'Config:Biped FrankenMek',
  'mass:100',
  'structure:Hybrid',
  'LA structure:IS Endo Steel:65',
  'RA structure:IS Endo Steel:65',
  'LT structure:Standard:100',
  'RT structure:IS Endo Steel:70',
  'CT structure:Standard:100',
  'HD structure:Standard:100',
  'LL structure:Standard:100',
  'RL structure:Standard:100',
];

const importStructure = (text: string) => {
  const parsed = new MTFParserService().parse(text);
  if (!parsed.unit) throw new Error(parsed.errors.join('; '));
  return parsed.unit.structure;
};

describe('MTF importer FrankenMek structure tonnage', () => {
  it('retains typed donors, including distinct IS and Clan identities', () => {
    expect(importStructure(GUSTAV.join('\n'))).toMatchObject({
      typeByLocation: {
        LEFT_ARM: 'ENDO_STEEL',
        RIGHT_ARM: 'ENDO_STEEL',
        RIGHT_TORSO: 'ENDO_STEEL',
        CENTER_TORSO: 'STANDARD',
      },
    });
    const text = GUSTAV.join('\n').replace(
      'IS Endo Steel:65',
      'Clan Endo Steel:65',
    );
    expect(importStructure(text)).toMatchObject({
      typeByLocation: { LEFT_ARM: 'ENDO_STEEL_CLAN' },
    });
  });

  it.each(['Unknown Alloy', 'ENDO_STEEL'])(
    'rejects an unknown native donor spelling %s',
    (type) => {
      const parsed = new MTFParserService().parse(
        GUSTAV.join('\n').replace('IS Endo Steel:65', `${type}:65`),
      );
      expect(parsed.success).toBe(false);
      expect(parsed.errors.join('; ')).toContain(
        `Unknown structure type for LA: ${type}`,
      );
    },
  );

  it('retains native Standard defaults for missing and scalar Hybrid donors', () => {
    const text =
      'chassis:X\nConfig:Biped FrankenMek\nmass:50\nstructure:Hybrid\nLA structure:35';
    expect(importStructure(text)).toMatchObject({ typeByLocation: {} });
  });

  it('validates optional donor types and leaves old documents unchanged', () => {
    const old = new MTFParserService().parse(
      'chassis:X\nConfig:Biped\nmass:50',
    ).unit;
    if (!old) throw new Error('Missing test unit');
    const legacy = UnitContract.parse(old);
    expect(legacy.structure).toEqual({ type: 'STANDARD' });
    const structure = {
      ...old.structure,
      typeByLocation: { LEFT_ARM: 'ENDO_COMPOSITE_CLAN' },
    };
    expect(UnitContract.parse({ ...old, structure }).structure).toEqual(
      structure,
    );
    for (const typeByLocation of [
      { LEFT_ARM: 'Unknown Alloy' },
      { NOT_A_LOCATION: 'STANDARD' },
    ]) {
      expect(
        UnitContract.safeParse({
          ...old,
          structure: { ...old.structure, typeByLocation },
        }).success,
      ).toBe(false);
    }
  });

  it('qualifies unprefixed donor types by chassis while retaining explicit IS types', () => {
    const text =
      'chassis:X\nConfig:Biped FrankenMek\nmass:50\ntechbase:Mixed (Clan Chassis)\nstructure:Hybrid\nLA structure:Endo-Composite:50\nRA structure:IS Endo Steel:50';
    expect(importStructure(text)).toMatchObject({
      typeByLocation: {
        LEFT_ARM: 'ENDO_COMPOSITE_CLAN',
        RIGHT_ARM: 'ENDO_STEEL',
      },
    });
    expect(
      importStructure(
        text
          .replace('structure:Hybrid', 'structure:IS Endo Steel')
          .replace('LA structure:Endo-Composite:50', 'LA structure:35'),
      ),
    ).toMatchObject({ typeByLocation: { LEFT_ARM: 'ENDO_STEEL' } });
  });

  it('keeps each hybrid location tonnage (Schwerer Gustav)', () => {
    expect(importStructure(GUSTAV.join('\n')).locationTonnage).toEqual({
      HEAD: 100,
      CENTER_TORSO: 100,
      LEFT_TORSO: 100,
      RIGHT_TORSO: 70,
      LEFT_ARM: 65,
      RIGHT_ARM: 65,
      LEFT_LEG: 100,
      RIGHT_LEG: 100,
    });
  });

  it('reads plain tonnage values without a type', () => {
    const text =
      'chassis:X\nConfig:Biped FrankenMek\nmass:50\nstructure:Standard\nLA structure:35';
    expect(importStructure(text).locationTonnage).toEqual({ LEFT_ARM: 35 });
  });

  it('adds nothing for other meks', () => {
    const text = GUSTAV.join('\n').replace('Biped FrankenMek', 'Biped');
    expect(importStructure(text)).toEqual({ type: 'STANDARD' });
  });

  it('gives the pinned Hybrid Rifleman (Sneede II) Java internals of 101', () => {
    // UL-16b oracle: originalInternal 3+20+14+15+10+11+14+14 = 101 at 60 t.
    const source = fixtures.rows.find((row) =>
      row.path.endsWith('(Sneede II).mtf'),
    );
    if (!source) throw new Error('Missing pinned FrankenMek fixture');
    const text = Buffer.from(source.base64, 'base64').toString('utf8');
    expect(
      calcTotalStructure(60, 'Biped', importStructure(text).locationTonnage),
    ).toBe(101);
  });
});
