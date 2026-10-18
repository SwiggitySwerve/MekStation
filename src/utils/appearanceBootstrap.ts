import {
  ACCENT_COLOR_CSS,
  FONT_SIZE_CSS,
  UI_THEMES,
} from '@/constants/appearance';

// Restore validated browser preferences before the page can paint.
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(() => {
  try {
    const state = JSON.parse(localStorage.getItem('mekstation-appearance') || 'null')?.state;
    const accents = ${JSON.stringify(ACCENT_COLOR_CSS)};
    const fonts = ${JSON.stringify(FONT_SIZE_CSS)};
    if (!state || !${JSON.stringify(UI_THEMES)}.includes(state.uiTheme) ||
        !Object.hasOwn(accents, state.accentColor) || !Object.hasOwn(fonts, state.fontSize) ||
        !['full', 'reduced', 'none'].includes(state.animationLevel) || typeof state.compactMode !== 'boolean') return;
    const root = document.documentElement;
    root.classList.add('theme-' + state.uiTheme);
    root.style.setProperty('--accent-primary', accents[state.accentColor].primary);
    root.style.setProperty('--accent-hover', accents[state.accentColor].hover);
    root.style.setProperty('--accent-muted', accents[state.accentColor].muted);
    root.style.setProperty('--font-size-base', fonts[state.fontSize]);
  } catch {
    // Unreadable browser storage leaves the default appearance in place.
  }
})();`;
