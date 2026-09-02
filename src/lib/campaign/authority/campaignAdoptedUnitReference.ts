/**
 * Canonical adoption of a roster unit reference (umbrella task 10.2).
 *
 * A campaign's roster projection carries only display identity plus the
 * catalog reference (`unitRef` / `unitSource` / `sourceVersion`, the
 * canonical-vs-saved split from #1262). That is enough to say WHICH unit
 * a slot holds and nothing about WHAT it is built from, so the campaign
 * authority surface currently has no way to state that a customized
 * design survived adoption: `authoritativeStateFromSerializedCampaign`
 * projects `{unitId, designation, status, unitRef, unitSource,
 * sourceVersion}` and drops tonnage, tech base, engine, gyro, armor,
 * equipment and critical slots entirely.
 *
 * This module resolves an adopted reference: for a canonical unit the
 * reference is the pinned catalog id, and for a CUSTOM unit it is the
 * catalog id PLUS the construction identity read back out of the durable
 * custom-unit record. Every named field is read explicitly. There is no
 * default anywhere in this file on purpose - a defaulted engine rating or
 * a substituted gyro would let a template stand in for the player's
 * design and still report success, which is precisely the substitution
 * `Customized Units Adopt Canonically` forbids.
 *
 * The custom record is the durable one (`custom_units`, written through
 * `UnitRepository`), so a reference adopted here resolves to the same
 * definition after a server restart.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Customized Units Adopt Canonically")
 */

import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { RosterUnitSource } from '@/types/campaign/RosterUnitSource';
import type { ICustomUnitRecord } from '@/types/persistence/UnitPersistence';
import type {
  ISerializedCriticalSlots,
  ISerializedEquipment,
} from '@/types/unit/UnitSerialization';

import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

/** The two tactical seats a co-op campaign admits (design D2). */
export type TacticalPlayerSlot = 1 | 2;

/**
 * The construction identity a customized design carries into a campaign.
 *
 * Mirrors the named clauses of the requirement one field per clause:
 * identity, weight, tech base, engine, gyro, armor, equipment, critical
 * slots. Structure and configuration ride along because armor and
 * critical slots are meaningless without them.
 */
export interface ICustomizedUnitDefinition {
  readonly chassis: string;
  readonly model: string;
  readonly variant?: string;
  readonly unitType: string;
  readonly configuration: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly rulesLevel: string;
  readonly era: string;
  readonly year: number;
  readonly engine: { readonly type: string; readonly rating: number };
  readonly gyro: { readonly type: string };
  readonly structure: { readonly type: string };
  readonly armor: {
    readonly type: string;
    readonly allocation: Readonly<
      Record<string, number | { front: number; rear: number }>
    >;
  };
  readonly equipment: readonly ISerializedEquipment[];
  readonly criticalSlots: ISerializedCriticalSlots;
}

/**
 * What campaign adoption commits for one roster unit.
 *
 * `customization` is absent for a canonical unit - a canonical reference
 * IS its definition, and inventing an empty construction block for it
 * would make "has a customization" untrustworthy.
 */
export interface IAdoptedUnitReference {
  readonly unitId: string;
  readonly unitRef: string;
  readonly unitSource: RosterUnitSource;
  readonly sourceVersion?: number;
  readonly designation: string;
  /** When adoption committed this reference. */
  readonly adoptedAt: string;
  /** Temporal metadata carried off the durable custom record. */
  readonly sourceCreatedAt?: string;
  readonly sourceUpdatedAt?: string;
  readonly sourceRecordVersion?: number;
  readonly customization?: ICustomizedUnitDefinition;
}

/** Why adoption refused, each a fail-closed reason rather than a fallback. */
export type AdoptUnitUnresolvedReason =
  | 'invalid-unit-source'
  | 'missing-unit-reference'
  | 'custom-unit-record-absent'
  | 'custom-unit-payload-unreadable';

export type AdoptUnitReferenceResult =
  | { readonly kind: 'adopted'; readonly reference: IAdoptedUnitReference }
  | {
      readonly kind: 'unresolved';
      readonly unitId: string;
      readonly reason: AdoptUnitUnresolvedReason;
    };

/** Narrow an unknown JSON value to a plain object without widening to `any`. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Read the engine block. Both halves are required: a rating without a
 * type (or the reverse) is a half-read payload, and adopting it would
 * publish a design the customizer never produced.
 */
function readEngine(
  unit: Record<string, unknown>,
): ICustomizedUnitDefinition['engine'] | null {
  const engine = asRecord(unit.engine);
  if (!engine) return null;
  const type = readString(engine, 'type');
  const rating = readNumber(engine, 'rating');
  return type !== null && rating !== null ? { type, rating } : null;
}

