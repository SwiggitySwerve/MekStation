import { createHash } from 'crypto';
/** Source conversion boundary and real BV paths; the comparator owns all comparisons. */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import type { IUnitValidateResult } from '../src/types/unit/UnitTypeHandler';

import { BlkParserService } from '../src/services/conversion/BlkParserService';
import { BattleArmorUnitHandler } from '../src/services/units/handlers/BattleArmorUnitHandler';
import { InfantryUnitHandler } from '../src/services/units/handlers/InfantryUnitHandler';
import {
  areHandlersInitialized,
  initializeUnitTypeHandlers,
} from '../src/services/units/handlers/initializeHandlers';
import { ProtoMechUnitHandler } from '../src/services/units/handlers/ProtoMechUnitHandler';
import {
  getUnitTypeRegistry,
  UnitTypeRegistry,
} from '../src/services/units/UnitTypeRegistry';
import { UnitContract } from '../src/types/contracts/generated/unit.zod';
import {
  getUnitCategory,
  UnitCategory,
} from '../src/types/unit/UnitTypeHandler';
import { battleArmorBVTerms } from '../src/utils/construction/battlearmor/battleArmorBV';
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
import { protoMechBVTerms } from '../src/utils/construction/protomech';
import {
  buildDeltaReport,
  JavaReference,
  sourceKey,
  type IComputedRow,
  type IFigure,
} from './unit-bv-parity';
import {
  readJsonLines,
  readTrustedReferences,
  validateSourceManifest,
} from './unit-bv-provenance';
import { ReferenceTrustMode } from './unit-bv-reference';
import { buildValidityReport } from './unit-construction-validity';
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
export function captureConstructionValidity(
  validate: () => IUnitValidateResult,
): NonNullable<IComputedRow['constructionValidity']> {
  try {
    return validate();
  } catch (error) {
    return { failure: String(error) };
  }
}
export function calculateRow(
  raw: unknown,
  includeConstruction = false,
): IComputedRow {
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
          ...(includeConstruction
            ? {
                constructionValidity: captureConstructionValidity(() =>
                  handler.validate(parsed.data.unit),
                ),
              }
            : {}),
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
                ...battleArmorBVTerms(result.breakdown),
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
        ...(includeConstruction
          ? {
              constructionValidity: captureConstructionValidity(() =>
                handler.validate(parsed.data.unit),
              ),
            }
          : {}),
        figure: {
          total: b.final,
          defensive: b.defensiveBV,
          offensive: b.offensiveBV,
          terms: numericTerms(protoMechBVTerms(b)),
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
function captureVehicleValidity(
  bytes: Buffer,
): NonNullable<IComputedRow['constructionValidity']> {
  return captureConstructionValidity(() => {
    let stage = 'vehicle-source-parser';
    try {
      const document = new BlkParserService().parse(bytes.toString('utf8'));
      if (!document.success) throw new Error(JSON.stringify(document.error));
      stage = 'vehicle-handler-unavailable';
      if (!areHandlersInitialized()) initializeUnitTypeHandlers();
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      );
      if (!handler) throw new Error(document.data.document.unitType);
      stage = 'vehicle-out-of-scope';
      if (getUnitCategory(handler.unitType) !== UnitCategory.VEHICLE)
        throw new Error(`Public handler category: ${handler.category}`);
      stage = 'vehicle-handler-parser';
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      stage = 'vehicle-validator';
      return handler.validate(parsed.data.unit);
    } catch (error) {
      throw new Error(`${stage}: ${String(error)}`);
    }
  });
}
export function calculateSources(
  raws: readonly unknown[],
  mekfiles: string,
  includeConstruction = false,
): IComputedRow[] {
  return raws.map((raw) => {
    const row = Input.parse(raw);
    const file = path.resolve(mekfiles, row.path);
    const relative = path.relative(mekfiles, file);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`Source escapes pin: ${row.path}`);
    const bytes = fs.readFileSync(file);
    const hash = sourceHash(bytes);
    if (hash !== row.sha256)
      throw new Error(`Source hash mismatch: ${row.path}`);
    if (
      row.sourceText !== undefined &&
      sourceHash(Buffer.from(row.sourceText)) !== hash
    )
      throw new Error(`Source text hash mismatch: ${row.path}`);
    const computed = calculateRow(row, includeConstruction);
    return includeConstruction &&
      computed.constructionValidity === undefined &&
      row.path.endsWith('.blk')
      ? { ...computed, constructionValidity: captureVehicleValidity(bytes) }
      : computed;
  });
}
export function writeDeltaReport(
  report: ReturnType<typeof buildDeltaReport>,
  out: string,
): void {
  fs.mkdirSync(out, { recursive: true });
  const { rows, ...summary } = report;
  fs.writeFileSync(
    path.join(out, 'delta-report.json'),
    JSON.stringify(summary, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(out, 'delta-rows.jsonl'),
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
  process.stdout.write(JSON.stringify(summary.byFamily, null, 2) + '\n');
}
export function main(): void {
  const arg = (name: string) => {
    const index = process.argv.indexOf(name);
    if (index < 0 || !process.argv[index + 1])
      throw new Error(`Missing ${name}`);
    return process.argv[index + 1];
  };
  const convertedFile = arg('--converted');
  validateSourceManifest(convertedFile, fs.readFileSync(convertedFile));
  const optionalArg = (name: string): string | undefined =>
    process.argv.includes(name) ? arg(name) : undefined;
  const references = readTrustedReferences(
    arg('--reference'),
    optionalArg('--reference-policy'),
    arg('--out'),
    ReferenceTrustMode.parse(optionalArg('--reference-trust')),
  );
  const includeConstruction = process.argv.includes('--construction-validity');
  const converted = calculateSources(
    readJsonLines(arg('--converted')),
    path.resolve(arg('--mekfiles')),
    includeConstruction,
  );
  const report = buildDeltaReport(
    converted,
    references.map((row) => JavaReference.parse(row)),
    undefined,
    process.argv.includes('--per-term'),
  );
  writeDeltaReport(report, arg('--out'));
  process.exitCode = report.ok ? 0 : 1;
  if (includeConstruction) {
    const { rows, ...summary } = buildValidityReport(converted, references);
    const out = arg('--out');
    fs.writeFileSync(
      path.join(out, 'construction-validity-report.json'),
      JSON.stringify(summary, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(out, 'construction-validity-rows.jsonl'),
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    if (!summary.ok) process.exitCode = 1;
  }
}

export * from './unit-bv-parity';
export { readJsonLines } from './unit-bv-provenance';

if (require.main === module) {
  try {
    main();
  } catch (error: unknown) {
    process.stderr.write(String(error) + '\n');
    process.exitCode = 1;
  }
}
