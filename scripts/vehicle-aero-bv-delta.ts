import { createHash } from 'crypto';
/** Source conversion boundary and real BV paths; the comparator owns all comparisons. */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { BlkParserService } from '../src/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '../src/services/units/handlers/BattleArmorUnitHandler';
import { InfantryUnitHandler } from '../src/services/units/handlers/InfantryUnitHandler';
import { ProtoMechUnitHandler } from '../src/services/units/handlers/ProtoMechUnitHandler';
import { UnitTypeRegistry } from '../src/services/units/UnitTypeRegistry';
import { UnitContract } from '../src/types/contracts/generated/unit.zod';
import { calculateBattleValueForUnit } from '../src/utils/construction/battleValueCalculations';
import {
  calculateUnitBV as runtimeBV,
  type UnitData as RuntimeUnitData,
} from '../src/utils/construction/bvAdapter';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../src/utils/construction/contractBVUnitAdapter';
import { mechBVTerms } from '../src/utils/construction/mechBV/bvTrace';
import {
  buildDeltaReport,
  JavaReference,
  sourceKey,
  type IComputedRow,
  type IFigure,
} from './unit-bv-parity';
import { calculateUnitBV as gateBV } from './validate-bv-calculator';

const Mech = UnitContract.options[0];
const Contract = UnitContract.options[1];
const personnel = new UnitTypeRegistry();
const numericTerms = (value: object): NonNullable<IFigure['terms']> => {
  const terms = Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
  return {
    ...terms,
    structureBV: terms.structureBV ?? terms.siBV,
    explosivePenalty: terms.explosivePenalty ?? terms.explosivePenalties,
    weaponBV:
      terms.weaponBV ??
      (terms.weaponFirePoolBV !== undefined &&
      terms.fuselageWeaponBV !== undefined
        ? terms.weaponFirePoolBV + terms.fuselageWeaponBV
        : undefined),
  };
};
personnel.register(new BattleArmorUnitHandler());
personnel.register(new InfantryUnitHandler());
const Input = z.object({
  ...sourceKey,
  unit: z.unknown(),
  reason: z.string().optional(),
  sourceText: z.string().optional(),
});
export function sourceHash(bytes: Buffer): string {
  return createHash('sha256')
    .update(
      bytes.filter((byte, index) => byte !== 13 || bytes[index + 1] !== 10),
    )
    .digest('hex');
}
export function calculateRow(raw: unknown): IComputedRow {
  const input = Input.parse(raw);
  try {
    if (input.sourceText !== undefined) {
      const document = new BlkParserService().parse(input.sourceText);
      if (!document.success) throw new Error(document.error.errors.join('; '));
      if (!input.path.startsWith('protomeks/')) {
        const handler = personnel.getHandlerForDocument(document.data.document);
        if (!handler) throw new Error('No source handler');
        const parsed = handler.parse(document.data.document);
        if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
        // Parser -> handler -> shared dispatcher, as the BA and infantry BV lanes measured.
        const result = calculateBattleValueForUnit(parsed.data.unit);
        const base = {
          path: input.path,
          sha256: input.sha256,
          handlerTotal: handler.calculateBV(parsed.data.unit),
        };
        if (result?.kind === 'battlearmor')
          return {
            ...base,
            runtimeTotal: result.breakdown.final,
            figure: {
              total: result.breakdown.final,
              defensive: result.breakdown.defensive,
              offensive: result.breakdown.offensive,
              terms: numericTerms({
                ...result.breakdown,
                ...result.breakdown.perTrooper.defensive,
                ...result.breakdown.perTrooper.offensive,
              }),
            },
          };
        if (result?.kind === 'infantry')
          return {
            ...base,
            runtimeTotal: result.breakdown.final,
            figure: {
              total: result.breakdown.final,
              defensive: result.breakdown.defensiveBV,
              offensive: result.breakdown.platoonBV,
              terms: {
                ...numericTerms(result.breakdown),
                ammoBV: result.breakdown.fieldGunAmmoBV,
                speedFactor: result.breakdown.motiveMultiplier,
              },
            },
          };
        throw new Error('Source dispatcher returned no BA or infantry result');
      }
      const handler = new ProtoMechUnitHandler();
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const b = handler.calculateBVBreakdown(parsed.data.unit);
      return {
        path: input.path,
        sha256: input.sha256,
        figure: {
          total: b.final,
          defensive: b.defensiveBV,
          offensive: b.offensiveBV,
          terms: numericTerms(b),
        },
      };
    }
    if (input.unit == null)
      return { ...input, reason: input.reason ?? 'Converter produced no unit' };
    if (input.path.startsWith('meks/')) {
      const unit = Mech.parse(input.unit);
      if (!unit.armor.allocation)
        throw new Error('Mech armor allocation missing');
      if (unit.engine.rating === undefined)
        throw new Error('Mech engine rating missing');
      const engine = { ...unit.engine, rating: unit.engine.rating };
      const result = gateBV(
        {
          ...unit,
          engine,
          armor: { ...unit.armor, allocation: unit.armor.allocation },
        },
        unit.id,
      );
      // The runtime adapter accepts historical location maps and returns zero
      // for shapes it cannot use; retain that behavior in the separate result.
      const runtimeTotal = runtimeBV({
        ...unit,
        engine,
        armor: {
          ...unit.armor,
          allocation: unit.armor
            .allocation as RuntimeUnitData['armor']['allocation'],
        },
      });
      return {
        ...input,
        figure: {
          total: result.bv,
          defensive: result.breakdown?.defensiveBV ?? NaN,
          offensive: result.breakdown?.offensiveBV ?? NaN,
          terms: result.breakdown
            ? numericTerms(mechBVTerms(result.breakdown))
            : undefined,
        },
        runtimeTotal,
      };
    }
    const unit = Contract.parse(input.unit);
    if (unit.tonnage === undefined || !unit.movement || !unit.armor)
      throw new Error('BV contract requires tonnage, movement and armor');
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        ...unit,
        tonnage: unit.tonnage,
        armor: unit.armor,
        // The public adapter validates required subtype-specific motion facts;
        // the generated contract preserves them as open movement properties.
        movement: unit.movement as IContractBVSource['movement'],
      }),
    );
    if (!result || result.kind === 'infantry' || result.kind === 'protomech')
      return { ...input, reason: 'BV dispatcher returned no result' };
    const b = result.breakdown;
    const figure: IFigure = {
      total: b.final,
      defensive: b.defensive,
      offensive: b.offensive,
      terms: numericTerms(b),
      ...('calculationScope' in b && b.calculationScope === 'defensive-only'
        ? { calculationScope: 'defensive-only' as const }
        : {}),
    };
    return { ...input, figure };
  } catch (error) {
    return { path: input.path, sha256: input.sha256, reason: String(error) };
  }
}
const read = (file: string): unknown[] =>
  fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as unknown);
