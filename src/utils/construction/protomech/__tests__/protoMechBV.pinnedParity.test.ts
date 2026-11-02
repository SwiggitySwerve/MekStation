/**
 * Pinned MegaMek 48fcb2f6 ProtoMek BV on real mm-data sources (UL-16b oracle).
 * Java totals are the oracle `battleValue.total` (ignoreC3, ignoreSkill, ignoreTAG).
 * @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md
 */
import * as fs from 'fs';
import * as path from 'path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { resolveAmmoBV } from '@/utils/construction/equipmentBVResolver';
import { PROTO_AMMO_STOPGAP } from '@/utils/construction/protomech/protoMechAmmo';

const parser = new BlkParserService();
const handler = new ProtoMechUnitHandler();

/** Gameplay fields of the pinned BLK; prose sections are dropped. */
function blk(fields: Record<string, string>): string {
  return Object.entries({
    UnitType: 'ProtoMek',
    type: 'Clan Level 2',
    ...fields,
  })
    .map(([tag, value]) => `<${tag}>\n${value}\n</${tag}>`)
    .join('\n');
}

function dispatcherBV(text: string) {
  const parsed = parser.parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  const unit = result.data.unit;
  const dispatched = calculateBattleValueForUnit(unit);
  if (dispatched?.kind !== 'protomech') throw new Error('not dispatched');
  return {
    dispatched: dispatched.breakdown,
    handler: handler.calculateBV(unit),
  };
}

const CENTAUR_2 = blk({
  Name: 'Centaur',
  Model: '2',
  year: '3063',
  motion_type: 'Biped',
  cruiseMP: '6',
  jumpingMP: '0',
  armor: '3\n7\n2\n2\n4\n3',
  tonnage: '5.0',
  'Body Equipment': 'Clan Ammo SRM-2 (10)\nEIInterface',
  'Torso Equipment': 'CLSRM2',
  'Main Gun Equipment': 'CLHeavySmallLaser',
});
const CENTAUR_4 = blk({
  Name: 'Centaur',
  Model: '4',
  year: '3071',
  motion_type: 'Biped',
  cruiseMP: '6',
  jumpingMP: '0',
  armor: '4\n10\n2\n2\n6\n3',
  tonnage: '5.0',
  'Body Equipment':
    'Clan Ammo SRM-1 (20)\nCLMyomerBooster\nCLAPGaussRifle Ammo (13)\nEIInterface',
  'Torso Equipment': 'CLSRM1\nCLSRM1',
  'Main Gun Equipment': 'CLAPGaussRifle',
});
const GORGON_3 = blk({
  Name: 'Gorgon',
  Model: '3',
  year: '3066',
  motion_type: 'Biped',
  cruiseMP: '5',
  jumpingMP: '0',
  armor: '4\n16\n4\n4\n10',
  tonnage: '8.0',
  'Body Equipment': 'Clan Ammo SRM-4 (20)\nEIInterface',
  'Torso Equipment': 'CLSRM4\nCLSRM4',
});

describe('ProtoMek dispatcher Run (Entity.getRunMP, ProtoMek.java:612-627)', () => {
  it.each([
    ['Centaur 2', CENTAUR_2],
    ['Centaur 4 (Myomer Booster, Run 12)', CENTAUR_4],
    ['Gorgon 3', GORGON_3],
  ])('returns a finite BV equal to the handler for %s', (_name, text) => {
    const { dispatched, handler: handlerBV } = dispatcherBV(text);
    expect(Number.isFinite(dispatched.final)).toBe(true);
    expect(dispatched.final).toBe(handlerBV);
  });

  it('derives Run as ceil(1.5 x Walk), or 2 x Walk with the booster', () => {
    expect(dispatcherBV(CENTAUR_2).dispatched.speedFactor).toBe(1.5); // Run 9
    expect(dispatcherBV(CENTAUR_4).dispatched.speedFactor).toBe(1.89); // Run 12
  });
});

describe('ProtoMek ammo BV (ProtoMekBVCalculator.getAmmoBV, AmmoType.getKgPerShotBV)', () => {
  it.each([
    ['Centaur 2: SRM-2 (10) = 20 kg x 10 / 1000 x 3 = 0.6', CENTAUR_2, 154],
    ['Centaur 4: SRM-1 (20) and AP Gauss (13)', CENTAUR_4, 227],
    ['Gorgon 3: SRM-4 (20) = 40 kg x 20 / 1000 x 5 = 4', GORGON_3, 285],
  ])('matches the Java total: %s', (_name, text, java) => {
    expect(dispatcherBV(text).handler).toBe(java);
  });

  it('prices ammo per kilogram of shots, not per ton bin', () => {
    expect(dispatcherBV(GORGON_3).dispatched.ammoBV).toBeCloseTo(4, 10);
  });
});

describe('ProtoMek ammo stopgap table vs the equipment catalog', () => {
  it.each(Object.entries(PROTO_AMMO_STOPGAP))(
    '%s agrees with the catalog entry it resolves to',
    (name, [, bv]) => {
      const catalog = resolveAmmoBV(name);
      if (catalog.resolved) expect(catalog.battleValue).toBe(bv);
    },
  );
});

// The full 86-source sweep needs the pinned mm-data checkout; it runs where the
// path is set (UL-16b evidence runs) and is skipped elsewhere.
const MEKFILES = process.env.PBV_MEKFILES;
const ORACLE = process.env.PBV_ORACLE;
(MEKFILES && ORACLE ? describe : describe.skip)(
  'all 86 pinned ProtoMeks',
  () => {
    it('dispatcher returns a finite BV equal to the handler for every source', () => {
      const rows = fs
        .readFileSync(ORACLE as string, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('{') && line.includes('"protomeks/'))
        .map((line) => JSON.parse(line) as { path: string })
        .filter((row) => row.path.startsWith('protomeks/'));
      expect(rows).toHaveLength(86);
      for (const row of rows) {
        const text = fs.readFileSync(
          path.join(MEKFILES as string, row.path),
          'utf8',
        );
        const { dispatched, handler: handlerBV } = dispatcherBV(text);
        expect([row.path, Number.isFinite(dispatched.final)]).toEqual([
          row.path,
          true,
        ]);
        expect([row.path, dispatched.final]).toEqual([row.path, handlerBV]);
      }
    });
  },
);
