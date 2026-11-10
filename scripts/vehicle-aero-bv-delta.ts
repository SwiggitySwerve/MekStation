import { createHash } from 'crypto';
/** Source conversion boundary and real BV paths; the comparator owns all comparisons. */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import type { IUnitValidateResult } from '../src/types/unit/UnitTypeHandler';

import { BlkParserService } from '../src/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '../src/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '../src/services/equipment/EquipmentRegistry';
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
import { withProtoMechNativeIndices } from '../src/utils/construction/protomech/nativeTraceEnrichment';
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
import {
  buildQuantityReport,
  captureConstructionQuantities,
} from './unit-construction-quantities';
import {
  buildValidityReport,
  captureMechValidity,
} from './unit-construction-validity';
import {
  buildWeightReport,
  captureConstructionWeights,
} from './unit-construction-weights';
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
      const b = withProtoMechNativeIndices(
        handler.calculateBVBreakdown(parsed.data.unit),
        parsed.data.unit.equipment,
      );
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
// Vehicle, aerospace and capital BLK all validate through the public handler
// the registry selects for the document; a folder name never classifies it.
function captureBlkValidity(
  bytes: Buffer,
): NonNullable<IComputedRow['constructionValidity']> {
  return captureConstructionValidity(() => {
    let stage = 'blk-source-parser';
    try {
      const document = new BlkParserService().parse(bytes.toString('utf8'));
      if (!document.success) throw new Error(JSON.stringify(document.error));
      stage = 'blk-handler-unavailable';
      if (!areHandlersInitialized()) initializeUnitTypeHandlers();
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      );
      if (!handler) throw new Error(document.data.document.unitType);
      stage = 'blk-handler-parser';
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      stage = 'blk-validator';
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
  includeWeights = false,
  includeQuantities = false,
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
    // Weight terms and verifier quantities ride along without touching any
    // other field of the row; one weight capture feeds both comparators.
    const withWeights = (value: IComputedRow): IComputedRow => {
      if (!includeWeights && !includeQuantities) return value;
      const weights = captureConstructionWeights(row, bytes);
      return {
        ...value,
        ...(includeWeights ? { constructionWeights: weights } : {}),
        ...(includeQuantities
          ? {
              constructionQuantities: captureConstructionQuantities(
                row,
                bytes,
                weights,
              ),
            }
          : {}),
      };
    };
    if (!includeConstruction || computed.constructionValidity !== undefined)
      return withWeights(computed);
    // Validity is independent of whether the BV path could use the row.
    if (row.path.endsWith('.blk'))
      return withWeights({
        ...computed,
        constructionValidity: captureBlkValidity(bytes),
      });
    if (row.path.endsWith('.mtf'))
      return withWeights({
        ...computed,
        constructionValidity: captureConstructionValidity(() =>
          captureMechValidity(row.unit, row.path),
        ),
      });
    return withWeights(computed);
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
/**
 * Weight validity resolves mounted mass through the equipment catalog. Without
 * it a design with unresolved mass still loads and validates as if that mass
 * were absent (Ajax C, Lightning CX-3 and Kalki read as valid), so the catalog
 * loads before any row is validated, only under the opt-in flag, and a silent
 * fallback to the hardcoded catalog stops the run instead of changing results.
 */
export async function prepareConstructionValidity(
  argv: readonly string[] = process.argv,
): Promise<void> {
  if (
    !argv.includes('--construction-validity') &&
    !argv.includes('--construction-weights') &&
    !argv.includes('--construction-quantities')
  )
    return;
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
  const load = getEquipmentLookupService().getLoadResult();
  if (
    getEquipmentLookupService().getDataSource() !== 'json' ||
    !getEquipmentRegistry().isReady() ||
    !load?.success ||
    load.itemsLoaded === 0
  )
    throw new Error('Equipment catalog unavailable for construction validity');
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
  const { rows: references, identity: referenceIdentity } =
    readTrustedReferences(
      arg('--reference'),
      optionalArg('--reference-policy'),
      arg('--out'),
      ReferenceTrustMode.parse(optionalArg('--reference-trust')),
      true,
    );
  const includeConstruction = process.argv.includes('--construction-validity');
  const includeWeights = process.argv.includes('--construction-weights');
  const includeQuantities = process.argv.includes('--construction-quantities');
  const converted = calculateSources(
    readJsonLines(arg('--converted')),
    path.resolve(arg('--mekfiles')),
    includeConstruction,
    includeWeights,
    includeQuantities,
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
  if (includeWeights) {
    const extraFile = optionalArg('--weight-terms-extra');
    const sha256 = (file: string) =>
      createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const { rows, ...summary } = buildWeightReport(
      converted,
      references,
      undefined,
      extraFile ? readJsonLines(extraFile) : [],
    );
    const out = arg('--out');
    fs.writeFileSync(
      path.join(out, 'construction-weight-report.json'),
      JSON.stringify(
        {
          ...summary,
          referenceSha256: sha256(arg('--reference')),
          extraInputSha256: extraFile ? sha256(extraFile) : null,
        },
        null,
        2,
      ) + '\n',
    );
    fs.writeFileSync(
      path.join(out, 'construction-weight-rows.jsonl'),
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    if (!summary.ok) process.exitCode = 1;
  }
  if (includeQuantities) {
    const extraFile = optionalArg('--weight-terms-extra');
    const sha256 = (file: string) =>
      createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const { rows, ...summary } = buildQuantityReport(
      converted,
      references,
      undefined,
      undefined,
      extraFile ? readJsonLines(extraFile) : [],
      referenceIdentity,
    );
    const out = arg('--out');
    fs.writeFileSync(
      path.join(out, 'construction-quantity-report.json'),
      JSON.stringify(
        {
          ...summary,
          referenceSha256: sha256(arg('--reference')),
          extraInputSha256: extraFile ? sha256(extraFile) : null,
        },
        null,
        2,
      ) + '\n',
    );
    fs.writeFileSync(
      path.join(out, 'construction-quantity-rows.jsonl'),
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    if (!summary.ok) process.exitCode = 1;
  }
}

export * from './unit-bv-parity';
export { readJsonLines } from './unit-bv-provenance';

if (require.main === module) {
  prepareConstructionValidity()
    .then(() => main())
    .catch((error: unknown) => {
      process.stderr.write(String(error) + '\n');
      process.exitCode = 1;
    });
}
