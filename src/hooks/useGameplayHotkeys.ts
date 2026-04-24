/**
 * useGameplayHotkeys — attaches document-level keydown handlers for
 * camera pan/zoom, overlay toggles, unit focus recenter, and the
 * hotkey help overlay.
 *
 * Why a dedicated hook rather than scattered listeners:
 *   - Spec § 3 defines a single consolidated hotkey contract; having
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

export interface UseGameplayHotkeysArgs {
  /** Camera action surface (from `useCameraControls`). */
  readonly camera: CameraControls;
  /** Currently-selected unit's hex — Space recenters on this. */
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

/**
 * Is the event's target a form control where the user is typing?
 * We do NOT want the camera to drift while the user types in a
 * search box or pilot-name field. React-testing-library fires
 * keydowns on a body-level handler even when the test's focused
 * element is a textarea, so this check is load-bearing.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
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

    const handler = (e: KeyboardEvent): void => {
      // Never steal keystrokes from form inputs. The user might be
      // typing `a` into an input and a running camera pan would be
      // extremely annoying.
      if (isTypingTarget(e.target)) return;

      // Esc and `?` still fire while a modal is open — otherwise the
      // user would have no way to dismiss the help overlay with the
      // keyboard.
      if (e.key === 'Escape') {
        onEscape();
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      if (modalOpen) return;

      switch (e.key) {
        // Camera pan — WASD + arrow keys. preventDefault on arrows
        // so the browser doesn't also scroll the page.
        case 'w':
        case 'W':
        case 'ArrowUp':
          e.preventDefault();
          camera.panByHex('up');
          return;
        case 's':
        case 'S':
        case 'ArrowDown':
          e.preventDefault();
          camera.panByHex('down');
          return;
        case 'a':
        case 'ArrowLeft':
          // Lowercase 'a' = pan left; uppercase 'A' = toggle firing
          // arcs (see below). The two collide by design per spec.
          if (e.key === 'a') {
            e.preventDefault();
            camera.panByHex('left');
            return;
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          camera.panByHex('right');
          return;
      }

      // Uppercase-sensitive keys come after the arrow-key block so
      // arrow keys don't accidentally fall through.
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          camera.zoomIn();
          return;
        case '-':
        case '_':
          e.preventDefault();
          camera.zoomOut();
          return;
        case ' ':
          // Space recenters on the selected unit. No-op when no unit
          // is selected per spec scenario.
          if (selectedUnitHex) {
            e.preventDefault();
            camera.centerOn(selectedUnitHex);
          }
          return;
        case 'm':
        case 'M':
          e.preventDefault();
          onToggleMinimap();
          return;
        case 'A':
          // Uppercase A = firing arcs toggle. Lowercase 'a' is the
          // pan-left key handled above.
          e.preventDefault();
          onToggleArcs();
          return;
        case 'l':
        case 'L':
          e.preventDefault();
          onToggleLOS();
          return;
        default:
          return;
      }
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
