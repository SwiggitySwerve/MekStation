/**
 * Force-Deletion Cascade Hook
 *
 * Decouples ForceRepository from EncounterRepository so the two modules can
 * sit in their own dependency layers without a hard import. The encounter
 * repository registers a callback at module-init time via
 * `setEncounterCascadeHook(...)`; ForceRepository.deleteForce invokes the
 * callback (if registered) BEFORE deleting the force row, all inside one
 * SQLite transaction so partial failures roll back atomically.
 *
 * Why a callback rather than a direct import?
 *   - ForceRepository pre-dates EncounterRepository in the dependency graph;
 *     a direct `import { getEncounterRepository } from '../encounter/...'`
 *     would create a circular import (EncounterService imports ForceRepository
 *     in `hydrateEncounter`).
 *   - The callback keeps cascade logic owned by EncounterRepository (the
 *     module that knows how to NULL the force-id columns and recompute status)
 *     while letting ForceRepository remain agnostic.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Force-Deletion Cascade to Encounter References)
 */

/**
 * Callback shape — invoked synchronously inside the same SQLite transaction
 * as the force-row DELETE. The callback MUST throw on any internal failure so
 * the surrounding `db.transaction(...)` rolls back; returning silently on a
 * partial failure would leave the orphan invariant broken.
 *
 * The callback returns nothing — affected encounter ids are not propagated
 * out of the cascade because the calling code (ForceRepository.deleteForce)
 * does not need them. Tests inspect the resulting DB state directly.
 */
export type EncounterCascadeHook = (forceId: string) => void;

let registeredHook: EncounterCascadeHook | null = null;

/**
 * Register the cascade hook. EncounterRepository's singleton factory wires
 * itself as the hook on first creation. Tests that bypass the singleton
 * (e.g. construct a fresh repo manually) can register their own hook.
 *
 * Idempotent — re-registering overwrites the previous hook.
 */
export function setEncounterCascadeHook(hook: EncounterCascadeHook): void {
  registeredHook = hook;
}

/**
 * Clear the registered hook. Used by `resetEncounterRepository` test helpers
 * so a fresh test does not inherit the previous test's hook (which may be
 * bound to a closed/disposed DB).
 */
export function clearEncounterCascadeHook(): void {
  registeredHook = null;
}

/**
 * Internal — called by ForceRepository.deleteForce. Returns true if a hook
 * was registered AND the cascade ran without throwing; returns false if no
 * hook is registered (so the caller can fall back to legacy non-cascade
 * behavior, e.g. during cold-start before the encounter module is loaded).
 *
 * If the hook throws, the exception propagates so the surrounding SQLite
 * transaction rolls back. Callers SHALL NOT swallow the exception — that
 * would defeat the rollback contract.
 */
export function invokeEncounterCascadeHook(forceId: string): boolean {
  if (!registeredHook) return false;
  registeredHook(forceId);
  return true;
}
