import React, { useEffect, useState } from 'react';

interface ReloadProgressOptions {
  readonly isReloading: boolean;
  readonly reloadTime: number;
  readonly onComplete: () => void;
}

export function useReloadProgress({
  isReloading,
  reloadTime,
  onComplete,
}: ReloadProgressOptions): number {
  const [reloadProgress, setReloadProgress] = useState(0);

  useEffect(() => {
    if (!isReloading) {
      setReloadProgress(0);
      return;
    }

    setReloadProgress(0);
    const interval = setInterval(() => {
      setReloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onComplete();
          return 100;
        }
        return prev + 100 / (reloadTime * 10);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isReloading, onComplete, reloadTime]);

  return reloadProgress;
}

export function AmmoCounterHeader({
  weaponName,
  isReloading,
  isMagazineFull,
  onReload,
}: {
  readonly weaponName: string;
  readonly isReloading: boolean;
  readonly isMagazineFull: boolean;
  readonly onReload: () => void;
}): React.ReactElement {
  const reloadDisabled = isReloading || isMagazineFull;

  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {weaponName}
      </h3>
      <button
        type="button"
        onClick={onReload}
        disabled={reloadDisabled}
        className={`min-h-[44px] min-w-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          reloadDisabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        aria-label={`Reload ${weaponName}`}
      >
        {isReloading ? 'Reloading...' : 'Reload'}
      </button>
    </div>
  );
}

export function AmmoReadout({
  weaponName,
  shotsRemaining,
  magazineSize,
  ammoPercentage,
  isLowAmmo,
  isEmpty,
}: {
  readonly weaponName: string;
  readonly shotsRemaining: number;
  readonly magazineSize: number;
  readonly ammoPercentage: number;
  readonly isLowAmmo: boolean;
  readonly isEmpty: boolean;
}): React.ReactElement {
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-center gap-2">
        <span
          className={`text-4xl font-bold tabular-nums ${ammoTextClass(
            isEmpty,
            isLowAmmo,
          )}`}
        >
          {shotsRemaining}
        </span>
        <span className="text-xl text-gray-500 dark:text-gray-400">/</span>
        <span className="text-xl text-gray-600 tabular-nums dark:text-gray-400">
          {magazineSize}
        </span>
      </div>

      <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-300 ${ammoBarClass(
            isEmpty,
            isLowAmmo,
          )}`}
          style={{ width: `${ammoPercentage}%` }}
          role="progressbar"
          aria-valuenow={shotsRemaining}
          aria-valuemin={0}
          aria-valuemax={magazineSize}
          aria-label={`${weaponName}: ${shotsRemaining} of ${magazineSize} shots remaining`}
        />
      </div>
    </div>
  );
}

export function AmmoWarning({
  isEmpty,
  isLowAmmo,
}: {
  readonly isEmpty: boolean;
  readonly isLowAmmo: boolean;
}): React.ReactElement | null {
  if (isEmpty) {
    return (
      <div className="mb-3 rounded-md border-2 border-red-500 bg-red-100 p-3 dark:bg-red-900/30">
        <p className="text-center text-sm font-semibold text-red-700 dark:text-red-300">
          EMPTY - RELOAD REQUIRED
        </p>
      </div>
    );
  }

  if (isLowAmmo) {
    return (
      <div className="mb-3 rounded-md border-2 border-amber-500 bg-amber-100 p-3 dark:bg-amber-900/30">
        <p className="text-center text-sm font-semibold text-amber-700 dark:text-amber-300">
          ⚠️ LOW AMMO
        </p>
      </div>
    );
  }

  return null;
}

export function ReloadProgressPanel({
  isReloading,
  reloadProgress,
  reloadTime,
}: {
  readonly isReloading: boolean;
  readonly reloadProgress: number;
  readonly reloadTime: number;
}): React.ReactElement | null {
  if (!isReloading) return null;

  return (
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
  );
}

export function FireButton({
  weaponName,
  isEmpty,
  isReloading,
  onFire,
}: {
  readonly weaponName: string;
  readonly isEmpty: boolean;
  readonly isReloading: boolean;
  readonly onFire: () => void;
}): React.ReactElement {
  const fireDisabled = isEmpty || isReloading;

  return (
    <button
      type="button"
      onClick={onFire}
      disabled={fireDisabled}
      className={`min-h-[48px] w-full rounded-md px-4 py-3 font-medium transition-colors ${
        fireDisabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          : 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
      }`}
      aria-label={`Fire ${weaponName}`}
    >
      {fireButtonLabel(isEmpty, isReloading)}
    </button>
  );
}

function ammoTextClass(isEmpty: boolean, isLowAmmo: boolean): string {
  if (isEmpty) return 'text-red-500';
  if (isLowAmmo) return 'text-amber-500';
  return 'text-green-500';
}

function ammoBarClass(isEmpty: boolean, isLowAmmo: boolean): string {
  if (isEmpty) return 'bg-red-500';
  if (isLowAmmo) return 'bg-amber-500';
  return 'bg-green-500';
}

function fireButtonLabel(isEmpty: boolean, isReloading: boolean): string {
  if (isEmpty) return 'Empty - Reload Required';
  if (isReloading) return 'Reloading...';
  return 'Fire';
}
