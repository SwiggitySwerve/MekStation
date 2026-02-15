import React from 'react';

import { AbilityCategory } from '@/types/pilot';

export type AbilityStatus =
  | 'owned'
  | 'available'
  | 'affordable'
  | 'missing-prereqs'
  | 'need-xp';

export const CATEGORY_INFO: Record<
  AbilityCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  [AbilityCategory.Gunnery]: {
    label: 'Gunnery',
    color: 'rose',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  [AbilityCategory.Piloting]: {
    label: 'Piloting',
    color: 'cyan',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  [AbilityCategory.Toughness]: {
    label: 'Toughness',
    color: 'emerald',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  [AbilityCategory.Tactical]: {
    label: 'Tactical',
    color: 'violet',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
};

export const CATEGORY_COLOR_MAP: Record<
  string,
  { badge: 'rose' | 'cyan' | 'emerald' | 'violet'; bg: string; border: string }
> = {
  rose: { badge: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  cyan: { badge: 'cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  emerald: {
    badge: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  violet: {
    badge: 'violet',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
};
