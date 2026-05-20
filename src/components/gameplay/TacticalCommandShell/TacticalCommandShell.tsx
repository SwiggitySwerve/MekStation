/**
 * TacticalCommandShell — the React context provider for the Tactical UI shell.
 *
 * Authored in Wave 7.1 PR-B as the runtime substrate that the PR-A slot
 * registry hook plugs into. The shell does NOT change the rendered DOM in
 * PR-B; it provides the registry context that `ShellSlot` consumes to
 * declare slot ownership without forcing layout rewrites. PR-C wires
 * shellMode flag through this context to drive mode-aware rendering.
 *
 * Per the shell spec's "Map-Dominant Visual Priority" requirement, the
 * shell intentionally has NO border chrome of its own — it is a logical
 * container, not a visual one. The hosting layout (currently
 * `GameplayLayout`) owns the visible flex tree; the shell just provides
 * the registry for slot-owner declarations.
 *
 * @spec openspec/changes/add-tactical-command-shell/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-command-shell/tasks.md §2.1, §2.2
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';

import type {
  PlayerId,
  ShellMode,
} from '@/types/gameplay/TacticalShellInterfaces';

import {
  useShellSlotRegistry,
  type IShellSlotRegistry,
} from './useShellSlotRegistry';

/**
 * Bundle of shell-managed state exposed to consumers via React context.
 *
 * PR-B exposes only the registry and the static `viewerPlayerId` /
 * `shellMode` props. PR-C extends this with mutable shell state (tray
 * collapsed, pinned panels, etc.) once the persistence scope is wired.
 */
export interface ITacticalShellContext {
  /** Shell slot registry; consumers register/unregister slot owners. */
  readonly registry: IShellSlotRegistry;
  /** Local viewer's player id. Drives intel projection in target inspectors. */
  readonly viewerPlayerId: PlayerId;
  /** Current shell rendering mode. PR-B always passes 'combat'. */
  readonly shellMode: ShellMode;
}

const ShellContext = createContext<ITacticalShellContext | null>(null);

export interface TacticalCommandShellProps {
  /** Local viewer's player id (required — shell contract carries it from day 1). */
  viewerPlayerId: PlayerId;
  /** Shell rendering mode. Defaults to 'combat'. */
  shellMode?: ShellMode;
  /** Hosting layout subtree (the existing GameplayLayout, today). */
  children: ReactNode;
}

/**
 * Provide the tactical command shell context to a layout subtree.
 *
 * Add this AT or NEAR THE ROOT of the gameplay layout — once per match
 * route. Adding it deeper (inside individual sections) defeats the
 * "one primary home" rule because each subtree gets its own registry.
 */
export function TacticalCommandShell({
  viewerPlayerId,
  shellMode = 'combat',
  children,
}: TacticalCommandShellProps): ReactElement {
  const registry = useShellSlotRegistry();
  const value: ITacticalShellContext = { registry, viewerPlayerId, shellMode };
  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

/**
 * Hook for consuming the tactical command shell context.
 *
 * Throws if called outside a `TacticalCommandShell` — defends against
 * silent misuse where a slot owner mounts without the shell in its
 * ancestry and its register call silently no-ops.
 */
export function useTacticalShell(): ITacticalShellContext {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error(
      'useTacticalShell() must be called inside a <TacticalCommandShell>',
    );
  }
  return ctx;
}

/**
 * Convenience hook for the most common consumer: the slot registry alone.
 */
export function useShellSlotRegistryContext(): IShellSlotRegistry {
  return useTacticalShell().registry;
}
