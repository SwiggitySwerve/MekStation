import React, { useState, useEffect } from 'react';
import { tap, error, success as hapticSuccess } from '../../utils/hapticFeedback';

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
            hapticSuccess(); // Haptic feedback when reload completes
            return 100;
          }
          return prev + 100 / (reloadTime * 10); // Update every 100ms
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setReloadProgress(0);
    }
  }, [isReloading, reloadTime]);

  const handleFire = () => {
    if (isEmpty || isReloading) {
      error(); // Haptic error feedback
      return;
    }
    onFire();
    tap(); // Haptic feedback on successful fire
  };

  const handleReload = () => {
    if (isReloading) return;
    onReload();
  };

  return (
    <div className={`ammo-counter bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`.trim()}>
      {/* Header with weapon name and reload button */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{weaponName}</h3>
        <button
          type="button"
          onClick={handleReload}
          disabled={isReloading || shotsRemaining === magazineSize}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
            isReloading || shotsRemaining === magazineSize
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          aria-label={`Reload ${weaponName}`}
        >
          {isReloading ? 'Reloading...' : 'Reload'}
        </button>
      </div>

      {/* Ammo counter display */}
      <div className="mb-3">
        <div className="flex items-center justify-center gap-2 mb-2">
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
          <span className="text-xl text-gray-600 dark:text-gray-400 tabular-nums">{magazineSize}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-md border-2 border-red-500">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300 text-center">
            EMPTY - RELOAD REQUIRED
          </p>
        </div>
      )}

      {isLowAmmo && !isEmpty && (
        <div className="mb-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-md border-2 border-amber-500">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 text-center">
            ⚠️ LOW AMMO
          </p>
        </div>
      )}

      {/* Reloading progress */}
      {isReloading && (
        <div className="mb-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md border-2 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Reloading...
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 tabular-nums">
              {Math.ceil((100 - reloadProgress) / 100 * reloadTime)}s
            </p>
          </div>
          <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
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
        className={`w-full px-4 py-3 rounded-md font-medium transition-colors min-h-[48px] ${
          isEmpty || isReloading
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white active:scale-95'
        }`}
        aria-label={`Fire ${weaponName}`}
      >
        {isEmpty ? 'Empty - Reload Required' : isReloading ? 'Reloading...' : 'Fire'}
      </button>
    </div>
  );
}
