import React from 'react';

import { SvgIcon, type SvgIconProps } from './SvgIcon';

const glyphs = {
  mech: (
    <>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <rect x="6" y="7" width="12" height="8" rx="1" />
      <path d="M6 8H3v8h3M18 8h3v8h-3M8 15v7H5M16 15v7h3M9 10h6" />
    </>
  ),
  pilot: (
    <>
      <circle cx="12" cy="6" r="4" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  force: (
    <>
      <circle cx="12" cy="6" r="3" />
      <circle cx="4" cy="9" r="2" />
      <circle cx="20" cy="9" r="2" />
      <path d="M7 22v-5a5 5 0 0 1 10 0v5M2 20v-4a3 3 0 0 1 3-3M22 20v-4a3 3 0 0 0-3-3" />
    </>
  ),
  encounter: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  folder: <path d="M2 6V3h7l3 3h10v15H2V6Z" />,
  document: (
    <>
      <path d="M5 2h10l5 5v15H5V2Z" />
      <path d="M15 2v6h5M8 12h9M8 16h7" />
    </>
  ),
  add: <path d="M12 2v20M2 12h20" />,
  remove: <path d="M2 12h20" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  menu: <path d="M2 5h20M2 12h20M2 19h20" />,
  more: (
    <>
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  save: (
    <>
      <path d="M4 2h13l5 5v15H2V2h2Z" />
      <path d="M7 2v7h10V2M7 22v-8h10v8" />
    </>
  ),
  list: (
    <>
      <path d="M8 4h14M8 12h14M8 20h14" />
      <circle cx="3" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="20" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  category: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  'chevron-up': <path d="m5 15 7-7 7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevrons-left': <path d="m12 5-7 7 7 7m7-14-7 7 7 7" />,
  'chevrons-right': <path d="m5 5 7 7-7 7m7-14 7 7-7 7" />,
  'panel-right': (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M16 2v20" />
    </>
  ),
  'panel-right-close': (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M16 2v20m-9-14 4 4-4 4" />
    </>
  ),
  'panel-right-open': (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M16 2v20m-5-14-4 4 4 4" />
    </>
  ),
  check: <path d="m3 12 6 6L21 6" />,
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 7 7" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18M6 12h12M10 19h4" />
      <circle cx="8" cy="5" r="2" fill="var(--surface-base)" />
      <circle cx="15" cy="12" r="2" fill="var(--surface-base)" />
    </>
  ),
  download: (
    <>
      <path d="M12 2v13m-5-5 5 5 5-5M3 16v5h18v-5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V2M7 7l5-5 5 5M3 16v5h18v-5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  edit: (
    <>
      <path d="M16 3a2.83 2.83 0 0 1 4 4L7 20l-5 1 1-5L16 3ZM14 5l4 4" />
    </>
  ),
  settings: (
    <>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
  link: (
    <path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" />
  ),
  unlink: (
    <>
      <path d="m9 15-3 3a2.83 2.83 0 0 1-4-4l3-3M15 9l3-3a2.83 2.83 0 0 1 4 4l-3 3" />
      <path d="M8 3v3M3 8h3M16 18v3M18 16h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  flame: (
    <path d="M12 2c2 5-4 6-2 11 2-1 4-3 4-6 4 4 6 6 6 9a8 8 0 0 1-16 0c0-4 4-7 8-14Z" />
  ),
  swords: (
    <path d="m3 2 5 2 11 13m-6 0 6-6M21 22l-6-6M21 2l-5 2L5 17m0-6 6 6M3 22l6-6" />
  ),
  impact: <path d="m12 2 2 6 6-4-3 7 5 3-7 1 1 7-5-5-6 5 2-8-5-3 7-2 3-7Z" />,
  'arrow-up': <path d="M12 21V3m-7 7 7-7 7 7" />,
  'arrow-down': <path d="M12 3v18m-7-7 7 7 7-7" />,
  'arrow-left': <path d="M21 12H3m7-7-7 7 7 7" />,
  'arrow-right': <path d="M3 12h18m-7-7 7 7-7 7" />,
  'external-link': (
    <>
      <path d="M14 3h7v7m0-7L10 14" />
      <path d="M10 3H3v18h18v-7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="m12 2 10 19H2L12 2Z" />
      <path d="M12 8v6" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 3v6h-6M3 21v-6h6" />
      <path d="M4 9a8 8 0 0 1 14-5l3 5M3 15l3 5a8 8 0 0 0 14-5" />
    </>
  ),
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
  redo: <path d="m15 14 5-5-5-5m5 5H9a5 5 0 0 0 0 10h3" />,
  loader: (
    <>
      <circle cx="12" cy="12" r="9" opacity=".25" />
      <path d="M12 3a9 9 0 0 1 9 9" />
    </>
  ),
  play: <path d="m6 3 15 9-15 9V3Z" />,
  pause: (
    <>
      <path d="M7 3v18M17 3v18" />
    </>
  ),
  stop: <rect x="4" y="4" width="16" height="16" rx="1" />,
  'skip-back': (
    <>
      <path d="M3 3v18m17-18L6 12l14 9V3Z" />
    </>
  ),
  'skip-forward': (
    <>
      <path d="M21 3v18M4 3l14 9-14 9V3Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="12" rx="2" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="10" width="16" height="12" rx="2" />
      <path d="M8 10V6a4 4 0 0 1 8 0" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type AppIconName = keyof typeof glyphs;
export const APP_ICON_NAMES = Object.keys(glyphs) as AppIconName[];

export interface AppIconProps extends Omit<
  SvgIconProps,
  'children' | 'viewBox' | 'fill' | 'stroke'
> {
  name: AppIconName;
}

/** Use a named symbol for recurring actions so its meaning and drawing stay consistent. */
export function AppIcon({ name, ...props }: AppIconProps): React.ReactElement {
  return (
    <SvgIcon {...props} data-icon-name={name}>
      {glyphs[name]}
    </SvgIcon>
  );
}
