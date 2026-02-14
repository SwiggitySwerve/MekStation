import React, { useState, useEffect } from 'react';

import { useHaptics } from '@/hooks/useHaptics';

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
  const [reloadProgress, setReloadProgress] = useState(0);
  const { vibrateCustom } = useHaptics();
  const ammoPercentage = (shotsRemaining / magazineSize) * 100;
  const isLowAmmo = shotsRemaining <= magazineSize * 0.25 && shotsRemaining > 0;
  const isEmpty = shotsRemaining === 0;

  // Reload progress animation
  useEffect(() => {
    if (isReloading) {
      setReloadProgress(0);
      const interval = setInterval(() => {
        setReloadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            vibrateCustom([100, 50, 100]);
            return 100;
          }
          return prev + 100 / (reloadTime * 10); // Update every 100ms
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setReloadProgress(0);
    }
  }, [isReloading, reloadTime, vibrateCustom]);

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
      {/* Header with weapon name and reload button */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {weaponName}
        </h3>
        <button
          type="button"
          onClick={handleReload}
          disabled={isReloading || shotsRemaining === magazineSize}
          className={`min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isReloading || shotsRemaining === magazineSize
              ? 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          aria-label={`Reload ${weaponName}`}
        >
          {isReloading ? 'Reloading...' : 'Reload'}
        </button>
      </div>

      {/* Ammo counter display */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span
            className={`text-4xl font-bold tabular-nums ${
              isEmpty
                ? 'text-red-500'
                : isLowAmmo
                  ? 'text-amber-500'
                  : 'text-green-500'
            }`}
          >
            {shotsRemaining}
          </span>
          <span className="text-xl text-gray-500 dark:text-gray-400">/</span>
          <span className="text-xl text-gray-600 tabular-nums dark:text-gray-400">
            {magazineSize}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all duration-300 ${
              isEmpty
                ? 'bg-red-500'
                : isLowAmmo
                  ? 'bg-amber-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${ammoPercentage}%` }}
            role="progressbar"
            aria-valuenow={shotsRemaining}
            aria-valuemin={0}
            aria-valuemax={magazineSize}
            aria-label={`${weaponName}: ${shotsRemaining} of ${magazineSize} shots remaining`}
          />
        </div>
      </div>

      {/* Warning indicators */}
      {isEmpty && (
        <div className="mb-3 rounded-md border-2 border-red-500 bg-red-100 p-3 dark:bg-red-900/30">
          <p className="text-center text-sm font-semibold text-red-700 dark:text-red-300">
            EMPTY - RELOAD REQUIRED
          </p>
        </div>
      )}

      {isLowAmmo && !isEmpty && (
        <div className="mb-3 rounded-md border-2 border-amber-500 bg-amber-100 p-3 dark:bg-amber-900/30">
          <p className="text-center text-sm font-semibold text-amber-700 dark:text-amber-300">
            ⚠️ LOW AMMO
          </p>
        </div>
      )}

      {/* Reloading progress */}
      {isReloading && (
        <div className="mb-3 rounded-md border-2 border-blue-500 bg-blue-100 p-3 dark:bg-blue-900/30">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Reloading...
            </p>
            <p className="text-sm text-blue-600 tabular-nums dark:text-blue-400">
              {Math.ceil(((100 - reloadProgress) / 100) * reloadTime)}s
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${reloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Fire button */}
      <button
        type="button"
        onClick={handleFire}
        disabled={isEmpty || isReloading}
        className={`min-h-[48px] w-full rounded-md px-4 py-3 font-medium transition-colors ${
          isEmpty || isReloading
            ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
        }`}
        aria-label={`Fire ${weaponName}`}
      >
        {isEmpty
          ? 'Empty - Reload Required'
          : isReloading
            ? 'Reloading...'
            : 'Fire'}
      </button>
    </div>
  );
}
