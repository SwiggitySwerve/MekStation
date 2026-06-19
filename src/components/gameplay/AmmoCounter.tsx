import React, { useCallback } from 'react';

import { useHaptics } from '@/hooks/useHaptics';

import {
  AmmoCounterHeader,
  AmmoReadout,
  AmmoWarning,
  FireButton,
  ReloadProgressPanel,
  useReloadProgress,
} from './AmmoCounter.parts';

export interface AmmoCounterProps {
  weaponName: string;
  shotsRemaining: number;
  magazineSize: number;
  onFire: () => void;
  onReload: () => void;
  isReloading?: boolean;
  reloadTime?: number; // in seconds
  className?: string;
}

export function AmmoCounter({
  weaponName,
  shotsRemaining,
  magazineSize,
  onFire,
  onReload,
  isReloading = false,
  reloadTime = 3,
  className = '',
}: AmmoCounterProps): React.ReactElement {
  const { vibrateCustom } = useHaptics();
  const ammoPercentage = (shotsRemaining / magazineSize) * 100;
  const isLowAmmo = shotsRemaining <= magazineSize * 0.25 && shotsRemaining > 0;
  const isEmpty = shotsRemaining === 0;
  const reloadProgress = useReloadProgress({
    isReloading,
    reloadTime,
    onComplete: useCallback(
      () => vibrateCustom([100, 50, 100]),
      [vibrateCustom],
    ),
  });

  const handleFire = () => {
    if (isEmpty || isReloading) {
      vibrateCustom(200);
      return;
    }
    onFire();
    vibrateCustom(50);
  };

  const handleReload = () => {
    if (isReloading) return;
    onReload();
  };

  return (
    <div
      className={`ammo-counter rounded-lg bg-gray-50 p-4 dark:bg-gray-800 ${className}`.trim()}
    >
      <AmmoCounterHeader
        weaponName={weaponName}
        isReloading={isReloading}
        isMagazineFull={shotsRemaining === magazineSize}
        onReload={handleReload}
      />
      <AmmoReadout
        weaponName={weaponName}
        shotsRemaining={shotsRemaining}
        magazineSize={magazineSize}
        ammoPercentage={ammoPercentage}
        isLowAmmo={isLowAmmo}
        isEmpty={isEmpty}
      />
      <AmmoWarning isEmpty={isEmpty} isLowAmmo={isLowAmmo} />
      <ReloadProgressPanel
        isReloading={isReloading}
        reloadProgress={reloadProgress}
        reloadTime={reloadTime}
      />
      <FireButton
        weaponName={weaponName}
        isEmpty={isEmpty}
        isReloading={isReloading}
        onFire={handleFire}
      />
    </div>
  );
}
