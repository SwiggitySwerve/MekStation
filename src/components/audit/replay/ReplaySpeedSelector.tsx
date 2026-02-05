/**
 * ReplaySpeedSelector Component
 * Speed selection control for replay playback.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

import {
  type PlaybackSpeed,
  PLAYBACK_SPEEDS,
  formatSpeed,
} from '@/hooks/audit';

// =============================================================================
// Types
// =============================================================================

export interface ReplaySpeedSelectorProps {
  /** Current playback speed */
  speed: PlaybackSpeed;
  /** Speed change handler */
  onSpeedChange: (speed: PlaybackSpeed) => void;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Speed Display Config
// =============================================================================

type SpeedDisplayConfig = {
  label: string;
  color: string;
};

const SPEED_CONFIG: Record<PlaybackSpeed, SpeedDisplayConfig> = {
  0.25: { label: '0.25x', color: 'text-cyan-400' },
  0.5: { label: '0.5x', color: 'text-cyan-400' },
  1: { label: '1x', color: 'text-text-theme-primary' },
  2: { label: '2x', color: 'text-amber-400' },
  4: { label: '4x', color: 'text-orange-400' },
  8: { label: '8x', color: 'text-rose-400' },
};

// =============================================================================
// Icons
// =============================================================================

const GaugeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.128 3.128 0 0 0-1.768.896l-.578-.578a.75.75 0 0 0-1.06 1.06l.578.579c-.423.494-.744 1.091-.936 1.74l-.818-.282a.75.75 0 0 0-.49 1.417l.818.282a3.133 3.133 0 0 0 0 1.14l-.818.282a.75.75 0 0 0 .49 1.417l.818-.282c.192.649.513 1.246.936 1.74l-.578.579a.75.75 0 1 0 1.06 1.06l.578-.578c.494.423 1.091.744 1.74.936l-.282.818a.75.75 0 0 0 1.417.49l.282-.818a3.133 3.133 0 0 0 1.14 0l.282.818a.75.75 0 0 0 1.417-.49l-.282-.818c.649-.192 1.246-.513 1.74-.936l.579.578a.75.75 0 1 0 1.06-1.06l-.578-.579c.423-.494.744-1.091.936-1.74l.818.282a.75.75 0 0 0 .49-1.417l-.818-.282a3.133 3.133 0 0 0 0-1.14l.818-.282a.75.75 0 0 0-.49-1.417l-.818.282a3.128 3.128 0 0 0-.936-1.74l.578-.579a.75.75 0 0 0-1.06-1.06l-.579.578a3.128 3.128 0 0 0-1.74-.896V6ZM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function ReplaySpeedSelector({
  speed,
  onSpeedChange,
  className = '',
}: ReplaySpeedSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentConfig = SPEED_CONFIG[speed];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = PLAYBACK_SPEEDS.indexOf(speed);
        let newIndex: number;
        if (e.key === 'ArrowUp') {
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : PLAYBACK_SPEEDS.length - 1;
        } else {
          newIndex =
            currentIndex < PLAYBACK_SPEEDS.length - 1 ? currentIndex + 1 : 0;
        }
        onSpeedChange(PLAYBACK_SPEEDS[newIndex]);
      }
    },
    [speed, onSpeedChange],
  );

  // Handle speed selection
  const handleSelectSpeed = useCallback(
    (newSpeed: PlaybackSpeed) => {
      onSpeedChange(newSpeed);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [onSpeedChange],
  );

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`bg-surface-raised/60 border-border-theme-subtle hover:bg-surface-raised hover:border-border-theme min-h-touch flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-150 ${isOpen ? 'ring-accent/30 border-border-theme ring-2' : ''} `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Playback speed: ${formatSpeed(speed)}`}
        title="Playback speed (+/- to adjust)"
      >
        <GaugeIcon />
        <span
          className={`font-mono text-sm font-semibold ${currentConfig.color}`}
        >
          {currentConfig.label}
        </span>
        <ChevronDownIcon />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="bg-surface-raised/95 border-border-theme animate-in fade-in slide-in-from-bottom-2 absolute bottom-full left-0 z-50 mb-2 min-w-[120px] rounded-lg border py-1 shadow-xl backdrop-blur-md duration-150"
          role="listbox"
          aria-label="Select playback speed"
        >
          {PLAYBACK_SPEEDS.map((speedOption) => {
            const config = SPEED_CONFIG[speedOption];
            const isSelected = speedOption === speed;

            return (
              <button
                key={speedOption}
                onClick={() => handleSelectSpeed(speedOption)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 font-mono text-sm transition-colors duration-100 ${
                  isSelected
                    ? 'bg-accent/20 text-text-theme-primary'
                    : 'text-text-theme-secondary hover:bg-surface-base/60 hover:text-text-theme-primary'
                } `}
                role="option"
                aria-selected={isSelected}
              >
                <span className={config.color}>{config.label}</span>
                {isSelected && (
                  <span className="text-accent">
                    <CheckIcon />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReplaySpeedSelector;
