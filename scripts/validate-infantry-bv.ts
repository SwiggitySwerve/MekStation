#!/usr/bin/env npx tsx
/**
 * Infantry BV Parity Harness
 *
 * Emits `validation-output/infantry-bv-validation-report.json` per the
 * add-infantry-battle-value spec delta. The harness loads every conventional
 * infantry unit JSON from `public/data/units/infantry/`, runs the unified
 * `calculateBattleValueForUnit` dispatcher, and captures the returned
 * `IInfantryBVBreakdown` alongside any MUL BV present on the fixture.
 *
 * MegaMekLab parity is deferred until a full infantry MUL extract is seeded
 * (mirrors the Wave 1 deferral used by the vehicle and aerospace harnesses).
 * Fixture JSONs may include a `mulBV` field; when present, the harness
 * computes `delta = computedBV - mulBV` and `deltaPct`. When `mulBV` is
 * absent (or `null`), delta fields are emitted as `null` so the report shape
 * remains stable for downstream tooling.
 *
 * Usage:
 *   npm run validate:infantry
 *   # or
 *   npx tsx scripts/validate-infantry-bv.ts
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IInfantryBVBreakdown } from '../src/utils/construction/infantry/infantryBV';

import { SquadMotionType } from '../src/types/unit/BaseUnitInterfaces';
import { UnitType } from '../src/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  type IInfantry,
  type IInfantryFieldGun,
} from '../src/types/unit/PersonnelInterfaces';
import { calculateBattleValueForUnit } from '../src/utils/construction/battleValueCalculations';

// =============================================================================
// Report types
// =============================================================================

/**
 * One platoon entry in the parity report.
 *
 * `mulBV`, `delta`, and `deltaPct` are nullable. When a fixture carries a
 * `mulBV` field, the harness populates `delta` (= computed − MUL) and
 * `deltaPct` (= delta / mulBV × 100, guarded against division-by-zero).
 */
interface PlatoonReportEntry {
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly computedBV: number;
  readonly mulBV: number | null;
  readonly delta: number | null;
  readonly deltaPct: number | null;
  readonly breakdown: IInfantryBVBreakdown;
}

interface InfantryBVReport {
  readonly version: string;
  readonly generatedAt: string;
  readonly totalPlatoons: number;
  readonly parityCoverage: {
    readonly withMulBV: number;
    readonly withinOnePercent: number;
    readonly withinFivePercent: number;
  };
  readonly deferral: {
    readonly reason: string;
    readonly trackedBy: string;
  };
  /** Number of platoons scanned but omitted because they have no MUL BV. */
  readonly omittedWithoutMulBV: number;
  readonly platoons: readonly PlatoonReportEntry[];
}

interface CLIOptions {
  readonly outputPath: string;
  readonly help: boolean;
}

const STABLE_GENERATED_AT = '1970-01-01T00:00:00.000Z';

// =============================================================================
// Fixture loading
// =============================================================================

const INFANTRY_DATA_DIR = path.resolve(
  process.cwd(),
  'public',
  'data',
  'units',
  'infantry',
);

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const defaultOutputPath = path.resolve(
    process.cwd(),
    'validation-output',
    'infantry-bv-validation-report.json',
  );
  let outputPath = defaultOutputPath;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--output':
        outputPath = path.resolve(args[++i] || defaultOutputPath);
        break;
      case '--help':
      case '-h':
        help = true;
        break;
      default:
        break;
    }
  }

  return { outputPath, help };
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
Infantry BV Parity Validation

Usage:
  npx tsx scripts/validate-infantry-bv.ts [options]

Options:
  --output <path>      Output JSON report path
  --help, -h           Show this help message
