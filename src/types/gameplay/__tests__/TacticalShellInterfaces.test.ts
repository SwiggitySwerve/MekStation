/**
 * Tests for the Tactical Command Shell type contract.
 *
 * These tests pin the shape of the public surface so that downstream
 * Wave 7 changes (action menu, turn rail, inspectors, lenses, intel UI,
 * accessibility) can rely on the listed slots, modes, and intel tiers
 * being present and exhaustive.
 *
 * @module types/gameplay/__tests__/TacticalShellInterfaces.test
 */

import {
  ALL_OPPONENT_INTEL_TIERS,
  ALL_SHELL_MODES,
  ALL_SLOT_IDS,
  createDefaultShellState,
  type OpponentIntelTier,
  type ShellMode,
  type SlotId,
} from '../TacticalShellInterfaces';

describe('TacticalShellInterfaces', () => {
  describe('ALL_SLOT_IDS', () => {
    it('contains the 9 shell slots from the spec', () => {
      // The shell spec enumerates these slots — adding a new slot is a
      // spec change first, code change second. This test fails loudly if
      // the enumeration drifts.
      expect(ALL_SLOT_IDS).toEqual([
        'top-band',
        'morale-band',
        'left-tray',
        'map-center',
        'right-tray',
        'bottom-dock',
        'feed',
        'minimap-cluster',
        'mobile-drawer',
      ]);
    });

    it('contains no duplicates', () => {
      const unique = new Set<SlotId>(ALL_SLOT_IDS);
      expect(unique.size).toBe(ALL_SLOT_IDS.length);
    });
  });

  describe('ALL_SHELL_MODES', () => {
    it('contains exactly the 4 modes from the spec', () => {
      // Per `Shell Mode Ownership` — combat / replay / spectator / GM.
      // Same shell chrome, mode-switched slot owners.
      expect(ALL_SHELL_MODES).toEqual(['combat', 'replay', 'spectator', 'gm']);
    });

    it('contains no duplicates', () => {
      const unique = new Set<ShellMode>(ALL_SHELL_MODES);
      expect(unique.size).toBe(ALL_SHELL_MODES.length);
    });
  });

  describe('ALL_OPPONENT_INTEL_TIERS', () => {
    // Wave 7.3 PR-H extended this from 5 → 7 tiers. 'gm' was added at
    // the top (privileged GM-shell view), and 'silhouette' was added
    // between 'last-known' and 'hidden' (chassis class only, no name).
    it('contains the 7 tiers from the opponent-intel spec', () => {
      expect(ALL_OPPONENT_INTEL_TIERS).toEqual([
        'gm',
        'exact',
        'rough',
        'last-known',
        'silhouette',
        'hidden',
        'unknown',
      ]);
    });

    it('contains no duplicates', () => {
      const unique = new Set<OpponentIntelTier>(ALL_OPPONENT_INTEL_TIERS);
      expect(unique.size).toBe(ALL_OPPONENT_INTEL_TIERS.length);
    });
  });

  describe('createDefaultShellState', () => {
    it('produces a valid combat-mode shell state for a single viewer', () => {
      const state = createDefaultShellState('player-1');

      expect(state.shellMode).toBe('combat');
      expect(state.viewerPlayerId).toBe('player-1');
      expect(state.selectedUnit).toBeNull();
      expect(state.activeUnit).toBeNull();
      expect(state.inspectedUnit).toBeNull();
      // Desktop lens tray defaults to collapsed (map reclaims the column).
      expect(state.leftTrayCollapsed).toBe(true);
      expect(state.rightTrayPinned).toBe(false);
      expect(state.bottomDockActiveTab).toBeNull();
      expect(state.activeContext.hoveredHexId).toBeNull();
      expect(state.activeContext.pinnedDrawerId).toBeNull();
      expect(state.opponentVisibilityScopes).toEqual({});
    });

    it('keeps the three unit references independent (not aliases)', () => {
      // Gate 4: selectedUnit / activeUnit / inspectedUnit MUST be three
      // independent fields. Setting one MUST NOT implicitly set another.
      // (This test exercises the shape; mutators that maintain the
      // invariant ship with PR-B when the shell wraps GameplayLayout.)
      const state = createDefaultShellState('player-1');
      const mutated = {
        ...state,
        selectedUnit: 'unit-a',
      };

      expect(mutated.selectedUnit).toBe('unit-a');
      expect(mutated.activeUnit).toBeNull();
      expect(mutated.inspectedUnit).toBeNull();
    });

    it('starts with an empty per-opponent scope map', () => {
      // Gate 1: viewerPlayerId + opponentVisibilityScopes ship from day
      // one but are empty for a single-viewer match (no opponents tracked
      // means no per-opponent redaction needed). Multi-viewer matches
      // populate the map at session start.
      const state = createDefaultShellState('player-1');
      expect(Object.keys(state.opponentVisibilityScopes)).toEqual([]);
    });
  });
});
