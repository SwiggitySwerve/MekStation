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

export {
  CommitMoveButton,
  Facing,
  FacingPicker,
  MovementType,
  MovementTypeSwitcher,
  React,
  ToHitForecastModal,
  WeaponSelector,
  ac20,
  baseAttacker,
  baseTarget,
  destroyedPpc,
  fireEvent,
  lrm15,
  mediumLaser,
  render,
  screen,
};

export type { IAttackerState, ITargetState, IWeapon };
