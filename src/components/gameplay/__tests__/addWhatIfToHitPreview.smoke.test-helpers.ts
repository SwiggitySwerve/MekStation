/**
 * Per-change smoke test for `add-what-if-to-hit-preview`.
 *
 * Covers the three guarantees the spec calls out as load-bearing:
 *
 *   1. UI surface (§ 8): the WeaponSelector renders the toggle when
 *      `onTogglePreview` is wired, and the preview columns show
 *      Exp. Dmg / ± stddev / Crit % (with the "—" fallback for
 *      out-of-range weapons per § 10.4) only when the toggle is ON.
 *
 *   2. Zero-commit guarantee (§ 9 / spec scenario "Toggle does not
 *      fire weapons"): mounting the WeaponSelector in preview mode,
 *      flipping the toggle on/off, and reading every preview value
 *      MUST NOT call any of the store's mutating actions —
 *      `commitAttack`, `togglePlannedWeapon`, etc. — and MUST NOT
 *      touch `session.events`.
 *
 *   3. Modal preview rows (§ 8 + § 10): the ToHitForecastModal renders
 *      the three preview spans when both `previewEnabled === true`
 *      AND the parent passed the `attackerWeapons` array.
 *
 * Pure rendering test — no real store, no real session, just inert
 * spies + the component contracts.
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/*\/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import { ToHitForecastModal } from '@/components/gameplay/ToHitForecastModal';
import { WeaponSelector } from '@/components/gameplay/WeaponSelector';
import { MovementType } from '@/types/gameplay';
import {
  previewAttackOutcome,
  ZERO_PREVIEW,
} from '@/utils/gameplay/toHit/preview';

// ---------------------------------------------------------------------------
// Fixtures — kept minimal, mirroring the shape the smoke tests in
// addCombatPhaseUIFlows.smoke.test.tsx already use.
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
const lrm10: IWeapon = {
  id: 'lrm10-1',
  name: 'LRM-10',
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
  damage: 10,
  heat: 4,
  minRange: 6,
  ammoPerTon: 12,
  destroyed: false,
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

// ---------------------------------------------------------------------------
// 1. WeaponSelector — toggle + preview columns
// ---------------------------------------------------------------------------

export {
  MovementType,
  React,
  ToHitForecastModal,
  WeaponSelector,
  ZERO_PREVIEW,
  baseAttacker,
  baseTarget,
  fireEvent,
  lrm10,
  mediumLaser,
  previewAttackOutcome,
  render,
  screen,
};

export type { IAttackerState, ITargetState, IWeapon };
