import { UnitContract } from '@/types/contracts';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

import { mapRulesLevel } from '../MTFParser.mapping';
import { MTFParserService } from '../MTFParserService';

// Source strings from the 4,263 pinned mm-data 50f7efe BattleMechs. Identities
// match the converter output in the committed catalog (scripts/megameklab-
// conversion/enum_mapping_tables.py reads the same JSON).
const GYRO: Array<[string, string]> = [
  ['Standard Gyro', 'STANDARD'],
  ['XL Gyro', 'XL'],
  ['Compact Gyro', 'COMPACT'],
  ['Heavy Duty Gyro', 'HEAVY_DUTY'],
  ['None', 'NONE'],
  ['Superheavy Gyro', 'SUPERHEAVY'],
  // Mek.java:187 GYRO_SHORT_STRING, accepted by the pinned loader.
  ['Standard', 'STANDARD'],
  ['XL', 'XL'],
  ['Compact', 'COMPACT'],
  ['Heavy Duty', 'HEAVY_DUTY'],
  ['Superheavy', 'SUPERHEAVY'],
];
const COCKPIT: Array<[string, string]> = [
  ['Standard Cockpit', 'STANDARD'],
  ['Small Cockpit', 'SMALL'],
  ['Industrial Cockpit', 'INDUSTRIAL'],
  ['Primitive Cockpit', 'PRIMITIVE'],
  ['Torso-Mounted Cockpit', 'TORSO_MOUNTED'],
  ['Command Console', 'COMMAND_CONSOLE'],
  ['Interface Cockpit', 'INTERFACE'],
  ['QuadVee Cockpit', 'QUADVEE'],
  ['Superheavy Tripod Cockpit', 'SUPERHEAVY_TRIPOD'],
  // The committed catalog has STANDARD here; 4.1-g.2 changes both together.
  ['Tripod Cockpit', 'STANDARD'],
  ['Superheavy Cockpit', 'SUPERHEAVY'],
  ['Primitive Industrial Cockpit', 'PRIMITIVE_INDUSTRIAL'],
  ['Virtual Reality Piloting Pod', 'VRRP'],
  ['Superheavy Industrial Cockpit', 'SUPERHEAVY_INDUSTRIAL'],
  ['Tripod Industrial Cockpit', 'TRIPOD_INDUSTRIAL'],
  ['Superheavy Tripod Industrial Cockpit', 'SUPERHEAVY_TRIPOD_INDUSTRIAL'],
  // Mek.java:224 COCKPIT_SHORT_STRING (the pinned source spells VRRP "VRPP").
  ['Torso Mounted', 'TORSO_MOUNTED'],
  ['Interface', 'INTERFACE'],
  ['VRPP', 'VRRP'],
  ['Quadvee', 'QUADVEE'],
  ['Tripod', 'STANDARD'],
];
const HEAT_SINKS: Array<[string, string]> = [
  ['Single', 'SINGLE'],
  ['Double Heat Sinks', 'DOUBLE'],
  ['IS Double', 'DOUBLE'],
  ['Clan Double', 'DOUBLE_CLAN'],
  ['Laser', 'LASER'],
  ['Compact', 'COMPACT'],
];

// parseField takes the first matching line, so the base omits anything a case
// sets (rules level included); a missing rules level reads as '2'.
function parse(extra: string[], techbase = 'Inner Sphere') {
  const result = new MTFParserService().parse(
    [
      'chassis:Vocabulary',
      'model:Test',
      'Config:Biped',
      `techbase:${techbase}`,
      'era:3050',
      'mass:50',
      'engine:200 Fusion Engine',
      'structure:IS Standard',
      ...extra,
    ].join('\n'),
  );
  if (!result.unit) throw new Error(result.errors.join('; '));
  return result;
}