export function main(): void {
  const arg = (name: string) => {
    const index = process.argv.indexOf(name);
    if (index < 0 || !process.argv[index + 1])
      throw new Error(`Missing ${name}`);
    return process.argv[index + 1];
  };
  const mekfiles = path.resolve(arg('--mekfiles'));
  const converted = read(arg('--converted')).map((raw) => {
    const row = Input.parse(raw);
    const file = path.resolve(mekfiles, row.path);
    const relative = path.relative(mekfiles, file);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`Source escapes pin: ${row.path}`);
    const hash = sourceHash(fs.readFileSync(file));
    if (hash !== row.sha256)
      throw new Error(`Source hash mismatch: ${row.path}`);
    if (
      row.sourceText !== undefined &&
      sourceHash(Buffer.from(row.sourceText)) !== hash
    )
      throw new Error(`Source text hash mismatch: ${row.path}`);
    return calculateRow(row);
  });
  const report = buildDeltaReport(
    converted,
    read(arg('--reference')).map((row) => JavaReference.parse(row)),
    undefined,
    process.argv.includes('--per-term'),
  );
  fs.mkdirSync(arg('--out'), { recursive: true });
  const { rows, ...summary } = report;
  fs.writeFileSync(
    path.join(arg('--out'), 'delta-report.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(arg('--out'), 'delta-rows.jsonl'),
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
  process.stdout.write(JSON.stringify(summary.byFamily, null, 2) + '\n');
  process.exitCode = report.ok ? 0 : 1;
}

export * from './unit-bv-parity';

if (require.main === module) {
  try {
    main();
  } catch (error: unknown) {
    process.stderr.write(String(error) + '\n');
    process.exitCode = 1;
  }
}
