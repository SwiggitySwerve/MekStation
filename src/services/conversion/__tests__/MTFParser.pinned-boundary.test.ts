import { createHash } from 'node:crypto';

import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { UnitContract } from '@/types/contracts';

import { MTFExportService } from '../MTFExportService';
import { MTFParserService } from '../MTFParserService';
import fixtures from './MTFParser.pinned-sources.json';

// Original mm-data bytes at 50f7efef0c9f775b0258f8283525ed4f906e1985.
// Semantics: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
// MtfFile.java:293-319,358-410,414-483; equipment/ArmorType.java:384-524,669-766,1017-1167,2069.
const armorNames: Record<string, string> = {
  'Ferro-Fibrous Prototype': 'FERRO_FIBROUS_PROTO',
  'Ballistic-Reinforced': 'BALLISTIC_REINFORCED',
  'Heat-Dissipating': 'HEAT_DISSIPATING',
  'Anti-Penetrative Ablation': 'ANTI_PENETRATIVE_ABLATION',
  Patchwork: 'PATCHWORK',
  Standard: 'STANDARD',
  'Ferro-Fibrous': 'FERRO_FIBROUS',
  'Light Ferro-Fibrous': 'LIGHT_FERRO_FIBROUS',
  'Heavy Ferro-Fibrous': 'HEAVY_FERRO_FIBROUS',
  Stealth: 'STEALTH',
  Reflective: 'REFLECTIVE',
  Hardened: 'HARDENED',
  Reactive: 'REACTIVE',
  Industrial: 'INDUSTRIAL',
  'Heavy Industrial': 'HEAVY_INDUSTRIAL',
  Commercial: 'COMMERCIAL',
  Primitive: 'PRIMITIVE',
  'Ferro-Lamellor': 'FERRO_LAMELLOR',
  'Impact-Resistant': 'IMPACT_RESISTANT',
};

// Pinned Java 48fcb2f64a1b3f2d575707ce5653dad64927b587: MtfFile.java:414-531.
// Evidence: _scratch/sm-audit-reports/parity-3.2-mtf-armor-coverage/import-six/
// ArmorRoundTripProbe.java loads the same SHA-256-checked original bytes.
// Armor tech bases are absent from parser output for all six; Patchwork also
// lacks per-location types. Those import gaps are documented in REPORT.md.
const newlyAcceptedArmor = [
  // Probe output: java-Jenner JR7-K Grace.json
  {
    name: 'Jenner JR7-K Grace.mtf',
    type: 'FERRO_FIBROUS_PROTO',
    allocation: {
      HEAD: 7,
      CENTER_TORSO: {
        front: 10,
        rear: 3,
      },
      RIGHT_TORSO: {
        front: 8,
        rear: 3,
      },
      LEFT_TORSO: {
        front: 8,
        rear: 3,
      },
      RIGHT_ARM: 8,
      LEFT_ARM: 8,
      RIGHT_LEG: 11,
      LEFT_LEG: 11,
    },
  },
  // Probe output: java-Hatamoto-Godai HTM-30Z.json
  {
    name: 'Hatamoto-Godai HTM-30Z.mtf',
    type: 'BALLISTIC_REINFORCED',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: {
        rear: 10,
        front: 33,
      },
      RIGHT_TORSO: {
        rear: 8,
        front: 24,
      },
      LEFT_TORSO: {
        rear: 8,
        front: 24,
      },
      RIGHT_ARM: 22,
      LEFT_ARM: 22,
      RIGHT_LEG: 25,
      LEFT_LEG: 25,
    },
  },
  // Probe output: java-Catapult II CPLT-L7L.json
  {
    name: 'Catapult II CPLT-L7L.mtf',
    type: 'HEAT_DISSIPATING',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: {
        rear: 11,
        front: 29,
      },
      RIGHT_TORSO: {
        rear: 8,
        front: 21,
      },
      LEFT_TORSO: {
        rear: 8,
        front: 21,
      },
      RIGHT_ARM: 17,
      LEFT_ARM: 17,
      RIGHT_LEG: 22,
      LEFT_LEG: 22,
    },
  },
  // Probe output: java-Grand Dragon DRG-10K.json
  {
    name: 'Grand Dragon DRG-10K.mtf',
    type: 'ANTI_PENETRATIVE_ABLATION',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: {
        front: 27,
        rear: 10,
      },
      RIGHT_TORSO: {
        front: 22,
        rear: 6,
      },
      LEFT_TORSO: {
        front: 22,
        rear: 6,
      },
      RIGHT_ARM: 20,
      LEFT_ARM: 20,
      RIGHT_LEG: 25,
      LEFT_LEG: 25,
    },
  },
  // Probe output: java-Warhammer IIC 12.json
  {
    name: 'Warhammer IIC 12.mtf',
    type: 'HEAT_DISSIPATING',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: {
        front: 30,
        rear: 15,
      },
      RIGHT_TORSO: {
        front: 24,
        rear: 10,
      },
      LEFT_TORSO: {
        front: 24,
        rear: 10,
      },
      RIGHT_ARM: 24,
      LEFT_ARM: 24,
      RIGHT_LEG: 30,
      LEFT_LEG: 30,
    },
  },
  // Probe output: java-Zeus X ZEU-X.json
  {
    name: 'Zeus X ZEU-X.mtf',
    type: 'PATCHWORK',
    allocation: {
      HEAD: 9,
      CENTER_TORSO: {
        rear: 12,
        front: 38,
      },
      RIGHT_TORSO: {
        rear: 8,
        front: 26,
      },
      LEFT_TORSO: {
        rear: 8,
        front: 26,
      },
      RIGHT_ARM: 26,
      LEFT_ARM: 26,
      RIGHT_LEG: 34,
      LEFT_LEG: 34,
    },
  },
];

