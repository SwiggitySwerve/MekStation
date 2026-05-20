/**
 * Shell slot registry hook for the Tactical Command Shell.
 *
 * Provides a stable registry handle that downstream Wave 7 surfaces use to
 * declare ownership of named layout slots. The registry is the *only*
 * mediator between shell-managed slot allocation and the components that
 * fill those slots — no component reaches "across" the shell to claim
 * coordinates directly (per PR #639's directive that engine state, not
 * screen coordinates, owns the contract).
 *
 * Per the shell spec's "one primary home" rule
 * (openspec/changes/add-tactical-command-shell/specs/tactical-map-interface/spec.md
 * `Combat facts have one primary home`), each slot SHALL have at most one
 * owner with `primary: true`. The registry enforces this by allowing a
 * primary registration to replace any prior owner; non-primary
 * registrations are dropped if a primary already holds the slot
 * (downstream secondary-peek tracking is out of scope for PR-A and ships
 * in a later wave).
 *
 * The hook is intentionally minimal in PR-A:
 *   - PR-A (this file): types + register/unregister/getOwner/listSlots/subscribe
 *   - PR-B: wraps GameplayLayout with the shell; calls register at slot mount
 *   - PR-C: wires shellMode flag into the registry to filter per-mode owners
 *
 * @spec openspec/changes/add-tactical-command-shell/tasks.md §1.2
 */

import { useMemo, useRef } from 'react';

import type {
  ISlotOwner,
  SlotId,
} from '@/types/gameplay/TacticalShellInterfaces';

/**
 * Public surface of the shell slot registry. Stable across re-renders —
 * the returned object is memoized once per hook lifetime and never
 * replaced.
 */
export interface IShellSlotRegistry {
  /**
   * Register an owner for a slot. Primary registrations replace any prior
   * owner; non-primary registrations are dropped if a primary already
   * holds the slot.
   */
  register(slot: SlotId, owner: ISlotOwner): void;
  /**
   * Remove an owner from a slot, but only if its `ownerId` matches the
   * current registration. No-op otherwise (defends against stale
   * unmount-order cleanup after a primary replaced a secondary).
   */
  unregister(slot: SlotId, ownerId: string): void;
  /** Read the current owner for a slot, or null if unregistered. */
  getOwner(slot: SlotId): ISlotOwner | null;
  /** List slots that currently have an owner. */
  listSlots(): readonly SlotId[];
  /**
   * Subscribe to registry changes. Returns an unsubscribe function. Used
   * by the shell renderer to re-evaluate slot assignments without React
   * re-render churn from per-owner state.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Create a shell slot registry handle. The hook returns the same registry
 * object across every render of the host component; the underlying
 * storage is a ref-backed Map and a ref-backed listener Set so identity
 * stays stable.
 */
export function useShellSlotRegistry(): IShellSlotRegistry {
  const ownersRef = useRef<Map<SlotId, ISlotOwner>>(new Map());
  const listenersRef = useRef<Set<() => void>>(new Set());

  // Memoize the public registry object exactly once. All mutations and
  // reads go through closures over the refs above, so the closure can
  // observe ref state changes without re-running this useMemo.
  return useMemo<IShellSlotRegistry>(() => {
    function notify(): void {
      // Snapshot the listener set before iteration so a listener that
      // unsubscribes during dispatch can't desync the loop.
      const snapshot = Array.from(listenersRef.current);
      for (const listener of snapshot) {
        listener();
      }
    }

    return {
      register(slot, owner) {
        const current = ownersRef.current.get(slot);
        // Per "one primary home": primary always wins. Non-primary loses
        // to an existing primary, but takes an empty slot.
        if (owner.primary) {
          ownersRef.current.set(slot, owner);
          notify();
          return;
        }
        if (!current) {
          ownersRef.current.set(slot, owner);
          notify();
        }
        // else: drop the non-primary attempt; primary holds the slot.
      },

      unregister(slot, ownerId) {
        const current = ownersRef.current.get(slot);
        if (current && current.ownerId === ownerId) {
          ownersRef.current.delete(slot);
          notify();
        }
      },

      getOwner(slot) {
        return ownersRef.current.get(slot) ?? null;
      },

      listSlots() {
        return Array.from(ownersRef.current.keys());
      },

      subscribe(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
    // Empty deps: the registry is intentionally stable for the lifetime
    // of the host component. All state lives in refs above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
