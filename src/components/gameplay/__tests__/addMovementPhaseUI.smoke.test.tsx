/**
 * Per-change smoke test for add-movement-phase-ui.
 *
 * Asserts:
 * - MovementHeatPreview renders the Mek-style per-type heat values
 *   (Walk=+1, Run=+2, Jump=max(3,jumpMP), Stationary=0)
 *   and honors no-heat unit profiles.
 * - HEX_COLORS exposes per-movement-type tile colors (walk/run/jump)
 *
 * @spec openspec/changes/add-movement-phase-ui/tasks.md § 3, § 9
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { MovementHeatPreview } from '@/components/gameplay/MovementHeatPreview';
import { HEX_COLORS } from '@/constants/hexMap';
import { MovementType } from '@/types/gameplay';

describe('add-movement-phase-ui — smoke test', () => {
  describe('MovementHeatPreview', () => {
    it('renders +1 heat for Walk', () => {
      render(<MovementHeatPreview movementType={MovementType.Walk} />);
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('1');
      expect(preview.textContent).toContain('+1');
      expect(preview.textContent).toContain('Walk');
    });

    it('renders +2 heat for Run', () => {
      render(<MovementHeatPreview movementType={MovementType.Run} />);
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('2');
      expect(preview.textContent).toContain('+2');
      expect(preview.textContent).toContain('Run');
    });

    it('renders +3 heat for Jump with 0 jumpHexes (min floor of 3)', () => {
      render(
        <MovementHeatPreview movementType={MovementType.Jump} jumpHexes={0} />,
      );
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('3');
      expect(preview.textContent).toContain('+3');
    });

    it('renders +max(jumpMP) heat for Jump beyond 3 hexes', () => {
      render(
        <MovementHeatPreview movementType={MovementType.Jump} jumpHexes={5} />,
      );
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('5');
      expect(preview.textContent).toContain('+5');
    });

    it('renders 0 heat for Stationary', () => {
      render(<MovementHeatPreview movementType={MovementType.Stationary} />);
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('0');
      // No "+" prefix when heat is 0
      expect(preview.textContent).toContain('0');
      expect(preview.textContent).not.toContain('+0');
    });

    it('renders 0 fallback heat for non-Mek movement profiles', () => {
      render(
        <MovementHeatPreview
          movementType={MovementType.Walk}
          movementHeatProfile="none"
        />,
      );
      const preview = screen.getByTestId('movement-heat-preview');
      expect(preview.dataset.heat).toBe('0');
      expect(preview.textContent).toContain('0');
      expect(preview.textContent).not.toContain('+1');
    });
  });

  describe('HEX_COLORS movement-type palette (task 3.2-3.4)', () => {
    it('exposes per-movement-type tile colors', () => {
      // MegaMek movement reference: cyan=Walk, yellow=Run, red=Jump.
      expect(HEX_COLORS.movementRangeWalk).toBe('#67e8f9');
      expect(HEX_COLORS.movementRangeRun).toBe('#fef08a');
      expect(HEX_COLORS.movementRangeJump).toBe('#f87171');
      expect(HEX_COLORS.movementRangeUnreachable).toBe('#64748b');
      // Legacy uniform color preserved for backwards compat
      expect(HEX_COLORS.movementRange).toBeDefined();
    });
  });
});
