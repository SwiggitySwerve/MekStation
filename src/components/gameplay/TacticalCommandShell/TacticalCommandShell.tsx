/**
 * TacticalCommandShell — the React context provider for the Tactical UI shell.
 *
 * PR-A introduced the slot registry.
 * PR-B added the context provider + ShellSlot wrapper.
 * PR-C (this file) extends the context with mutable shell state, setter API,
 *   per-match sessionStorage persistence, and shellMode-driven slot filtering.
 *
 * Per the shell spec's "Map-Dominant Visual Priority" requirement, the
 * shell intentionally has NO border chrome of its own — it is a logical
 * container, not a visual one. The hosting layout (`GameplayLayout` for
 * combat / replay / gm; `SpectatorView` for spectator) owns the visible
 * flex tree; the shell provides the registry + state for slot owners.
 *
 * @spec openspec/changes/add-tactical-command-shell/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-command-shell/tasks.md §2.3, §3.1, §3.2
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import {
  createDefaultShellState,
  type IElectedSpotter,
  type ITacticalShellState,
  type PlayerId,
  type ShellMode,
} from '@/types/gameplay/TacticalShellInterfaces';

import {
  useShellSlotRegistry,
  type IShellSlotRegistry,
} from './useShellSlotRegistry';

/**
 * Subset of `ITacticalShellState` fields that survive across page reloads
 * and route swaps for the same match (per task 2.3 — "persistence scoped
 * to the current match"). Selected/active/inspected unit references are
 * session-runtime only and intentionally NOT persisted; they re-derive
 * from interactive-session state on mount.
 */
interface IPersistedShellSlice {
  leftTrayCollapsed: boolean;
  rightTrayPinned: boolean;
  bottomDockActiveTab: string | null;
}

const PERSISTED_KEYS = [
  'leftTrayCollapsed',
  'rightTrayPinned',
  'bottomDockActiveTab',
] as const satisfies readonly (keyof IPersistedShellSlice)[];

const STORAGE_KEY_PREFIX = 'tactical-shell:';

function storageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

/**
 * Bundle of shell-managed state exposed to consumers via React context.
 *
 * Static (set once at mount):
 *   - registry / viewerPlayerId / shellMode / sessionId
 *
 * Mutable (driven by user interaction; persisted slice survives reload):
 *   - state — current ITacticalShellState
 *   - updateState — partial-update merge with persistence side-effect
 */
export interface ITacticalShellContext {
  readonly registry: IShellSlotRegistry;
  readonly viewerPlayerId: PlayerId;
  readonly shellMode: ShellMode;
  /** Session id for sessionStorage persistence; null when not match-scoped. */
  readonly sessionId: string | null;
  /** Current shell state — the live single source of truth for slot UI. */
  readonly state: ITacticalShellState;
  /**
   * Merge a partial update into shell state. Persisted fields
   * (leftTrayCollapsed, rightTrayPinned, bottomDockActiveTab) are
   * written through to `sessionStorage` keyed by `sessionId`.
   */
  readonly updateState: (partial: Partial<ITacticalShellState>) => void;
}

const ShellContext = createContext<ITacticalShellContext | null>(null);

export interface TacticalCommandShellProps {
  /** Local viewer's player id (required — shell contract carries it from day 1). */
  viewerPlayerId: PlayerId;
  /** Shell rendering mode. Defaults to 'combat'. */
  shellMode?: ShellMode;
  /**
   * Match session id. When provided, persisted tray state is read from
   * and written to `sessionStorage` keyed by this id (per task 2.3).
   * Pass `null`/omit for non-match shells (preview, storybook, tests).
   */
  sessionId?: string | null;
  /** Hosting layout subtree. */
  children: ReactNode;
}

/**
 * Read persisted tray state for a given session from `sessionStorage`.
 * Returns null if no persisted state exists, sessionStorage is
 * unavailable (SSR / private mode), or the stored value is malformed.
 */
function readPersistedSlice(
  sessionId: string | null,
): IPersistedShellSlice | null {
  if (!sessionId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).leftTrayCollapsed ===
        'boolean' &&
      typeof (parsed as Record<string, unknown>).rightTrayPinned === 'boolean'
    ) {
      const obj = parsed as Record<string, unknown>;
      return {
        leftTrayCollapsed: obj.leftTrayCollapsed as boolean,
        rightTrayPinned: obj.rightTrayPinned as boolean,
        bottomDockActiveTab:
          typeof obj.bottomDockActiveTab === 'string'
            ? (obj.bottomDockActiveTab as string)
            : null,
      };
    }
    return null;
  } catch {
    // Corrupt JSON or sessionStorage throw — fall through to defaults.
    return null;
  }
}

function writePersistedSlice(
  sessionId: string | null,
  slice: IPersistedShellSlice,
): void {
  if (!sessionId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(sessionId), JSON.stringify(slice));
  } catch {
    // sessionStorage can throw on quota exceeded or in restricted
    // browsing modes. Failing to persist is degradable — the UI keeps
    // working, just doesn't survive reload.
  }
}

/**
 * Provide the tactical command shell context to a layout subtree.
 *
 * Add this AT or NEAR THE ROOT of the gameplay/spectator layout — once
 * per match route. Adding it deeper (inside individual sections)
 * defeats the "one primary home" rule because each subtree gets its
 * own registry.
 */
