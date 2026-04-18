/**
 * Per-change smoke test for add-combat-phase-ui-flows.
 *
 * Covers:
 *  - MovementTypeSwitcher: button click flips active type, jump
 *    disabled when jumpMP === 0.
 *  - FacingPicker: clicking each direction calls `onSelect` with the
 *    correct Facing enum.
 *  - CommitMoveButton: disabled until ready, enabled on ready, click
 *    fires `onCommit`.
 *  - WeaponSelector: destroyed / no-ammo / out-of-range badges
 *    appear; toggling a weapon via checkbox calls `onToggle`.
 *  - ToHitForecastModal: renders TN + probability rows, footer
 *    Confirm Fire button calls `onConfirm`.
 *
 * @spec openspec/changes/add-combat-phase-ui-flows/tasks.md (in-flight)
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import { CommitMoveButton } from '@/components/gameplay/CommitMoveButton';
import { FacingPicker } from '@/components/gameplay/FacingPicker';
import { MovementTypeSwitcher } from '@/components/gameplay/MovementTypeSwitcher';
import { ToHitForecastModal } from '@/components/gameplay/ToHitForecastModal';
import { WeaponSelector } from '@/components/gameplay/WeaponSelector';
import { Facing, MovementType } from '@/types/gameplay';

// ---------------------------------------------------------------------------
// MovementTypeSwitcher
// ---------------------------------------------------------------------------

describe('MovementTypeSwitcher', () => {
  it('renders three buttons and marks the active one with aria-pressed', () => {
    const onChange = jest.fn();
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={0}
        onChange={onChange}
      />,
    );

    const walkBtn = screen.getByTestId('movement-type-walk');
    const runBtn = screen.getByTestId('movement-type-run');
    const jumpBtn = screen.getByTestId('movement-type-jump');

    expect(walkBtn).toHaveAttribute('aria-pressed', 'true');
    expect(runBtn).toHaveAttribute('aria-pressed', 'false');
    expect(jumpBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables Jump when jumpMP is 0', () => {
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={0}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('movement-type-jump')).toBeDisabled();
  });

  it('enables Jump when jumpMP > 0', () => {
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={4}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('movement-type-jump')).not.toBeDisabled();
  });

  it('fires onChange when a button is clicked', () => {
    const onChange = jest.fn();
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={4}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('movement-type-run'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Run);
    fireEvent.click(screen.getByTestId('movement-type-jump'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Jump);
  });
});

// ---------------------------------------------------------------------------
// FacingPicker
// ---------------------------------------------------------------------------

describe('FacingPicker', () => {
  it('renders all six facing buttons', () => {
    render(<FacingPicker selected={null} onSelect={jest.fn()} />);
    [
      Facing.North,
      Facing.Northeast,
      Facing.Southeast,
      Facing.South,
      Facing.Southwest,
      Facing.Northwest,
    ].forEach((f) => {
      expect(screen.getByTestId(`facing-${f}`)).toBeInTheDocument();
    });
  });

  it('marks the selected facing with aria-pressed=true', () => {
    render(<FacingPicker selected={Facing.South} onSelect={jest.fn()} />);
    expect(screen.getByTestId(`facing-${Facing.South}`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId(`facing-${Facing.North}`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls onSelect with the right Facing on each click', () => {
    const onSelect = jest.fn();
    render(<FacingPicker selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`facing-${Facing.Northeast}`));
    fireEvent.click(screen.getByTestId(`facing-${Facing.South}`));
    fireEvent.click(screen.getByTestId(`facing-${Facing.Northwest}`));
    expect(onSelect).toHaveBeenNthCalledWith(1, Facing.Northeast);
    expect(onSelect).toHaveBeenNthCalledWith(2, Facing.South);
    expect(onSelect).toHaveBeenNthCalledWith(3, Facing.Northwest);
  });
});

// ---------------------------------------------------------------------------
// CommitMoveButton
// ---------------------------------------------------------------------------

describe('CommitMoveButton', () => {
  it('is disabled when ready=false', () => {
    render(
      <CommitMoveButton
        ready={false}
        mpCost={3}
        movementType={MovementType.Walk}
        onCommit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('commit-move-button')).toBeDisabled();
  });

  it('is enabled when ready=true and fires onCommit on click', () => {
    const onCommit = jest.fn();
    render(
      <CommitMoveButton
        ready={true}
        mpCost={2}
        movementType={MovementType.Run}
        onCommit={onCommit}
      />,
    );
    const btn = screen.getByTestId('commit-move-button');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('renders a MovementHeatPreview chip with the right type', () => {
    render(
      <CommitMoveButton
        ready={true}
        mpCost={5}
        movementType={MovementType.Jump}
        jumpHexes={5}
        onCommit={jest.fn()}
      />,
    );
    const preview = screen.getByTestId('movement-heat-preview');
    expect(preview.dataset.heat).toBe('5');
    expect(preview.dataset.movementType).toBe(MovementType.Jump);
  });
});

// ---------------------------------------------------------------------------
// WeaponSelector
// ---------------------------------------------------------------------------

const mediumLaser: IWeapon = {
  id: 'med-laser-1',
  name: 'Medium Laser',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 5,
  heat: 3,
  minRange: 0,
  ammoPerTon: -1,
  destroyed: false,
};
const ac20: IWeapon = {
  id: 'ac20-1',
  name: 'AC/20',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 20,
  heat: 7,
  minRange: 0,
  ammoPerTon: 5,
  destroyed: false,
};
const lrm15: IWeapon = {
  id: 'lrm15-1',
  name: 'LRM-15',
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
  damage: 15,
  heat: 5,
  minRange: 6,
  ammoPerTon: 8,
  destroyed: false,
};
const destroyedPpc: IWeapon = {
  id: 'ppc-1',
  name: 'PPC',
  shortRange: 6,
  mediumRange: 12,
  longRange: 18,
  damage: 10,
  heat: 10,
  minRange: 3,
  ammoPerTon: -1,
  destroyed: true,
};

describe('WeaponSelector', () => {
  it('renders one row per weapon', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser, ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-row-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-row-ac20-1')).toBeInTheDocument();
  });

  it('shows the Destroyed badge on a destroyed weapon and disables its checkbox', () => {
    render(
      <WeaponSelector
        weapons={[destroyedPpc]}
        rangeToTarget={5}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-destroyed-ppc-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-ppc-1')).toBeDisabled();
  });

  it('shows the No-ammo badge when ammoRemaining is 0', () => {
    render(
      <WeaponSelector
        weapons={[ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{ 'ac20-1': 0 }}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-no-ammo-ac20-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-ac20-1')).toBeDisabled();
  });

  it('shows the Out-of-range badge for weapons beyond long range', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={20}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('weapon-out-of-range-med-laser-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-med-laser-1')).toBeDisabled();
  });

  it('shows the Out-of-range badge for weapons closer than minimum range', () => {
    render(
      <WeaponSelector
        weapons={[lrm15]}
        rangeToTarget={2}
        selectedWeaponIds={[]}
        ammo={{ 'lrm15-1': 8 }}
        onToggle={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('weapon-out-of-range-lrm15-1'),
    ).toBeInTheDocument();
  });

  it('renders ammo count for ammo-using weapons', () => {
    render(
      <WeaponSelector
        weapons={[ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{ 'ac20-1': 5 }}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('ammo-remaining-ac20-1')).toHaveTextContent(
      'Ammo: 5',
    );
  });

  it('fires onToggle when a checkbox is clicked', () => {
    const onToggle = jest.fn();
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('weapon-checkbox-med-laser-1'));
    expect(onToggle).toHaveBeenCalledWith('med-laser-1');
  });

  it('sums total heat for selected weapons in the footer', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser, ac20]}
        rangeToTarget={3}
        selectedWeaponIds={['med-laser-1', 'ac20-1']}
        ammo={{ 'ac20-1': 5 }}
        onToggle={jest.fn()}
      />,
    );
    // 3 (medium laser) + 7 (AC/20) = 10
    expect(screen.getByTestId('weapon-selector-total-heat')).toHaveTextContent(
      '+10',
    );
  });
});

// ---------------------------------------------------------------------------
// ToHitForecastModal
// ---------------------------------------------------------------------------

const baseAttacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Stationary,
  heat: 0,
  damageModifiers: [],
};
const baseTarget: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false,
};

describe('ToHitForecastModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <ToHitForecastModal
        open={false}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a TN + probability row per weapon when open', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('to-hit-forecast-modal')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-tn-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-prob-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('expected-hits-total')).toBeInTheDocument();
  });

  it('shows Out-of-range row for weapons beyond long range', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={50}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('forecast-row-med-laser-1')).toHaveTextContent(
      /out of range/i,
    );
  });

  it('fires onConfirm when Confirm Fire is clicked', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('forecast-confirm-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when Back is clicked', () => {
    const onClose = jest.fn();
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[]}
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('forecast-back-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
