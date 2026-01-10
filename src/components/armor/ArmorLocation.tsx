import React, { useState } from 'react';

export interface ArmorLocationProps {
  location: string;
  currentArmor: number;
  maxArmor: number;
  onArmorChange: (value: number) => void;
  className?: string;
}

export function ArmorLocation({
  location,
  currentArmor,
  maxArmor,
  onArmorChange,
  className = '',
}: ArmorLocationProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleIncrement = () => {
    if (currentArmor < maxArmor) {
      onArmorChange(currentArmor + 1);
    }
  };

  const handleDecrement = () => {
    if (currentArmor > 0) {
      onArmorChange(currentArmor - 1);
    }
  };

  const handleQuickAdd = (amount: number) => {
    const newValue = Math.min(currentArmor + amount, maxArmor);
    onArmorChange(newValue);
  };

  const percentage = maxArmor > 0 ? (currentArmor / maxArmor) * 100 : 0;
  const progressColor = percentage === 100 ? 'bg-green-500' : 'bg-amber-500';

  return (
    <section
      className={`armor-location bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`.trim()}
      aria-label={`${location} armor allocation`}
    >
      {/* Location Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        aria-expanded={isExpanded}
        aria-controls={`${location.toLowerCase()}-details`}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {location}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-200`}
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={currentArmor}
                aria-valuemin={0}
                aria-valuemax={maxArmor}
                aria-label={`${location} armor: ${currentArmor} of ${maxArmor}`}
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {currentArmor} / {maxArmor}
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Controls */}
      {isExpanded && (
        <div
          id={`${location.toLowerCase()}-details`}
          className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700"
        >
          {/* Quick Add Buttons */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleQuickAdd(5)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
              aria-label={`Add 5 armor to ${location}`}
              disabled={currentArmor >= maxArmor}
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(10)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
              aria-label={`Add 10 armor to ${location}`}
              disabled={currentArmor >= maxArmor}
            >
              +10
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(20)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
              aria-label={`Add 20 armor to ${location}`}
              disabled={currentArmor >= maxArmor}
            >
              +20
            </button>
            <button
              type="button"
              onClick={() => onArmorChange(maxArmor)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors min-h-[44px]"
              aria-label={`Maximize ${location} armor`}
              disabled={currentArmor >= maxArmor}
            >
              Max
            </button>
          </div>

          {/* Fine-Tune Stepper Controls */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleDecrement}
              className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Remove 1 armor from ${location}`}
              disabled={currentArmor <= 0}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <div className="w-20 text-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {currentArmor}
              </span>
            </div>
            <button
              type="button"
              onClick={handleIncrement}
              className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Add 1 armor to ${location}`}
              disabled={currentArmor >= maxArmor}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
