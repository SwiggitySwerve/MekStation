/**
 * Cheap structural guard for a fetched canonical unit payload.
 *
 * The browser `CanonicalUnitService` runs this on every cold `getById`, before
 * the unit is cached. It is deliberately not `UnitContract`: the full contract
 * costs ~2 ms per BattleMech (a 500-mech cold load went from ~33 ms to ~2 s),
 * and the bundled corpus is checked against the contract in CI
 * (`src/types/contracts/__tests__/unit.contract.test.ts`, every indexed unit of
 * every family, which also asserts this guard accepts all of them).
 *
 * It catches what a live fetch can realistically return that is not a unit: a
 * non-object body, an error object, the wrong file, or a file of another
 * family. Bodies that are not JSON at all (HTML, truncated) never get here;
 * `response.json()` rejects first.
 *
 * Checked fields are the ones readers dereference without a fallback:
 * - `id`: identity and cache key; `adaptUnitFromData` copies `fullUnit.id`, and
 *   a different id means the index pointed at the wrong file.
 * - `unitType`: `adaptUnitFromData` dispatches vehicle/aerospace on it and the
 *   runner copies it into combat state. It must belong to the requested family
 *   (the same rule `loadUnitDefinition` applies), so a unit of another family
 *   is not adapted as the wrong kind.
 * - `tonnage`: `adaptUnitFromData` defaults an absent value to 50 but not a
 *   wrong-typed one, and `forceSummaryBuilder` / `UnitHydrationMovement` read
 *   it directly. Infantry files carry none, so absent is allowed.
 *
 * Display-only fields (`chassis`, `model`, `variant`) are not checked: no
 * reader needs them to adapt a unit, and the contract in CI covers them.
 */

import type { UnitFamily } from '@/types/unit/UnitIndex';

import { UNIT_DEFINITION_FAMILIES } from './unitLoaderService/definitionTypes';
import { UnitContractParseError } from './unitLoaderService/unitContractParseError';

interface IExpectedUnit {
  /** The id the index row (and so the caller) asked for. */
  readonly id: string;
  readonly family: UnitFamily;
}

/** Throws `UnitContractParseError` when `value` is not a usable unit payload. */
export function assertUnitShape(
  value: unknown,
  expected: IExpectedUnit,
  sourceLabel: string,
): void {
  const fail = (path: string, message: string): never => {
    throw new UnitContractParseError(
      [{ path, message }],
      sourceLabel,
      'unit shape guard',
    );
  };
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return fail('', 'Expected a unit object');
  const unit = value as Record<string, unknown>;
  if (unit.id !== expected.id)
    fail('id', `Expected id "${expected.id}", received ${show(unit.id)}`);
  const familyTypes: readonly string[] =
    UNIT_DEFINITION_FAMILIES[expected.family].unitTypes;
  if (typeof unit.unitType !== 'string' || !familyTypes.includes(unit.unitType))
    fail(
      'unitType',
      `Unit type ${show(unit.unitType)} does not belong to family ${expected.family}`,
    );
  if (
    unit.tonnage !== undefined &&
    !(typeof unit.tonnage === 'number' && unit.tonnage > 0)
  )
    fail(
      'tonnage',
      `Expected a positive number, received ${show(unit.tonnage)}`,
    );
}

function show(value: unknown): string {
  return value === undefined ? 'nothing' : JSON.stringify(value);
}