`);
}

function generatedAtTimestamp(): string {
  return process.env.MEKSTATION_VALIDATION_GENERATED_AT ?? STABLE_GENERATED_AT;
}

/**
 * Recursively gather every `*.json` under `public/data/units/infantry/`.
 * Ignores non-JSON files and hidden files so the harness tolerates
 * README.md or other auxiliary content alongside the fixtures.
 */
function gatherInfantryFixtureFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name.toLowerCase() === 'units-manifest.json') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gatherInfantryFixtureFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Shape of an infantry fixture file on disk — an `IInfantry`-compatible object
 * with an optional `mulBV` parity reference.
 *
 * The parser is intentionally tolerant: missing optional fields fall back to
 * the defaults used by `InfantryUnitHandler.combineFields`, ensuring fixtures
 * remain compact. Required fields are validated with a clear error.
 */
type InfantryFixtureWeaponRef =
  | string
  | {
      readonly id?: string;
      readonly name?: string;
      readonly count?: number;
    };

type InfantryFixtureFieldGunRef = Partial<IInfantryFieldGun> & {
  readonly id?: string;
  readonly weaponId?: string;
  readonly crewCount?: number;
};

interface InfantryFixtureFile extends Partial<
  Omit<
    IInfantry,
    | 'armorKit'
    | 'fieldGuns'
    | 'motionType'
    | 'primaryWeapon'
    | 'secondaryWeapon'
  >
> {
  /** Reference BV from MegaMek Master Unit List — optional. */
  readonly mulBV?: number | null;
  readonly chassis?: string;
  readonly model?: string;
  readonly armorKit?: InfantryArmorKit | string;
  readonly motionType?: SquadMotionType | string;
  readonly platoon?: {
    readonly squadSize?: number;
    readonly squadCount?: number;
    readonly totalTroopers?: number;
  };
  readonly primaryWeapon?: InfantryFixtureWeaponRef;
  readonly secondaryWeapon?: InfantryFixtureWeaponRef;
  readonly fieldGuns?: readonly InfantryFixtureFieldGunRef[];
}

function fixtureName(data: InfantryFixtureFile, filePath: string): string {
  if (typeof data.name === 'string' && data.name.trim()) return data.name;

  const fromChassisModel = [data.chassis, data.model]
    .filter(
      (part): part is string =>
        typeof part === 'string' && part.trim().length > 0,
    )
    .join(' ');
  return fromChassisModel || path.basename(filePath, '.json');
}

function weaponName(
  weapon: InfantryFixtureWeaponRef | undefined,
): string | undefined {
  if (typeof weapon === 'string') return weapon;
  return weapon?.name ?? weapon?.id;
}

function weaponId(
  weapon: InfantryFixtureWeaponRef | undefined,
): string | undefined {
  if (typeof weapon === 'string') return undefined;
  return weapon?.id;
}

function secondaryWeaponCount(
  data: InfantryFixtureFile,
  weapon: InfantryFixtureWeaponRef | undefined,
): number {
  if (typeof data.secondaryWeaponCount === 'number') {
    return data.secondaryWeaponCount;
  }
  if (typeof weapon === 'object' && typeof weapon.count === 'number') {
    return weapon.count;
  }
  return 0;
}

function normalizedToken(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeArmorKit(value: unknown): InfantryArmorKit {
  const direct = Object.values(InfantryArmorKit).find((kit) => kit === value);
  if (direct) return direct;

  const token = normalizedToken(value);
  if (!token || token === 'none') return InfantryArmorKit.NONE;
  if (token.includes('flak')) return InfantryArmorKit.FLAK;
  if (token.includes('ablative')) return InfantryArmorKit.ABLATIVE;
  if (token.includes('clan')) return InfantryArmorKit.CLAN;
  if (token.includes('environment')) return InfantryArmorKit.ENVIRONMENTAL;
  if (
    token.includes('sneak') &&
    token.includes('ir') &&
    token.includes('ecm')
  ) {
    return InfantryArmorKit.SNEAK_IR_ECM;
  }
  if (
    token.includes('sneak') &&
    token.includes('camo') &&
    token.includes('ir')
  ) {
    return InfantryArmorKit.SNEAK_CAMO_IR;
  }
  if (token.includes('sneak') && token.includes('ecm')) {
    return InfantryArmorKit.SNEAK_ECM;
  }
  if (token.includes('sneak') && token.includes('ir')) {
    return InfantryArmorKit.SNEAK_IR;
  }
  if (token.includes('sneak')) return InfantryArmorKit.SNEAK_CAMO;
  return InfantryArmorKit.STANDARD;
}

function normalizeMotionType(value: unknown): SquadMotionType {
  const direct = Object.values(SquadMotionType).find(
    (motion) => motion === value,
  );
  if (direct) return direct;

  const token = normalizedToken(value);
  if (token.includes('jump')) return SquadMotionType.JUMP;
  if (token.includes('motor')) return SquadMotionType.MOTORIZED;
  if (token.includes('wheel')) return SquadMotionType.WHEELED;
  if (token.includes('track')) return SquadMotionType.TRACKED;
  if (token.includes('hover')) return SquadMotionType.HOVER;
  if (token.includes('vtol')) return SquadMotionType.VTOL;
  if (token.includes('umu')) return SquadMotionType.UMU;
  if (token.includes('beast')) return SquadMotionType.BEAST;
  if (token.includes('mechan')) return SquadMotionType.MECHANIZED;
  return SquadMotionType.FOOT;
}

function normalizeFieldGuns(
  fieldGuns: readonly InfantryFixtureFieldGunRef[] | undefined,
  filePath: string,
): readonly IInfantryFieldGun[] {
  return (fieldGuns ?? []).map((gun, index) => {
    const equipmentId = gun.equipmentId ?? gun.weaponId ?? gun.id;
    if (!equipmentId) {
      throw new Error(
        `Fixture ${filePath} fieldGuns[${index}] is missing equipment id`,
      );
    }

    return {
      equipmentId,
      name: gun.name ?? equipmentId,
      crew: gun.crew ?? gun.crewCount ?? 0,
    };
  });
}

/**
 * Load and normalize a fixture JSON into a full `IInfantry` shape suitable
 * for `calculateBattleValueForUnit`.
 */
function loadFixture(filePath: string): {
  unit: IInfantry;
  mulBV: number | null;
  source: string;
} {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as InfantryFixtureFile;
  const name = fixtureName(data, filePath);
  const primaryWeapon = weaponName(data.primaryWeapon);

  if (!data.id || !name || !primaryWeapon) {
    throw new Error(
      `Fixture ${filePath} is missing required id/name/primaryWeapon`,
    );
  }

  // Supply structural defaults for any handler-layer fields the fixture
  // omits. The BV calculator only reads the subset enumerated below, so
  // the adapter must still see every field it touches.
  const unit: IInfantry = {
    ...(data as IInfantry),
    id: data.id,
    name,
    unitType: UnitType.INFANTRY,
    motionType: normalizeMotionType(data.motionType),
    primaryWeapon,
    primaryWeaponId: data.primaryWeaponId ?? weaponId(data.primaryWeapon),
    secondaryWeapon: weaponName(data.secondaryWeapon),
    secondaryWeaponId: data.secondaryWeaponId ?? weaponId(data.secondaryWeapon),
    armorKit: normalizeArmorKit(data.armorKit),
    fieldGuns: normalizeFieldGuns(data.fieldGuns, filePath),
    hasAntiMechTraining: data.hasAntiMechTraining ?? false,
    isAugmented: data.isAugmented ?? false,
    canSwarm: data.canSwarm ?? false,
    canLegAttack: data.canLegAttack ?? false,
    secondaryWeaponCount: secondaryWeaponCount(data, data.secondaryWeapon),
    squadSize: data.squadSize ?? data.platoon?.squadSize ?? 7,
    numberOfSquads: data.numberOfSquads ?? data.platoon?.squadCount ?? 4,
    platoonStrength:
      data.platoonStrength ??
      data.platoon?.totalTroopers ??
      (data.squadSize ?? data.platoon?.squadSize ?? 7) *
        (data.numberOfSquads ?? data.platoon?.squadCount ?? 4),
  } as IInfantry;

  const mulBV =
    typeof data.mulBV === 'number' && Number.isFinite(data.mulBV)
      ? data.mulBV
      : null;

  return {
    unit,
    mulBV,
    source: path.relative(process.cwd(), filePath),
  };
}

// =============================================================================
// Harness
// =============================================================================

/**
 * Compute a parity entry for a single fixture file.
 *
 * Invokes the unified dispatcher `calculateBattleValueForUnit`; if the
 * dispatcher returns `undefined` (non-infantry fall-through), the harness
 * raises — fixtures under `public/data/units/infantry/` are always expected
 * to resolve to the infantry path.
 */
function computeEntry(filePath: string): PlatoonReportEntry {
  const { unit, mulBV, source } = loadFixture(filePath);
  const result = calculateBattleValueForUnit(unit);
  if (!result || result.kind !== 'infantry') {
    throw new Error(
      `Dispatcher did not return an infantry breakdown for ${source}. ` +
        `Check that unitType === 'Infantry' on the fixture.`,
    );
  }

  const computedBV = result.breakdown.final;
  const delta = mulBV !== null ? computedBV - mulBV : null;
  const deltaPct =
    mulBV !== null && mulBV !== 0 && delta !== null
      ? (delta / mulBV) * 100
      : mulBV === 0
        ? 0
        : null;

  return {
    id: unit.id,
    name: unit.name,
    source,
    computedBV,
    mulBV,
    delta,
    deltaPct,
    breakdown: result.breakdown,
  };
}

/**
 * Build the parity report object from every fixture on disk.
 */
function buildReport(): InfantryBVReport {
  const files = gatherInfantryFixtureFiles(INFANTRY_DATA_DIR);
  const platoons = files.map(computeEntry);

  const withMulBV = platoons.filter((p) => p.mulBV !== null).length;
  const withinOne = platoons.filter(
    (p) => p.deltaPct !== null && Math.abs(p.deltaPct) <= 1,
  ).length;
  const withinFive = platoons.filter(
    (p) => p.deltaPct !== null && Math.abs(p.deltaPct) <= 5,
  ).length;
  const referencedPlatoons = platoons.filter((p) => p.mulBV !== null);

  return {
    version: '1',
    generatedAt: generatedAtTimestamp(),
    totalPlatoons: platoons.length,
    parityCoverage: {
      withMulBV,
      withinOnePercent: withinOne,
      withinFivePercent: withinFive,
    },
    deferral: {
      reason:
        'MUL BV cache for conventional infantry platoons is partial. Fixtures without a mulBV field emit delta/deltaPct as null; once the MegaMek MUL extract is seeded under public/data/units/infantry/, each fixture should gain a mulBV value and delta coverage will rise automatically.',
      trackedBy:
        'openspec/changes/add-infantry-battle-value/tasks.md (task 7.2 deferred)',
    },
    omittedWithoutMulBV: platoons.length - referencedPlatoons.length,
    platoons: referencedPlatoons,
  };
}

/**
 * Entry point — writes the report to `validation-output/infantry-bv-validation-report.json`.
 */
function main(): void {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildReport();
  const outDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = options.outputPath;
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  // Minimal summary on stdout — mirrors existing BV harness ergonomics.
  console.log('[validate-infantry-bv] Report written: ' + outPath);
  console.log('[validate-infantry-bv] Platoons: ' + report.totalPlatoons);
  console.log(
    '[validate-infantry-bv] Omitted without MUL BV: ' +
      report.omittedWithoutMulBV,
  );
  console.log(
    '[validate-infantry-bv] With MUL BV: ' +
      report.parityCoverage.withMulBV +
      ' / ' +
      report.totalPlatoons,
  );
  console.log(
    '[validate-infantry-bv] Within 1%: ' +
      report.parityCoverage.withinOnePercent +
      ' (of ' +
      report.parityCoverage.withMulBV +
      ' MUL-referenced)',
  );
  console.log(
    '[validate-infantry-bv] Within 5%: ' +
      report.parityCoverage.withinFivePercent +
      ' (of ' +
      report.parityCoverage.withMulBV +
      ' MUL-referenced)',
  );
}

if (require.main === module) {
  main();
}

export { buildReport, loadFixture, gatherInfantryFixtureFiles, parseArgs };
