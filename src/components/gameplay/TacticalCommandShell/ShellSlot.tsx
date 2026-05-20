/**
 * ShellSlot — declarative slot-owner registration wrapper.
 *
 * Wrap an existing JSX region in `<ShellSlot id="..." ownerId="...">` to
 * declare it as the owner of a named shell slot. The component is a
 * transparent Fragment — no wrapper DOM, no class names, no style. It
 * exists purely to register/unregister with the shell registry via
 * `useEffect`, so existing layout markup (CSS grid / flex trees) keeps
 * working unchanged.
 *
 * Per the shell spec's "Combat facts have one primary home" rule, slots
 * should have exactly one `primary: true` owner. ShellSlot defaults to
 * `primary={true}`; pass `primary={false}` for secondary peek surfaces.
 *
 * @spec openspec/changes/add-tactical-command-shell/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-command-shell/tasks.md §2.2
 */

import { useEffect, type ReactElement, type ReactNode } from 'react';

import type {
  ShellMode,
  SlotId,
} from '@/types/gameplay/TacticalShellInterfaces';

import { useShellSlotRegistryContext } from './TacticalCommandShell';

export interface ShellSlotProps {
  /** Named shell slot id (top-band, map-center, right-tray, etc.). */
  id: SlotId;
  /** Stable identifier of the registering component. */
  ownerId: string;
  /**
   * True if this owner is the primary home for the slot's fact (default).
   * Pass `false` to register as a non-primary peek surface that yields
   * to any primary owner.
   */
  primary?: boolean;
  /**
   * Which shell modes render this owner. Empty array = all modes (default).
   */
  modes?: readonly ShellMode[];
  /** The visible JSX that fills the slot. */
  children: ReactNode;
}

/**
 * Register the wrapped children as an owner of the named shell slot.
 *
 * The wrapper is a React Fragment — it adds zero DOM. The registration
 * lives in a `useEffect` so it survives StrictMode double-invocation
 * and self-cleans on unmount via the unregister-with-ownerId-match
 * guard in `useShellSlotRegistry`.
 */
export function ShellSlot({
  id,
  ownerId,
  primary = true,
  modes,
  children,
}: ShellSlotProps): ReactElement {
  const registry = useShellSlotRegistryContext();

  useEffect(() => {
    // Snapshot of modes to keep the dep array stable when the caller
    // passes an inline array literal.
    const snapshot: readonly ShellMode[] = modes ?? [];
    registry.register(id, { ownerId, primary, modes: snapshot });
    return () => {
      registry.unregister(id, ownerId);
    };
  }, [id, ownerId, primary, modes, registry]);

  // Transparent Fragment — no DOM wrapper, no style, no class. Layout
  // markup in the host (today: GameplayLayout's flex tree) keeps
  // working unchanged.
  return <>{children}</>;
}