export function TacticalCommandShell({
  viewerPlayerId,
  shellMode = 'combat',
  sessionId = null,
  children,
}: TacticalCommandShellProps): ReactElement {
  const registry = useShellSlotRegistry();

  // Lazy-init: the persistence read runs exactly once per shell mount,
  // and the resulting state seeds React state. Subsequent updates flow
  // through `updateState` → setState → useEffect write-through.
  const [state, setState] = useState<ITacticalShellState>(() => {
    const base = createDefaultShellState(viewerPlayerId);
    const persisted = readPersistedSlice(sessionId);
    if (!persisted) return base;
    return {
      ...base,
      leftTrayCollapsed: persisted.leftTrayCollapsed,
      rightTrayPinned: persisted.rightTrayPinned,
      bottomDockActiveTab: persisted.bottomDockActiveTab,
    };
  });

  // Track the previous persisted slice so the write-through useEffect
  // skips writes when nothing in the persistable slice changed (the
  // unit-reference triple mutates much more often than tray state).
  const lastPersistedRef = useRef<IPersistedShellSlice>({
    leftTrayCollapsed: state.leftTrayCollapsed,
    rightTrayPinned: state.rightTrayPinned,
    bottomDockActiveTab: state.bottomDockActiveTab,
  });

  // Persist on change to the slice we care about.
  useEffect(() => {
    const slice: IPersistedShellSlice = {
      leftTrayCollapsed: state.leftTrayCollapsed,
      rightTrayPinned: state.rightTrayPinned,
      bottomDockActiveTab: state.bottomDockActiveTab,
    };
    const prev = lastPersistedRef.current;
    const changed = PERSISTED_KEYS.some((k) => slice[k] !== prev[k]);
    if (!changed) return;
    lastPersistedRef.current = slice;
    writePersistedSlice(sessionId, slice);
  }, [
    state.leftTrayCollapsed,
    state.rightTrayPinned,
    state.bottomDockActiveTab,
    sessionId,
  ]);

  const updateState = useCallback((partial: Partial<ITacticalShellState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Wave 8 PR-K8 — G1: subscribe to IndirectFireSpotterSelected /
  // IndirectFireSpotterLost events from the gameplay store and project
  // them into `electedSpotters` for token-ring / inspector consumption.
  // Cleared on turn rollover so stale spotter visuals don't persist.
  const session = useGameplayStore((s) => s.session);
  const lastProcessedEventIndex = useRef<number>(0);
  const lastSeenTurn = useRef<number | null>(null);

  useEffect(() => {
    if (!session) return;
    const events = session.events;
    const currentTurn = session.currentState?.turn ?? null;

    // Turn rollover → clear elected spotters.
    if (
      lastSeenTurn.current !== null &&
      currentTurn !== null &&
      currentTurn !== lastSeenTurn.current
    ) {
      setState((prev) =>
        prev.electedSpotters.length === 0
          ? prev
          : { ...prev, electedSpotters: [] },
      );
    }
    lastSeenTurn.current = currentTurn;

    // Walk new events since last process. Process Selected/Lost in order.
    const startIdx = lastProcessedEventIndex.current;
    if (startIdx >= events.length) return;

    let nextSpotters: IElectedSpotter[] | null = null;
    for (let i = startIdx; i < events.length; i++) {
      const evt = events[i];
      if (evt.type === GameEventType.IndirectFireSpotterSelected) {
        const p = evt.payload as {
          attackerId: string;
          spotterId: string;
        };
        if (!nextSpotters) nextSpotters = [...state.electedSpotters];
        // Idempotent: skip if pair already present.
        const exists = nextSpotters.some(
          (s) => s.spotterId === p.spotterId && s.attackerId === p.attackerId,
        );
        if (!exists) {
          nextSpotters.push({
            spotterId: p.spotterId,
            attackerId: p.attackerId,
          });
        }
      } else if (evt.type === GameEventType.IndirectFireSpotterLost) {
        const p = evt.payload as { attackerId: string; spotterId: string };
        if (!nextSpotters) nextSpotters = [...state.electedSpotters];
        nextSpotters = nextSpotters.filter(
          (s) =>
            !(s.spotterId === p.spotterId && s.attackerId === p.attackerId),
        );
      }
    }
    lastProcessedEventIndex.current = events.length;

    if (nextSpotters !== null) {
      setState((prev) => ({ ...prev, electedSpotters: nextSpotters! }));
    }
  }, [session, state.electedSpotters]);

  // Memoize context value so consumers don't churn re-renders when no
  // shell-relevant prop changed. The state object identity changes on
  // every updateState call, which IS what we want — that's the
  // re-render signal for slot owners that subscribe to shell state.
  const value = useMemo<ITacticalShellContext>(
    () => ({
      registry,
      viewerPlayerId,
      shellMode,
      sessionId,
      state,
      updateState,
    }),
    [registry, viewerPlayerId, shellMode, sessionId, state, updateState],
  );

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

/**
 * Non-throwing accessor for elected-spotter state (PR-K8 — G1).
 *
 * Unlike `useTacticalShell()`, this hook returns an empty array when
 * called outside a `<TacticalCommandShell>` — used by token / inspector
 * components that may also render in storybook / standalone test
 * contexts where wrapping the whole shell would be over-scaffolding.
 *
 * Inside a shell, returns the live `electedSpotters` list (event-driven
 * projection of `IndirectFireSpotterSelected` / `IndirectFireSpotterLost`).
 */
export function useElectedSpotters(): readonly IElectedSpotter[] {
  const ctx = useContext(ShellContext);
  return ctx?.state.electedSpotters ?? [];
}
