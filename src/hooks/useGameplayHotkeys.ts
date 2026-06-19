/**
 * useGameplayHotkeys - attaches document-level keydown handlers for
 * camera pan/zoom, overlay toggles, unit focus recenter, and the
 * hotkey help overlay.
 *
 * Why a dedicated hook rather than scattered listeners:
 *   - Spec section 3 defines a single consolidated hotkey contract; having
 *     one effect that owns the listener makes precedence explicit
 *     (Esc first, then modal-guarded keys, then camera keys).
 *   - Esc must close modal overlays and clear hover state even while
 *     other keys are suppressed. A single handler sees the whole
 *     state bag and can act accordingly.
 *
 * @spec openspec/changes/add-minimap-and-camera-controls/specs/camera-controls/spec.md
 */

import { useEffect } from 'react';

import type { CameraControls } from './useCameraControls';

type PanDirection = Parameters<CameraControls['panByHex']>[0];

export interface UseGameplayHotkeysArgs {
  /** Camera action surface (from `useCameraControls`). */
  readonly camera: CameraControls;
  /** Currently-selected unit's hex; Space recenters on this. */
  readonly selectedUnitHex: { q: number; r: number } | null;
  /** Toggle minimap visibility (M hotkey). */
  readonly onToggleMinimap: () => void;
  /** Toggle firing-arc overlay (A hotkey). */
  readonly onToggleArcs: () => void;
  /** Toggle LOS overlay (L hotkey). */
  readonly onToggleLOS: () => void;
  /** Open/close the hotkey help overlay (? hotkey). */
  readonly onToggleHelp: () => void;
  /** Close all modal overlays, clear hover state (Esc hotkey). */
  readonly onEscape: () => void;
  /**
   * Whether a modal overlay is currently open. When true, most
   * hotkeys are suppressed (so typing in a dialog input doesn't
   * stutter the camera), but Esc and `?` still dispatch.
   */
  readonly modalOpen: boolean;
  /**
   * Whether the hook is enabled at all. Tests pass `false` to
   * disable the global listener in environments without a real
   * document.
   */
  readonly enabled?: boolean;
}

type GameplayHotkeyContext = Omit<
  UseGameplayHotkeysArgs,
  'enabled' | 'modalOpen'
>;

type GameplayHotkeyHandler = (
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
) => boolean;

const PAN_DIRECTION_BY_KEY: Readonly<Record<string, PanDirection>> = {
  w: 'up',
  W: 'up',
  ArrowUp: 'up',
  s: 'down',
  S: 'down',
  ArrowDown: 'down',
  a: 'left',
  ArrowLeft: 'left',
  d: 'right',
  D: 'right',
  ArrowRight: 'right',
};

const ZOOM_BY_KEY: Readonly<Record<string, 'in' | 'out'>> = {
  '+': 'in',
  '=': 'in',
  '-': 'out',
  _: 'out',
};

const TOGGLE_BY_KEY: Readonly<
  Record<string, (context: GameplayHotkeyContext) => void>
> = {
  m: (context) => context.onToggleMinimap(),
  M: (context) => context.onToggleMinimap(),
  A: (context) => context.onToggleArcs(),
  l: (context) => context.onToggleLOS(),
  L: (context) => context.onToggleLOS(),
};

const GAMEPLAY_HOTKEY_HANDLERS: readonly GameplayHotkeyHandler[] = [
  handlePanHotkey,
  handleZoomHotkey,
  handleRecenterHotkey,
  handleToggleHotkey,
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function preventDefaultAndRun(event: KeyboardEvent, action: () => void): void {
  event.preventDefault();
  action();
}

function isHelpKey(event: KeyboardEvent): boolean {
  return event.key === '?' || (event.shiftKey && event.key === '/');
}

function handleAlwaysAvailableHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): boolean {
  if (event.key === 'Escape') {
    context.onEscape();
    return true;
  }

  if (isHelpKey(event)) {
    preventDefaultAndRun(event, context.onToggleHelp);
    return true;
  }

  return false;
}

function handlePanHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): boolean {
  const direction = PAN_DIRECTION_BY_KEY[event.key];
  if (!direction) return false;

  preventDefaultAndRun(event, () => context.camera.panByHex(direction));
  return true;
}

function handleZoomHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): boolean {
  const zoom = ZOOM_BY_KEY[event.key];
  if (!zoom) return false;

  preventDefaultAndRun(event, () => {
    if (zoom === 'in') {
      context.camera.zoomIn();
    } else {
      context.camera.zoomOut();
    }
  });
  return true;
}

function handleRecenterHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): boolean {
  if (event.key !== ' ') return false;
  const selectedUnitHex = context.selectedUnitHex;
  if (selectedUnitHex) {
    preventDefaultAndRun(event, () => context.camera.centerOn(selectedUnitHex));
  }
  return true;
}

function handleToggleHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): boolean {
  const toggle = TOGGLE_BY_KEY[event.key];
  if (!toggle) return false;

  preventDefaultAndRun(event, () => toggle(context));
  return true;
}

function handleGameplayHotkey(
  event: KeyboardEvent,
  context: GameplayHotkeyContext,
): void {
  for (const handleHotkey of GAMEPLAY_HOTKEY_HANDLERS) {
    if (handleHotkey(event, context)) return;
  }
}

export function useGameplayHotkeys(args: UseGameplayHotkeysArgs): void {
  const {
    camera,
    selectedUnitHex,
    onToggleMinimap,
    onToggleArcs,
    onToggleLOS,
    onToggleHelp,
    onEscape,
    modalOpen,
    enabled = true,
  } = args;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const handler = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return;

      const context: GameplayHotkeyContext = {
        camera,
        selectedUnitHex,
        onToggleMinimap,
        onToggleArcs,
        onToggleLOS,
        onToggleHelp,
        onEscape,
      };

      if (handleAlwaysAvailableHotkey(event, context)) return;
      if (modalOpen) return;

      handleGameplayHotkey(event, context);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    enabled,
    camera,
    selectedUnitHex,
    onToggleMinimap,
    onToggleArcs,
    onToggleLOS,
    onToggleHelp,
    onEscape,
    modalOpen,
  ]);
}
