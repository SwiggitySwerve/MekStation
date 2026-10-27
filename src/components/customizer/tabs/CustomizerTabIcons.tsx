/** Section tab icons for the customizer tab strip (static markup only). */

import React from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';

export const CUSTOMIZER_TAB_ICONS: Record<string, React.ReactNode> = {
  overview: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </SvgIcon>
  ),
  structure: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v2m0 0a2 2 0 012 2v1h2a1 1 0 011 1v3l2 1v6h-3v2h-2v-2h-4v2H8v-2H5v-6l2-1V8a1 1 0 011-1h2V6a2 2 0 012-2z"
      />
    </SvgIcon>
  ),
  armor: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </SvgIcon>
  ),
  equipment: (
    <SvgIcon size="inline">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v4m0 12v4m10-10h-4M6 12H2"
      />
    </SvgIcon>
  ),
  criticals: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </SvgIcon>
  ),
  fluff: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </SvgIcon>
  ),
  preview: (
    <SvgIcon size="inline">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </SvgIcon>
  ),
};
