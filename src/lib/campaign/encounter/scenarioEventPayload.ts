/**
 * Scenario-event payload guard
 *
 * Runtime type guard for the `scenario_generated` day-event `data`
 * payload, kept in a leaf module so both the bridge processor and the
 * builder can import it without a cycle.
 *
 * @module lib/campaign/encounter/scenarioEventPayload
 */

import type { IScenarioGeneratedPayload } from './buildEncounterFromScenario';

/**
 * Narrow an arbitrary day-event `data` record to the
 * `scenario_generated` payload shape. Guards the bridge against
 * malformed or partial events without throwing.
 */
export function isScenarioGeneratedPayload(
  data: unknown,
): data is IScenarioGeneratedPayload {
  if (typeof data !== 'object' || data === null) return false;
  const payload = data as Partial<IScenarioGeneratedPayload>;
  return (
    typeof payload.scenarioType === 'string' &&
    typeof payload.opForBV === 'number' &&
    typeof payload.teamId === 'string' &&
    typeof payload.contractId === 'string' &&
    typeof payload.contractName === 'string' &&
    typeof payload.scenarioId === 'string' &&
    typeof payload.conditions === 'object' &&
    payload.conditions !== null
  );
}
