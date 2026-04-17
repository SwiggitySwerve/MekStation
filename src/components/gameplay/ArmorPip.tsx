import React, { useState, useEffect } from 'react';

import { useHaptics } from '@/hooks/useHaptics';

export type PipState = 'empty' | 'filled' | 'destroyed' | 'blown-off';

export interface ArmorPipProps {
  state: PipState;
  onToggle: (newState: PipState) => void;
  disabled?: boolean;
  className?: string;
  /**
   * Per `add-damage-feedback-ui` task 2.1-2.3: when `true`, the pip
   * flashes red at 60% opacity with a diagonal-hatch overlay for
   * ~400ms before settling to its resting state. Reinforces the color
   * shift with a pattern change so colorblind users (deuteranopia /
   * protanopia) still perceive the damaged-this-turn signal without
   * relying on hue alone (task 9.1).
   */
  justDamaged?: boolean;
}

const PIP_STATE_ORDER: PipState[] = [
  'empty',
  'filled',
  'destroyed',
  'blown-off',
];

export function ArmorPip({
  state,
  onToggle,
  disabled = false,
  className = '',
  justDamaged = false,
}: ArmorPipProps): React.ReactElement {
  const [previousState, setPreviousState] = useState(state);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  const { vibrateCustom } = useHaptics();

  // Per add-damage-feedback-ui task 2.2: 400ms red flash when
  // justDamaged transitions from false → true. Auto-clears.
  useEffect(() => {
    if (!justDamaged) {
      setShowDamageFlash(false);
      return;
    }
    setShowDamageFlash(true);
    const timer = setTimeout(() => setShowDamageFlash(false), 400);
    return () => clearTimeout(timer);
  }, [justDamaged]);

  useEffect(() => {
    if (previousState !== state) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [state, previousState]);

  const handleClick = () => {
    if (disabled) return;

    // Cycle to next state: empty → filled → destroyed → blown-off → empty
    const currentIndex = PIP_STATE_ORDER.indexOf(state);
    const nextState =
      PIP_STATE_ORDER[(currentIndex + 1) % PIP_STATE_ORDER.length];

    setPreviousState(state);
    onToggle(nextState);
    vibrateCustom(50);
  };

  const getVisualState = () => {
    switch (state) {
      case 'empty':
        return {
          bg: 'bg-gray-200 dark:bg-gray-700',
          border: 'border-2 border-gray-300 dark:border-gray-600',
          icon: null,
        };
      case 'filled':
        return {
          bg: 'bg-green-500 dark:bg-green-600',
          border: 'border-2 border-green-600 dark:border-green-700',
          icon: null,
        };
      case 'destroyed':
        return {
          bg: 'bg-red-500 dark:bg-red-600',
          border: 'border-2 border-red-600 dark:border-red-700',
          icon: (
            <svg
              className="h-full w-full p-1 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ),
        };
      case 'blown-off':
        return {
          bg: 'bg-orange-500 dark:bg-orange-600',
          border: 'border-2 border-orange-600 dark:border-orange-700',
          icon: (
            <svg
              className="h-full w-full p-1 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
    }
  };

  const visual = getVisualState();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`armor-pip relative h-12 w-12 rounded-full transition-all duration-200 ${visual.bg} ${visual.border} ${isAnimating ? 'scale-110' : 'scale-100'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105 active:scale-95'} ${className} `.trim()}
      style={{
        transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
        transition:
          'transform 200ms ease-out, background-color 200ms, border-color 200ms',
        minWidth: '48px',
        minHeight: '48px',
      }}
      aria-label={`Armor pip: ${state}${showDamageFlash ? ' (just damaged)' : ''}`}
      aria-disabled={disabled}
      data-just-damaged={showDamageFlash || undefined}
    >
      {visual.icon}
      {showDamageFlash && (
        <span
          aria-hidden="true"
          data-testid="armor-pip-damage-flash"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            // 60% red flash + diagonal hatch (per task 2.3 + 9.1
            // colorblind-safe pattern reinforcement). Animates the
            // opacity to 0 over 400ms via the `transition` below.
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 4px, transparent 4px 8px)',
            opacity: 1,
            transition: 'opacity 400ms ease-out',
          }}
        />
      )}
    </button>
  );
}

export interface ArmorPipGroupProps {
  location: string;
  pips: PipState[];
  onPipChange: (index: number, newState: PipState) => void;
  disabled?: boolean;
  className?: string;
}

export function ArmorPipGroup({
  location,
  pips,
  onPipChange,
  disabled = false,
  className = '',
}: ArmorPipGroupProps): React.ReactElement {
  const fillAll = () => {
    pips.forEach((_, index) => onPipChange(index, 'filled'));
  };

  const clearAll = () => {
    pips.forEach((_, index) => onPipChange(index, 'empty'));
  };

  const destroyAll = () => {
    pips.forEach((_, index) => onPipChange(index, 'destroyed'));
  };

  return (
    <div className={`armor-pip-group ${className}`.trim()}>
      {/* Location header with batch actions */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {location}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={fillAll}
            disabled={disabled}
            className="min-h-[32px] min-w-[32px] rounded bg-green-100 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            aria-label={`Fill all armor pips in ${location}`}
          >
            Fill
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="min-h-[32px] min-w-[32px] rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            aria-label={`Clear all armor pips in ${location}`}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={destroyAll}
            disabled={disabled}
            className="min-h-[32px] min-w-[32px] rounded bg-red-100 px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            aria-label={`Destroy all armor pips in ${location}`}
          >
            Destroy
          </button>
        </div>
      </div>

      {/* Pips grid */}
      <div className="flex flex-wrap gap-2">
        {pips.map((pipState, index) => (
          <ArmorPip
            key={index}
            state={pipState}
            onToggle={(newState) => onPipChange(index, newState)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
