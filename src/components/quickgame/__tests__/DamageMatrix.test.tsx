import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IGameEvent } from '@/types/gameplay';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';

import { DamageMatrix } from '../DamageMatrix';

function createMockUnit(
  overrides: Partial<IQuickGameUnit> = {},
): IQuickGameUnit {
  return {
    instanceId: 'unit-1',
    sourceUnitId: 'atlas-as7d',
    name: 'Atlas AS7-D',
    chassis: 'Atlas',
    variant: 'AS7-D',
    bv: 1897,
    tonnage: 100,
    gunnery: 4,
    piloting: 5,
    maxArmor: { head: 9 },
    maxStructure: { head: 3 },
    armor: { head: 9 },
    structure: { head: 3 },
    heat: 0,
    isDestroyed: false,
    isWithdrawn: false,
    ...overrides,
  };
}

function createDamageEvent(
  sourceUnitId: string | undefined,
  targetUnitId: string,
  damage: number,
  eventId: string = `event-${Math.random()}`,
): IGameEvent {
  return {
    id: eventId,
    gameId: 'test-game',
    sequence: 1,
    timestamp: '2025-01-01T00:00:00Z',
    type: GameEventType.DamageApplied,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: targetUnitId,
      location: 'center_torso',
      damage,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
      sourceUnitId,
    },
  };
}

function createNonDamageEvent(): IGameEvent {
  return {
    id: 'event-start',
    gameId: 'test-game',
    sequence: 1,
    timestamp: '2025-01-01T00:00:00Z',
    type: GameEventType.GameStarted,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {
      firstSide: GameSide.Player,
    },
  };
}

describe('DamageMatrix', () => {
  describe('Empty State', () => {
    it('renders empty state when no damage events', () => {
      render(<DamageMatrix events={[]} units={[]} />);

      expect(screen.getByText('No damage dealt')).toBeInTheDocument();
      expect(
        screen.getByText('No combat damage was recorded in this battle.'),
      ).toBeInTheDocument();
    });

    it('renders empty state when events exist but no damage events', () => {
      render(<DamageMatrix events={[createNonDamageEvent()]} units={[]} />);

      expect(screen.getByText('No damage dealt')).toBeInTheDocument();
    });
  });

  describe('Unit Names Display', () => {
    it('displays unit names in headers when units are provided', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Atlas' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Centurion' });
      const units = [unit1, unit2];

      const events = [createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1')];

      render(<DamageMatrix events={events} units={units} />);

      expect(screen.getByText('Atlas')).toBeInTheDocument();
      expect(screen.getByText('Centurion')).toBeInTheDocument();
    });

    it('falls back to instanceId when unit not found', () => {
      const events = [createDamageEvent('unknown', 'target', 10, 'dmg-1')];

      render(<DamageMatrix events={events} units={[]} />);

      expect(screen.getByText('unknown')).toBeInTheDocument();
      expect(screen.getByText('target')).toBeInTheDocument();
    });

    it('truncates long unit names with ellipsis', () => {
      const longNameUnit = createMockUnit({
        instanceId: 'unit-1',
        name: 'Battlemaster BLR-1G',
      });
      const targetUnit = createMockUnit({
        instanceId: 'unit-2',
        name: 'Atlas',
      });

      const events = [createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1')];

      render(
        <DamageMatrix events={events} units={[longNameUnit, targetUnit]} />,
      );

      const header = screen.getByTitle('Battlemaster BLR-1G');
      expect(header).toBeInTheDocument();
      expect(header.textContent).toContain('…');
    });
  });

  describe('Damage Values Display', () => {
    it('shows damage values in cells', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [createDamageEvent('unit-1', 'unit-2', 25, 'dmg-1')];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      const cells = screen.getAllByText('25');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('aggregates multiple damage events between same units', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [
        createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1'),
        createDamageEvent('unit-1', 'unit-2', 15, 'dmg-2'),
        createDamageEvent('unit-1', 'unit-2', 5, 'dmg-3'),
      ];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      const cells = screen.getAllByText('30');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Self-Damage Highlighting', () => {
    it('highlights self-damage cells with different styling', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });

      const events = [createDamageEvent('unit-1', 'unit-1', 5, 'dmg-1')];

      render(<DamageMatrix events={events} units={[unit1]} />);

      const selfDamageCell = screen.getByTestId('self-damage-cell');
      expect(selfDamageCell).toBeInTheDocument();
      expect(selfDamageCell).toHaveClass('bg-gray-700');
    });
  });

  describe('Row and Column Totals', () => {
    it('shows Total Dealt column header', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1')];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      expect(screen.getByText('Total Dealt')).toBeInTheDocument();
    });

    it('shows Total Received row header', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1')];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      expect(screen.getByText('Total Received')).toBeInTheDocument();
    });

    it('calculates correct row totals (damage dealt)', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });
      const unit3 = createMockUnit({ instanceId: 'unit-3', name: 'Unit C' });

      const events = [
        createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1'),
        createDamageEvent('unit-1', 'unit-3', 15, 'dmg-2'),
      ];

      render(<DamageMatrix events={events} units={[unit1, unit2, unit3]} />);

      const cells = screen.getAllByText('25');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('calculates correct column totals (damage received)', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [
        createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1'),
        createDamageEvent('unit-1', 'unit-2', 20, 'dmg-2'),
      ];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      const cells = screen.getAllByText('30');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('shows grand total in corner cell', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const unit2 = createMockUnit({ instanceId: 'unit-2', name: 'Unit B' });

      const events = [
        createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1'),
        createDamageEvent('unit-2', 'unit-1', 15, 'dmg-2'),
      ];

      render(<DamageMatrix events={events} units={[unit1, unit2]} />);

      const cells = screen.getAllByText('25');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has data-testid for matrix container', () => {
      const unit1 = createMockUnit({ instanceId: 'unit-1', name: 'Unit A' });
      const events = [createDamageEvent('unit-1', 'unit-1', 5, 'dmg-1')];

      render(<DamageMatrix events={events} units={[unit1]} />);

      expect(screen.getByTestId('damage-matrix')).toBeInTheDocument();
    });

    it('provides title attributes with full unit names', () => {
      const longNameUnit = createMockUnit({
        instanceId: 'unit-1',
        name: 'Battlemaster BLR-1G',
      });
      const targetUnit = createMockUnit({
        instanceId: 'unit-2',
        name: 'Atlas AS7-D',
      });

      const events = [createDamageEvent('unit-1', 'unit-2', 10, 'dmg-1')];

      render(
        <DamageMatrix events={events} units={[longNameUnit, targetUnit]} />,
      );

      expect(screen.getByTitle('Battlemaster BLR-1G')).toBeInTheDocument();
      expect(screen.getByTitle('Atlas AS7-D')).toBeInTheDocument();
    });
  });
});