describe('pinned original-byte MTF construction boundary', () => {
  it.each(newlyAcceptedArmor)(
    'matches pinned Java armor type and points: $name',
    ({ name, type, allocation }) => {
      const source = fixtures.rows.find((row) => row.path.endsWith(`/${name}`));
      if (!source) throw new Error(`Missing pinned fixture: ${name}`);
      const bytes = Buffer.from(source.base64, 'base64');
      expect(bytes.length).toBe(source.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        source.sha256,
      );
      const parsed = new MTFParserService().parse(bytes.toString('utf8'));
      expect(parsed.success).toBe(true);
      if (!parsed.unit) throw new Error(parsed.errors.join('; '));
      expect(parsed.unit.armor.type).toBe(type);
      expect(parsed.unit.armor.allocation).toEqual(allocation);
    },
  );

  it.each([
    ['Champion C.mtf', 'CLAN_XL', 'FERRO_FIBROUS_CLAN'],
    ['Annihilator ANH-3A.mtf', 'COMPACT', 'LIGHT_FERRO_FIBROUS'],
    ['Clint CLNT-6S.mtf', 'LIGHT', 'HEAVY_FERRO_FIBROUS'],
    ['Gyrfalcon.mtf', 'CLAN_XL', 'REFLECTIVE_CLAN'],
    ['Warwolf (Prime).mtf', 'CLAN_XL', 'REACTIVE_CLAN'],
  ])(
    'preserves source construction through export: %s',
    (name, engine, armor) => {
      const source = fixtures.rows.find((row) => row.path.endsWith(`/${name}`));
      if (!source) throw new Error(`Missing pinned fixture: ${name}`);
      const bytes = Buffer.from(source.base64, 'base64');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        source.sha256,
      );
      const parser = new MTFParserService();
      const parsed = parser.parse(bytes.toString('utf8'));
      expect(parsed.success).toBe(true);
      if (!parsed.unit) throw new Error(parsed.errors.join('; '));
      expect(UnitContract.safeParse(parsed.unit).success).toBe(true);
      expect(parsed.unit.engine.type).toBe(engine);
      expect(parsed.unit.armor.type).toBe(armor);

      const exported = new MTFExportService().export(parsed.unit);
      expect(exported.success).toBe(true);
      if (!exported.content) throw new Error(exported.errors.join('; '));
      const roundtrip = parser.parse(exported.content);
      expect(roundtrip.success).toBe(true);
      expect(roundtrip.unit?.engine).toEqual(parsed.unit.engine);
      expect(roundtrip.unit?.armor.type).toBe(armor);
    },
  );

  it.each(fixtures.rows)('$path', async (source) => {
    const bytes = Buffer.from(source.base64, 'base64');
    expect(bytes.length).toBe(source.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      source.sha256,
    );
    const text = bytes.toString('utf8');
    const parsed = new MTFParserService().parse(text);
    expect(parsed.success).toBe(true);
    if (!parsed.unit) throw new Error(parsed.errors.join('; '));
    const unit = parsed.unit;
    const baseArmor = source.fields.Armor.replace(/\(.*\)$/, '').trim();
    let expectedArmor = armorNames[baseArmor];
    if (source.fields.Armor.includes('(Clan)')) {
      if (['FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE'].includes(expectedArmor)) {
        expectedArmor += '_CLAN';
      }
    }
    const unsupported =
      !expectedArmor || source.fields.Config.includes('FrankenMek');
    expect(UnitContract.safeParse(unit).success).toBe(!unsupported);
    const loaded = await loadUnitDefinition(
      { read: async () => unit },
      { source: 'custom', id: unit.id },
    );
    expect(loaded.success).toBe(!unsupported);
    const field = (name: string) =>
      text.match(new RegExp(`^${name}:(.*)$`, 'mi'))?.[1].trim();
    // The raw gyro, cockpit and heat sink tokens ride next to the derived
    // values; diagnostics appear only when the loader had to default something.
    expect(unit).toHaveProperty('mtfSource', {
      text,
      configuration: source.fields.Config,
      engine: source.fields.Engine,
      armor: source.fields.Armor,
      ...(field('gyro') ? { gyro: field('gyro') } : {}),
      ...(field('cockpit') ? { cockpit: field('cockpit') } : {}),
      ...(field('heat sinks') ? { heatSinks: field('heat sinks') } : {}),
    });
    expect(unit.mulId).toBe(Number(field('mul id')) || undefined);
    expect(unit.role).toBe(field('role') || undefined);
    expect(unit).toHaveProperty('source', field('source') || undefined);
    expect(unit.clanName).toBe(field('clanname'));
    if (field('base chassis heat sinks')) {
      expect(unit.baseChassisHeatSinks).toBe(
        Number(field('base chassis heat sinks')),
      );
    }
    if (expectedArmor) expect(unit.armor.type).toBe(expectedArmor);
    else {
      expect(unit.armor.type).toContain(source.fields.Armor);
      expect(parsed.warnings.join(' ')).toContain('Unsupported MTF armor');
    }
    if (source.fields.Config.includes('OmniMek')) {
      expect(unit.isOmni).toBe(true);
      expect(unit.configuration).toBe(
        source.fields.Config.replace(' OmniMek', ''),
      );
    }
    if (source.fields.Config.includes('FrankenMek')) {
      expect(unit.configuration).toBe(source.fields.Config);
      expect(parsed.warnings.join(' ')).toContain('FrankenMek');
    }
    if (
      source.fields.Engine.includes('XL (Clan)') &&
      !source.fields.Engine.includes('XXL')
    ) {
      expect(unit.engine.type).toBe('CLAN_XL');
    }
    if (loaded.success) {
      expect(loaded.definition.mtfSource).toEqual(
        Reflect.get(unit, 'mtfSource'),
      );
      expect(loaded.definition.isOmni).toBe(unit.isOmni);
    }
  });

  it.each(['Biped Mystery', 'Biped OmniMek Mystery', 'Biped FrankenMek'])(
    'retains unsupported configuration %s',
    (config) => {
      const result = new MTFParserService().parse(
        `chassis:Unsupported\nConfig:${config}\nmass:50`,
      );
      expect(result.unit?.configuration).toBe(config);
      expect(UnitContract.safeParse(result.unit).success).toBe(false);
    },
  );

  it('does not turn an unknown engine into fusion', () => {
    const result = new MTFParserService().parse(
      'chassis:Unsupported\nmass:50\nengine:250 Mystery Engine',
    );
    expect(result.unit?.engine.type).toContain('Mystery Engine');
    expect(UnitContract.safeParse(result.unit).success).toBe(false);
  });
});
