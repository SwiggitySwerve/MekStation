import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { extractWeapons } from '@/engine/adapters/CompendiumAdapter.weapons';

import { ToHitForecastModal } from '../ToHitForecastModal';
import { WeaponSelector } from '../WeaponSelector';
import {
  baseAttacker,
  baseTarget,
  lrm10,
  mediumLaser,
} from './addWhatIfToHitPreview.smoke.test-helpers';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/to-hit-resolution/spec.md */
describe('live ammunition in preview consumers', () => {
  const callbacks = {
    onToggle: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };
  beforeEach(() => jest.clearAllMocks());

  it('refreshes the selector on ammo-only depletion and replenishment', () => {
    const props = {
      weapons: [lrm10, mediumLaser],
      rangeToTarget: 7,
      selectedWeaponIds: [lrm10.id],
      attacker: baseAttacker,
      target: baseTarget,
      previewEnabled: true,
      onToggle: callbacks.onToggle,
    };
    const { rerender } = render(
      <WeaponSelector {...props} ammo={{ [lrm10.id]: 2 }} />,
    );
    const expectedDamage = () =>
      Number(
        screen.getByTestId(`weapon-preview-expdmg-${lrm10.id}`).textContent,
      );
    expect(expectedDamage()).toBeGreaterThan(0);
    const laserBefore = screen.getByTestId(
      `weapon-preview-expdmg-${mediumLaser.id}`,
    ).textContent;
    rerender(<WeaponSelector {...props} ammo={{ [lrm10.id]: 0 }} />);
    expect(expectedDamage()).toBe(0);
    expect(
      screen.getByTestId(`weapon-preview-stddev-${lrm10.id}`),
    ).toHaveTextContent('0.0');
    expect(
      screen.getByTestId(`weapon-preview-expdmg-${mediumLaser.id}`).textContent,
    ).toBe(laserBefore);
    rerender(<WeaponSelector {...props} ammo={{ [lrm10.id]: 1 }} />);
    expect(expectedDamage()).toBeGreaterThan(0);
    expect(callbacks.onToggle).not.toHaveBeenCalled();
  });

  it('refreshes the modal on ammo-only depletion and replenishment', () => {
    const props = {
      open: true,
      attacker: baseAttacker,
      target: baseTarget,
      range: 7,
      weapons: [
        {
          weaponId: lrm10.id,
          weaponName: lrm10.name,
          minRange: lrm10.minRange,
          shortRange: lrm10.shortRange,
          mediumRange: lrm10.mediumRange,
          longRange: lrm10.longRange,
        },
      ],
      attackerWeapons: [lrm10],
      previewEnabled: true,
      onConfirm: callbacks.onConfirm,
      onClose: callbacks.onClose,
    };
    const { rerender } = render(
      <ToHitForecastModal {...props} {...{ ammo: { [lrm10.id]: 2 } }} />,
    );
    const expectedDamage = () =>
      Number(
        screen.getByTestId(`forecast-preview-expdmg-${lrm10.id}`).textContent,
      );
    expect(expectedDamage()).toBeGreaterThan(0);
    rerender(
      <ToHitForecastModal {...props} {...{ ammo: { [lrm10.id]: 0 } }} />,
    );
    expect(expectedDamage()).toBe(0);
    expect(
      screen.getByTestId(`forecast-preview-stddev-${lrm10.id}`),
    ).toHaveTextContent('0.0');
    rerender(
      <ToHitForecastModal {...props} {...{ ammo: { [lrm10.id]: 1 } }} />,
    );
    expect(expectedDamage()).toBeGreaterThan(0);
    expect(callbacks.onConfirm).not.toHaveBeenCalled();
    expect(callbacks.onClose).not.toHaveBeenCalled();
  });

  it('retains positive supplied preview for a real ProtoMech SRM adapter record', () => {
    const [weapon] = extractWeapons(
      [{ equipmentId: 'clan-srm-3' }],
      'proto',
      {},
    );
    expect(weapon).toBeDefined();
    render(
      <WeaponSelector
        weapons={[weapon]}
        rangeToTarget={1}
        selectedWeaponIds={[]}
        ammo={{ [weapon.id]: 2 }}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled
        onToggle={callbacks.onToggle}
      />,
    );
    expect(
      Number(
        screen.getByTestId(`weapon-preview-expdmg-${weapon.id}`).textContent,
      ),
    ).toBeGreaterThan(0);
  });
});
