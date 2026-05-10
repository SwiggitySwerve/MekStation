import {
  AmmunitionContract,
  ElectronicsContract,
  MiscEquipmentContract,
  PhysicalWeaponContract,
  WeaponContract,
} from '@/types/contracts';

/**
 * One-line summary of a Zod schema for use in dev-loader log lines.
 *
 * The `safeParse` API is structural so we treat each contract as an
 * opaque parser keyed by a human-readable label.
 */
export interface IShapeValidator {
  readonly label: string;
  readonly safeParse: (item: unknown) => {
    success: boolean;
    error?: {
      issues: readonly {
        path: ReadonlyArray<string | number>;
        message: string;
      }[];
    };
  };
}

/**
 * Map per-shape `$schema`-filename suffix to the matching contract.
 *
 * Used by `detectShapeValidator` to pick the right Zod schema for an
 * equipment file. Ammunition files in the corpus today don't carry a
 * `$schema` reference, so the loader falls back to the per-loop default
 * (see `validateShapeFromFile`). New shapes only need an entry here
 * plus a default-fallback in the call site.
 */
const SHAPE_VALIDATORS_BY_SCHEMA_FILE: Record<string, IShapeValidator> = {
  'weapon-schema.json': {
    label: 'WeaponContract',
    safeParse: WeaponContract.safeParse.bind(
      WeaponContract,
    ) as IShapeValidator['safeParse'],
  },
  'physical-weapon-schema.json': {
    label: 'PhysicalWeaponContract',
    safeParse: PhysicalWeaponContract.safeParse.bind(
      PhysicalWeaponContract,
    ) as IShapeValidator['safeParse'],
  },
  'ammunition-schema.json': {
    label: 'AmmunitionContract',
    safeParse: AmmunitionContract.safeParse.bind(
      AmmunitionContract,
    ) as IShapeValidator['safeParse'],
  },
  'electronics-schema.json': {
    label: 'ElectronicsContract',
    safeParse: ElectronicsContract.safeParse.bind(
      ElectronicsContract,
    ) as IShapeValidator['safeParse'],
  },
  'misc-equipment-schema.json': {
    label: 'MiscEquipmentContract',
    safeParse: MiscEquipmentContract.safeParse.bind(
      MiscEquipmentContract,
    ) as IShapeValidator['safeParse'],
  },
};

/**
 * Resolve a contract validator from an `IEquipmentFile.$schema` reference.
 *
 * Returns `undefined` when the file has no `$schema` or the suffix isn't
 * mapped — callers can pass an explicit `fallback` validator (typical
 * for ammunition files which omit the header) so the gate still runs.
 */
function detectShapeValidator(
  schemaRef: string | undefined,
): IShapeValidator | undefined {
  if (!schemaRef) return undefined;
  const fileName = schemaRef.split(/[\\/]/).pop() ?? schemaRef;
  return SHAPE_VALIDATORS_BY_SCHEMA_FILE[fileName];
}

/**
 * Validate every item in an equipment file against a contract.
 *
 * Behaviour:
 *  - Default: collect failures and emit a single `console.warn`
 *    summarising drift. Non-throwing because the corpus may still have
 *    minor known gaps (e.g. 6 X-Pulse / VSP entries pre-PR-A2 missed
 *    `costCBills`). The `--strict` schema-bridge CI gate is the
 *    enforcement layer; this dev-loader gate is just an early signal.
 *  - `MEKSTATION_STRICT_SCHEMA_BRIDGE=1`: throw with an aggregated
 *    error message. Useful for one-off `npx jest` runs where you want
 *    to fail fast on any new drift introduced by a code change.
 *
 * Dev/test only — production callers never reach this code path because
 * every consumer wraps the call in `process.env.NODE_ENV !== 'production'`.
 */
function validateShape(
  validator: IShapeValidator,
  fileLabel: string,
  items: readonly unknown[],
): void {
  // Collect ALL failures rather than throwing on the first so the dev
  // gets one clear list per file rather than a death-by-a-thousand-cuts.
  const failures: string[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const result = validator.safeParse(item);
    if (!result.success) {
      const id = (item as { id?: unknown } | null | undefined)?.id ?? '<no id>';
      const issuePaths = (result.error?.issues ?? [])
        .slice(0, 3)
        .map(
          (issue) =>
            `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`,
        )
        .join('; ');
      failures.push(`  [${index}] id=${String(id)} -> ${issuePaths}`);
    }
  }
  if (failures.length === 0) return;

  const message =
    `EquipmentLoaderService: ${failures.length} item(s) in ${fileLabel} ` +
    `failed ${validator.label}.safeParse:\n${failures.slice(0, 8).join('\n')}` +
    (failures.length > 8 ? `\n... and ${failures.length - 8} more` : '');

  if (process.env.MEKSTATION_STRICT_SCHEMA_BRIDGE === '1') {
    throw new Error(message);
  }
  // Non-strict default: surface drift loudly without breaking dev runs.
  // eslint-disable-next-line no-console
  console.warn(`[schema-bridge] ${message}`);
}

/**
 * Run the dev-loader schema gate for a single equipment file.
 *
 * Resolves the contract from the file's `$schema` header and falls back
 * to `defaultValidator` when the header is missing (ammunition today)
 * or points at an unknown shape. No-ops in production builds.
 */
export function validateShapeFromFile(
  fileLabel: string,
  fileSchemaRef: string | undefined,
  items: readonly unknown[],
  defaultValidator: IShapeValidator,
): void {
  if (process.env.NODE_ENV === 'production') return;
  const validator = detectShapeValidator(fileSchemaRef) ?? defaultValidator;
  validateShape(validator, fileLabel, items);
}

// Pre-bound shape validators reused by the loader loops. Defined once so
// every call site lands on the same `IShapeValidator` object identity
// (cheap value, but clearer in profiles than ad-hoc literals). The
// physical-weapon shape is reachable via `detectShapeValidator` for
// files in the weapons/ directory carrying `physical-weapon-schema.json`,
// so it doesn't need its own pre-bound constant.
export const WEAPON_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['weapon-schema.json'];
export const AMMUNITION_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['ammunition-schema.json'];
export const ELECTRONICS_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['electronics-schema.json'];
export const MISC_EQUIPMENT_SHAPE =
  SHAPE_VALIDATORS_BY_SCHEMA_FILE['misc-equipment-schema.json'];
