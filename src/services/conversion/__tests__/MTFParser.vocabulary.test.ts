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
  // Mek.java:4879-4894: the writer appends this to every industrial cockpit.
  ['Industrial Cockpit (Adv. FCS)', 'INDUSTRIAL'],
  ['Primitive Industrial Cockpit (Adv. FCS)', 'PRIMITIVE_INDUSTRIAL'],
  ['Superheavy Industrial Cockpit (Adv. FCS)', 'SUPERHEAVY_INDUSTRIAL'],
  ['Tripod Industrial Cockpit (Adv. FCS)', 'TRIPOD_INDUSTRIAL'],
  [
    'Superheavy Tripod Industrial Cockpit (Adv. FCS)',
    'SUPERHEAVY_TRIPOD_INDUSTRIAL',
  ],
  // Mek.java:224 COCKPIT_SHORT_STRING (the pinned source spells VRRP "VRPP").
  ['Torso Mounted', 'TORSO_MOUNTED'],
  ['Interface', 'INTERFACE'],
  ['VRPP', 'VRRP'],
  ['Quadvee', 'QUADVEE'],
  ['Tripod', 'STANDARD'],
];
const HEAT_SINKS: Array<[string, string]> = [
  ['Single', 'SINGLE'],
  ['Double', 'DOUBLE'],
  ['IS Double', 'DOUBLE'],
  ['Clan Double', 'DOUBLE_CLAN'],
  ['Laser', 'LASER'],
  ['Compact', 'COMPACT'],
];

// parseField takes the first matching line, so the base omits anything a case
// sets (rules level included); a missing rules level reads as '2'.
function parse(extra: string[]) {
  const result = new MTFParserService().parse(
    [
      'chassis:Vocabulary',
      'model:Test',
      'Config:Biped',
      'techbase:Inner Sphere',
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

  describe('unknown values keep a diagnostic instead of a valid-looking default', () => {
    // 'Heavy-Duty Gyro' is a Python-only alias, not a pinned MegaMek name.
    it.each(['Quantum Gyro', 'Heavy-Duty Gyro', 'xl gyro'])(
      'gyro %s',
      (name) => {
        const result = parse([`gyro:${name}`]);
        expect(result.unit?.gyro.type).toBe(`UNSUPPORTED_GYRO:${name}`);
        expect(result.warnings).toContain(`Unsupported MTF gyro: ${name}`);
        expect(UnitContract.safeParse(result.unit).success).toBe(false);
      },
    );

    it.each(['Dual Cockpit', 'Small Command Console', 'standard cockpit'])(
      'cockpit %s',
      (source) => {
        const result = parse([`cockpit:${source}`]);
        expect(result.unit?.cockpit).toBe(`UNSUPPORTED_COCKPIT:${source}`);
        expect(result.warnings).toContain(`Unsupported MTF cockpit: ${source}`);
        expect(UnitContract.safeParse(result.unit).success).toBe(false);
      },
    );

    it('heat sinks, keeping the declared count', () => {
      const result = parse(['heat sinks:14 Dissipators']);
      expect(result.unit?.heatSinks).toEqual({
        type: 'UNSUPPORTED_HEAT_SINK:Dissipators',
        count: 14,
      });
      expect(result.warnings).toContain(
        'Unsupported MTF heat sink: Dissipators',
      );
      expect(UnitContract.safeParse(result.unit).success).toBe(false);
    });
  });
});
