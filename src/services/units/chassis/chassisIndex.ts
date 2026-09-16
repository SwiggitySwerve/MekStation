import { z } from 'zod';

import type {
  ChassisId,
  IChassisEntry,
  IChassisIndex,
} from '@/types/unit/ChassisIndex';

import { getWeightClass } from '@/types/enums/WeightClass';

import { CHASSIS_ALIASES } from './chassisAliases';

const identity = z
  .string()
  .min(1)
  .refine(
    (value) => value === value.trim(),
    'Identity fields must not have surrounding whitespace',
  );
const catalogSchema = z.object({
  version: identity,
  generatedAt: identity,
  totalUnits: z.number().int().positive(),
  units: z
    .array(
      z.object({
        id: identity,
        chassis: identity,
        model: identity,
        tonnage: z.number().positive().finite(),
        techBase: z.enum(['INNER_SPHERE', 'CLAN', 'MIXED']),
        year: z.number().int(),
        rulesLevel: z.string().optional(),
        role: z.string().optional(),
      }),
    )
    .min(1),
});

function compareNames(left: string, right: string): number {
  return (
    left.localeCompare(right, 'en', { numeric: true }) ||
    (left < right ? -1 : left > right ? 1 : 0)
  );
}

export function normalizeChassisSearch(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function chassisId(name: string): ChassisId {
  const slug = normalizeChassisSearch(name).replace(/ /g, '-');
  if (!slug) throw new Error(`Chassis name has no usable identity: ${name}`);
  return `battlemech:${slug}`;
}

/** @spec openspec/specs/battlemech-chassis-index/spec.md */
export function buildChassisIndex(source: unknown): IChassisIndex {
  const catalog = catalogSchema.parse(source);
  if (catalog.totalUnits !== catalog.units.length) {
    throw new Error('Canonical catalog unit count does not match its records');
  }

  const groups = new Map<string, typeof catalog.units>();
  const unitIds = new Set<string>();
  for (const unit of catalog.units) {
    if (unitIds.has(unit.id))
      throw new Error(`Duplicate canonical unit ID: ${unit.id}`);
    unitIds.add(unit.id);
    const variants = groups.get(unit.chassis) ?? [];
    variants.push(unit);
    groups.set(unit.chassis, variants);
  }

  const identities = new Map<ChassisId, string>();
  for (const name of Array.from(groups.keys())) {
    const id = chassisId(name);
    if (identities.has(id))
      throw new Error(
        `Chassis identity collision: ${name} and ${identities.get(id)}`,
      );
    identities.set(id, name);
  }

  const searchNames = new Map(identities);
  const chassis: IChassisEntry[] = Array.from(groups.entries())
    .map(([name, units]) => {
      const aliases = CHASSIS_ALIASES[name] ?? [];
      for (const alias of aliases) {
        const key = chassisId(alias);
        const owner = searchNames.get(key);
        if (owner && owner !== name)
          throw new Error(`Chassis alias collision: ${alias}`);
        searchNames.set(key, name);
      }
      const weights = Array.from(
        new Set(units.map((unit) => unit.tonnage)),
      ).sort((a, b) => a - b);
      return {
        id: chassisId(name),
        name,
        aliases: [...aliases],
        weights,
        weightClasses: Array.from(new Set(weights.map(getWeightClass))),
        techBases: Array.from(new Set(units.map((unit) => unit.techBase))).sort(
          compareNames,
        ),
        introductionYear: Math.min(...units.map((unit) => unit.year)),
        variants: units
          .map((unit) => ({
            unitId: unit.id,
            name: unit.model,
            weight: unit.tonnage,
            techBase: unit.techBase,
            introductionYear: unit.year,
            rulesLevel: unit.rulesLevel ?? null,
            role: unit.role ?? null,
          }))
          .sort(
            (a, b) =>
              compareNames(a.name, b.name) || compareNames(a.unitId, b.unitId),
          ),
      };
    })
    .sort((a, b) => compareNames(a.name, b.name));

  return {
    schemaVersion: 1,
    source: {
      path: '/data/units/battlemechs/index.json',
      version: catalog.version,
      generatedAt: catalog.generatedAt,
    },
    totalVariants: unitIds.size,
    chassis,
  };
}

export function searchChassisIndex(
  chassis: readonly IChassisEntry[],
  query: string,
  weightClass = '',
): readonly IChassisEntry[] {
  const terms = normalizeChassisSearch(query).split(' ').filter(Boolean);
  return chassis.filter((entry) => {
    if (
      weightClass &&
      !entry.weightClasses.some((value) => value === weightClass)
    )
      return false;
    const text = normalizeChassisSearch(
      [
        entry.name,
        ...entry.aliases,
        ...entry.variants.flatMap((variant) => [variant.name, variant.unitId]),
      ].join(' '),
    );
    return terms.every((term) => text.includes(term));
  });
}
