import vocabulary from '@/types/formats/mtf-component-vocabulary.json';

import { UnitContract } from '@/types/contracts';

import { MTFParserService } from '../MTFParserService';
import { mapRulesLevel } from '../MTFParser.mapping';

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
];
const HEAT_SINKS: Array<[string, string]> = [
  ['Single', 'SINGLE'],
  ['Double', 'DOUBLE'],
  ['IS Double', 'DOUBLE'],
  ['Clan Double', 'DOUBLE_CLAN'],
  ['Laser', 'LASER'],
  ['Compact', 'COMPACT'],
];

function parse(extra: string[]) {
  const result = new MTFParserService().parse(
    [
      'chassis:Vocabulary',
      'model:Test',
      'Config:Biped',
      'techbase:Inner Sphere',
      'era:3050',
      'rules level:2',
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
    it('gyro', () => {
      const result = parse(['gyro:Quantum Gyro']);
      expect(result.unit?.gyro.type).toBe('UNSUPPORTED_GYRO:Quantum Gyro');
      expect(result.warnings).toContain('Unsupported MTF gyro: Quantum Gyro');
      expect(UnitContract.safeParse(result.unit).success).toBe(false);
    });

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
