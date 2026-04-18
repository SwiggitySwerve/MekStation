/**
 * Per-change smoke test for add-damage-feedback-ui.
 *
 * Asserts:
 * - ArmorPip's `justDamaged` prop renders the red-flash overlay
 *   (with diagonal-hatch pattern for colorblind safety) and clears
 *   it after the 400ms window
 * - Damage entry formatters produce human-readable strings with
 *   leading glyphs (✓ hit, ⚠ critical, ✕ destroyed) per spec § 9.5
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 2, § 4, § 9
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import type {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import { ArmorPip } from '@/components/gameplay/ArmorPip';
import {
  formatCriticalEntry,
  formatDamageEntry,
  formatPilotHitEntry,
  formatUnitDestroyedEntry,
  humanLocation,
} from '@/components/gameplay/damageFeedback';

describe('add-damage-feedback-ui — smoke test', () => {
  describe('ArmorPip justDamaged flash overlay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not render the flash overlay when justDamaged is false', () => {
      render(
        <ArmorPip state="filled" onToggle={jest.fn()} justDamaged={false} />,
      );
      expect(
        screen.queryByTestId('armor-pip-damage-flash'),
      ).not.toBeInTheDocument();
    });

    it('renders the flash overlay when justDamaged is true', () => {
      render(
        <ArmorPip state="filled" onToggle={jest.fn()} justDamaged={true} />,
      );
      const flash = screen.getByTestId('armor-pip-damage-flash');
      expect(flash).toBeInTheDocument();
      // Colorblind-safe pattern reinforcement (task 9.1)
      expect(flash.style.backgroundImage).toContain(
        'repeating-linear-gradient',
      );
    });

    it('auto-clears the flash overlay after 400ms', () => {
      render(
        <ArmorPip state="filled" onToggle={jest.fn()} justDamaged={true} />,
      );
      expect(screen.getByTestId('armor-pip-damage-flash')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(
        screen.queryByTestId('armor-pip-damage-flash'),
      ).not.toBeInTheDocument();
    });
  });

  describe('humanLocation', () => {
    it('title-cases simple locations', () => {
      expect(humanLocation('center_torso')).toBe('Center Torso');
      expect(humanLocation('left_arm')).toBe('Left Arm');
    });

    it('formats rear armor locations with the (Rear) suffix', () => {
      expect(humanLocation('left_torso_rear')).toBe('Left Torso (Rear)');
      expect(humanLocation('center_torso_rear')).toBe('Center Torso (Rear)');
    });
  });

  describe('formatDamageEntry', () => {
    const resolveName = (id: string) =>
      ({ hbk: 'Hunchback', mad: 'Marauder' })[id] ?? id;

    it('formats a normal hit with the ✓ glyph', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'mad',
        location: 'center_torso',
        damage: 5,
        armorRemaining: 15,
        structureRemaining: 16,
        locationDestroyed: false,
      };
      const entry = formatDamageEntry(payload, resolveName);
      expect(entry).toContain('✓');
      expect(entry).toContain('Marauder');
      expect(entry).toContain('5 damage');
      expect(entry).toContain('Center Torso');
    });

    it('emits the destruction message + ✕ glyph when locationDestroyed', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'mad',
        location: 'left_arm',
        damage: 8,
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      };
      const entry = formatDamageEntry(payload, resolveName);
      expect(entry).toContain('✕');
      expect(entry).toContain('location destroyed');
    });

    it('flags armor breach when armor=0 but structure remains', () => {
      const payload: IDamageAppliedPayload = {
        unitId: 'mad',
        location: 'right_torso',
        damage: 5,
        armorRemaining: 0,
        structureRemaining: 11,
        locationDestroyed: false,
      };
      expect(formatDamageEntry(payload, resolveName)).toContain(
        'armor breached',
      );
    });
  });

  describe('formatCriticalEntry', () => {
    it('formats critical hits with the ⚠ glyph and component name', () => {
      const payload: ICriticalHitResolvedPayload = {
        unitId: 'mad',
        location: 'center_torso',
        slotIndex: 3,
        componentType: 'engine',
        componentName: 'Fusion Engine',
        effect: 'engine_hit',
        destroyed: true,
      };
      const entry = formatCriticalEntry(payload, () => 'Marauder');
      expect(entry).toContain('⚠');
      expect(entry).toContain('Fusion Engine');
      expect(entry).toContain('destroyed');
    });
  });

  describe('formatPilotHitEntry', () => {
    it('formats pilot wound with ⚠ + wound count', () => {
      const payload: IPilotHitPayload = {
        unitId: 'mad',
        wounds: 1,
        totalWounds: 2,
        source: 'head_hit',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: true,
      };
      const entry = formatPilotHitEntry(payload, () => 'Marauder');
      expect(entry).toContain('⚠');
      expect(entry).toContain('1 hit');
      expect(entry).toContain('2/6');
    });

    it('formats pilot death with ✕ at 6+ wounds', () => {
      const payload: IPilotHitPayload = {
        unitId: 'mad',
        wounds: 1,
        totalWounds: 6,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      };
      const entry = formatPilotHitEntry(payload, () => 'Marauder');
      expect(entry).toContain('✕');
      expect(entry).toContain('Pilot killed');
    });

    it('marks unconscious when consciousness check fails', () => {
      const payload: IPilotHitPayload = {
        unitId: 'mad',
        wounds: 1,
        totalWounds: 3,
        source: 'head_hit',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      };
      expect(formatPilotHitEntry(payload, () => 'Marauder')).toContain(
        'unconscious',
      );
    });
  });

  describe('formatUnitDestroyedEntry', () => {
    it('formats unit destruction with ✕ and a human-readable cause', () => {
      const payload: IUnitDestroyedPayload = {
        unitId: 'mad',
        cause: 'ammo_explosion',
      };
      const entry = formatUnitDestroyedEntry(payload, () => 'Marauder');
      expect(entry).toContain('✕');
      expect(entry).toContain('Marauder destroyed');
      expect(entry).toContain('ammo explosion');
    });
  });
});