/** Read a single-field `{ type }` block (gyro, structure). */
function readTyped(
  unit: Record<string, unknown>,
  key: string,
): { readonly type: string } | null {
  const block = asRecord(unit[key]);
  if (!block) return null;
  const type = readString(block, 'type');
  return type === null ? null : { type };
}

/**
 * Read the armor block. The allocation is copied through as stored -
 * per-location numbers and `{front, rear}` pairs both - because the
 * campaign has no business normalizing a customizer's allocation.
 */
function readArmor(
  unit: Record<string, unknown>,
): ICustomizedUnitDefinition['armor'] | null {
  const armor = asRecord(unit.armor);
  if (!armor) return null;
  const type = readString(armor, 'type');
  const allocation = asRecord(armor.allocation);
  if (type === null || allocation === null) return null;
  return {
    type,
    allocation: allocation as ICustomizedUnitDefinition['armor']['allocation'],
  };
}

/**
 * Build the construction identity from the stored payload, or null when
 * any named field is missing. Null is a refusal, never a partial adopt.
 */
function readCustomization(payload: unknown): ICustomizedUnitDefinition | null {
  const unit = asRecord(payload);
  if (!unit) return null;
  const chassis = readString(unit, 'chassis');
  const model = readString(unit, 'model');
  const unitType = readString(unit, 'unitType');
  const configuration = readString(unit, 'configuration');
  const tonnage = readNumber(unit, 'tonnage');
  const techBase = readString(unit, 'techBase');
  const rulesLevel = readString(unit, 'rulesLevel');
  const era = readString(unit, 'era');
  const year = readNumber(unit, 'year');
  const engine = readEngine(unit);
  const gyro = readTyped(unit, 'gyro');
  const structure = readTyped(unit, 'structure');
  const armor = readArmor(unit);
  const criticalSlots = asRecord(unit.criticalSlots);
  if (
    chassis === null ||
    model === null ||
    unitType === null ||
    configuration === null ||
    tonnage === null ||
    techBase === null ||
    rulesLevel === null ||
    era === null ||
    year === null ||
    engine === null ||
    gyro === null ||
    structure === null ||
    armor === null ||
    criticalSlots === null ||
    !Array.isArray(unit.equipment)
  ) {
    return null;
  }
  const variant = readString(unit, 'variant');
  return {
    chassis,
    model,
    ...(variant === null ? {} : { variant }),
    unitType,
    configuration,
    tonnage,
    techBase,
    rulesLevel,
    era,
    year,
    engine,
    gyro,
    structure,
    armor,
    equipment: unit.equipment as readonly ISerializedEquipment[],
    criticalSlots: criticalSlots as ISerializedCriticalSlots,
  };
}

/**
 * Adopt one roster projection into an authoritative unit reference.
 *
 * Canonical units adopt on their pinned catalog reference alone. Custom
 * units must resolve against the durable custom-unit record, and a
 * missing or unreadable record is a refusal - the campaign does not fall
 * back to the chassis template, because a silently substituted template
 * is exactly the failure the reload scenario names.
 */
export function adoptRosterUnitReference(input: {
  readonly projection: IRosterUnitProjection;
  readonly adoptedAt: string;
  readonly resolveCustomUnit: (unitRef: string) => ICustomUnitRecord | null;
}): AdoptUnitReferenceResult {
  const { projection } = input;
  const parsed = parseRosterUnitSource(projection.unitSource);
  if (parsed.kind === 'invalid') {
    return {
      kind: 'unresolved',
      unitId: projection.unitId,
      reason: 'invalid-unit-source',
    };
  }
  if (!projection.unitRef) {
    return {
      kind: 'unresolved',
      unitId: projection.unitId,
      reason: 'missing-unit-reference',
    };
  }

  const base: IAdoptedUnitReference = {
    unitId: projection.unitId,
    unitRef: projection.unitRef,
    unitSource: parsed.source,
    designation: projection.unitName,
    adoptedAt: input.adoptedAt,
    ...(projection.sourceVersion === undefined
      ? {}
      : { sourceVersion: projection.sourceVersion }),
  };

  if (parsed.source === 'canonical') {
    return { kind: 'adopted', reference: base };
  }

  const record = input.resolveCustomUnit(projection.unitRef);
  if (record === null) {
    return {
      kind: 'unresolved',
      unitId: projection.unitId,
      reason: 'custom-unit-record-absent',
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(record.data);
  } catch {
    return {
      kind: 'unresolved',
      unitId: projection.unitId,
      reason: 'custom-unit-payload-unreadable',
    };
  }
  const customization = readCustomization(payload);
  if (customization === null) {
    return {
      kind: 'unresolved',
      unitId: projection.unitId,
      reason: 'custom-unit-payload-unreadable',
    };
  }

  return {
    kind: 'adopted',
    reference: {
      ...base,
      sourceCreatedAt: record.createdAt,
      sourceUpdatedAt: record.updatedAt,
      sourceRecordVersion: record.currentVersion,
      customization,
    },
  };
}
