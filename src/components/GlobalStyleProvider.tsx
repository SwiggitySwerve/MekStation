/**
 * GlobalStyleProvider
 *
 * Connects app settings to CSS custom properties and theme classes.
 * Wrap your app with this component to enable dynamic styling.
 */

'use client';

import { useEffect } from 'react';
import {
  useAppSettingsStore,
  ACCENT_COLOR_CSS,
  FONT_SIZE_CSS,
} from '@/stores/useAppSettingsStore';

/**
 * Applies user settings as CSS custom properties on document root
 * and theme classes on document body.
 */
export function GlobalStyleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const accentColor = useAppSettingsStore((s) => s.accentColor);
  const fontSize = useAppSettingsStore((s) => s.fontSize);
  const uiTheme = useAppSettingsStore((s) => s.uiTheme);
  const reduceMotion = useAppSettingsStore((s) => s.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply accent color CSS variables
    const colors = ACCENT_COLOR_CSS[accentColor];
    root.style.setProperty('--accent-primary', colors.primary);
    root.style.setProperty('--accent-hover', colors.hover);
    root.style.setProperty('--accent-muted', colors.muted);

    // Apply font size
    root.style.setProperty('--font-size-base', FONT_SIZE_CSS[fontSize]);

    // Apply theme class (remove old, add new)
    const themeClasses = ['theme-default', 'theme-neon', 'theme-tactical', 'theme-minimal'];
    themeClasses.forEach((cls) => body.classList.remove(cls));
    body.classList.add(`theme-${uiTheme}`);

    // Apply reduce motion class
    if (reduceMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
  }, [accentColor, fontSize, uiTheme, reduceMotion]);

  return <>{children}</>;
}

export default GlobalStyleProvider;