describe('MTF component vocabulary', () => {
  it.each(GYRO)('gyro %s', (source, identity) => {
    expect(parse([`gyro:${source}`]).unit?.gyro).toEqual({ type: identity });
  });

  it.each(COCKPIT)('cockpit %s', (source, identity) => {
    expect(parse([`cockpit:${source}`]).unit?.cockpit).toBe(identity);
  });

  it.each(HEAT_SINKS)('heat sinks 12 %s', (source, identity) => {
    expect(parse([`heat sinks:12 ${source}`]).unit?.heatSinks).toEqual({
      type: identity,
      count: 12,
    });
  });

  it.each([
    ['1', 'INTRODUCTORY'],
    ['2', 'STANDARD'],
    ['3', 'ADVANCED'],
    ['4', 'EXPERIMENTAL'],
    ['5', 'UNOFFICIAL'],
  ])('rules level %s', (level, identity) => {
    expect(mapRulesLevel(level)).toBe(identity);
    expect(parse([`rules level:${level}`]).unit?.rulesLevel).toBe(identity);
  });

  it('keeps the existing STANDARD fallback for unreadable rules levels', () => {
    expect(mapRulesLevel('')).toBe('STANDARD');
    expect(mapRulesLevel('99')).toBe('STANDARD');
  });

  it('treats absent and empty gyro and cockpit lines as Standard', () => {
    for (const extra of [[], ['gyro:', 'cockpit:']]) {
      const { unit } = parse(extra);
      expect(unit?.gyro).toEqual({ type: 'STANDARD' });
      expect(unit?.cockpit).toBe('STANDARD');
    }
  });

  it('accepts every entry the shared file declares', () => {
    for (const [source, identity] of Object.entries(vocabulary.gyro)) {
      expect(parse([`gyro:${source}`]).unit?.gyro.type).toBe(identity);
    }
    for (const [source, identity] of Object.entries(vocabulary.cockpit)) {
      expect(parse([`cockpit:${source}`]).unit?.cockpit).toBe(identity);
    }
    for (const [source, identity] of Object.entries(vocabulary.heatSink)) {
      expect(parse([`heat sinks:10 ${source}`]).unit?.heatSinks.type).toBe(
        identity,
      );
    }
  });

  // The pinned loader never refuses a file over these three strings: it
  // substitutes a default (MtfFile.java:252-269 gyro and cockpit,
  // :366-368 and :566-598 heat sinks). The importer does the same and says so.
  describe('strings the pinned loader defaults load with that default and a warning', () => {
    // 'Heavy-Duty Gyro' is a Python-only alias, not a pinned MegaMek name.
    it.each(['Quantum Gyro', 'Heavy-Duty Gyro', 'xl gyro'])(
      'gyro %s -> Standard',
      (name) => {
        const result = parse([`gyro:${name}`]);
        expect(result.unit?.gyro.type).toBe('STANDARD');
        expect(result.warnings).toContain(
          `Unsupported MTF gyro "${name}" loaded as Standard (MtfFile.java:252-259)`,
        );
      },
    );

    it.each(['standard cockpit', 'Mystery Cockpit', 'Tiny'])(
      'cockpit %s -> Standard',
      (source) => {
        const result = parse([`cockpit:${source}`]);
        expect(result.unit?.cockpit).toBe('STANDARD');
        expect(result.warnings).toContain(
          `Unsupported MTF cockpit "${source}" loaded as Standard (MtfFile.java:262-269)`,
        );
      },
    );

    it('heat sink with no recognised keyword -> Single, keeping the count', () => {
      const result = parse(['heat sinks:14 Dissipators']);
      expect(result.unit?.heatSinks).toEqual({ type: 'SINGLE', count: 14 });
      expect(result.warnings).toContain(
        'Unsupported MTF heat sink "Dissipators" loaded as Single (MtfFile.java:566-598)',
      );
    });

    it('recognised names and valid defaults add no warning', () => {
      for (const extra of [
        ['gyro:XL Gyro', 'cockpit:Small Cockpit', 'heat sinks:10 IS Double'],
        ['heat sinks:10 Single'],
        ['gyro:', 'cockpit:'],
        [],
      ]) {
        expect(parse(extra).warnings).toEqual([]);
      }
    });
  });

  // MtfFile.java:566-598: contains Laser, else Double (Clan or IS from the
  // text, otherwise the unit's own tech base), else Compact, else Single.
  describe('heat sink keywords follow the pinned loader', () => {
    it.each([
      ['Laser Heat Sink', 'Inner Sphere', 'LASER'],
      ['Double Heat Sinks', 'Inner Sphere', 'DOUBLE'],
      ['Clan Double Heat Sink', 'Inner Sphere', 'DOUBLE_CLAN'],
      ['IS Double Heat Sink', 'Clan', 'DOUBLE'],
      ['Double', 'Clan', 'DOUBLE_CLAN'],
      ['Double', 'Mixed (Clan Chassis)', 'DOUBLE_CLAN'],
      ['Double', 'Mixed (IS Chassis)', 'DOUBLE'],
      ['Double Laser', 'Inner Sphere', 'LASER'],
      ['Compact Heat Sink', 'Inner Sphere', 'COMPACT'],
    ])('%s on %s -> %s', (name, techbase, identity) => {
      const result = parse([`heat sinks:12 ${name}`], techbase);
      expect(result.unit?.heatSinks.type).toBe(identity);
      expect(result.warnings).toEqual([]);
    });
  });

  // MtfFile.java:262-269 + Mek.getCockpitTypeForString (Mek.java:4935-4950):
  // exact full or short name first, then the first index whose full or short
  // name is a prefix. This is how the writer's " (Adv. FCS)" suffix reads back,
  // quirks included (the short "Superheavy" and "Primitive" win by index).
  describe('cockpit prefix matching follows the pinned loader', () => {
    it.each([
      ['Industrial Cockpit (Adv. FCS)', 'INDUSTRIAL'],
      ['Primitive Industrial Cockpit (Adv. FCS)', 'PRIMITIVE'],
      ['Superheavy Industrial Cockpit (Adv. FCS)', 'SUPERHEAVY'],
      ['Superheavy Tripod Industrial Cockpit (Adv. FCS)', 'SUPERHEAVY'],
      // Tripod Cockpit is the catalog's STANDARD until 4.1-g.2.
      ['Tripod Industrial Cockpit (Adv. FCS)', 'STANDARD'],
      ['Small Cockpit (prototype)', 'SMALL'],
    ])('%s -> %s', (source, identity) => {
      const result = parse([`cockpit:${source}`]);
      expect(result.unit?.cockpit).toBe(identity);
      expect(result.warnings).toEqual([]);
    });

    // Java loads these as real types the contract cannot hold yet, so the
    // importer keeps an explicit diagnostic until 4.1-g.2 extends CockpitType.
    it.each([
      'Dual Cockpit',
      'Small Command Console',
      'Superheavy Command Console',
      'Dual',
    ])(
      'Java-valid but unrepresentable %s keeps an unsupported diagnostic',
      (source) => {
        const result = parse([`cockpit:${source}`]);
        expect(result.unit?.cockpit).toBe(`UNSUPPORTED_COCKPIT:${source}`);
        expect(result.warnings).toContain(`Unsupported MTF cockpit: ${source}`);
        expect(UnitContract.safeParse(result.unit).success).toBe(false);
      },
    );
  });
});
