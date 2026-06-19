import React from 'react';

export type StatusLevel = 'normal' | 'warning' | 'error' | 'success';

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: StatusLevel;
}

const STATUS_COLORS: Record<StatusLevel, string> = {
  normal: 'text-white',
  warning: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-green-400',
};

export function StatusItem({
  label,
  value,
  subValue,
  status = 'normal',
}: StatusItemProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center px-3 py-1">
      <span className="text-text-theme-secondary text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${STATUS_COLORS[status]}`}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-text-theme-secondary text-[10px]">
          {subValue}
        </span>
      )}
    </div>
  );
}
