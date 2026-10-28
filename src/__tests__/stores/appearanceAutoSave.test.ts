import { ACCENT_COLOR_CSS } from '@/constants/appearance';
import { useAppearanceStore } from '@/stores/useAppearanceStore';
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '@/utils/appearanceBootstrap';

beforeEach(() => {
  useAppearanceStore.getState().resetToDefaults();
  document.documentElement.className = '';
  document.documentElement.style.cssText = '';
});

it('saves colors immediately while preserving unsaved font changes', () => {
  const store = useAppearanceStore.getState();
  store.initDraftAppearance();
  store.setDraftFontSize('large');
  store.setUITheme('petrol');
  store.setAccentColor('violet');
  const state = useAppearanceStore.getState();
  expect(state.draftAppearance).toMatchObject({
    uiTheme: 'petrol',
    accentColor: 'violet',
    fontSize: 'large',
  });
  expect(state.hasUnsavedOtherAppearance).toBe(true);
  expect(
    JSON.parse(localStorage.getItem('mekstation-appearance')!).state,
  ).toMatchObject({
    uiTheme: 'petrol',
    accentColor: 'violet',
    fontSize: 'medium',
  });
  state.revertAppearance();
  expect(useAppearanceStore.getState().getEffectiveUITheme()).toBe('petrol');
  expect(useAppearanceStore.getState().getEffectiveAccentColor()).toBe(
    'violet',
  );
  expect(useAppearanceStore.getState().getEffectiveFontSize()).toBe('medium');
});

it('restores the saved palette and accent before React starts', () => {
  useAppearanceStore.getState().setUITheme('burgundy');
  useAppearanceStore.getState().setAccentColor('cyan');
  window.eval(APPEARANCE_BOOTSTRAP_SCRIPT);
  expect(document.documentElement.className).toBe('theme-burgundy');
  expect(
    document.documentElement.style.getPropertyValue('--accent-primary'),
  ).toBe(ACCENT_COLOR_CSS.cyan.primary);
});

it('paints the retired Midnight blue id as Gunmetal before React starts', () => {
  localStorage.setItem(
    'mekstation-appearance',
    JSON.stringify({
      state: {
        uiTheme: 'default',
        accentColor: 'amber',
        fontSize: 'medium',
        compactMode: false,
        animationLevel: 'full',
      },
    }),
  );
  window.eval(APPEARANCE_BOOTSTRAP_SCRIPT);
  expect(document.documentElement.className).toBe('theme-gunmetal');
});

it.each([
  '{broken',
  JSON.stringify({ state: { uiTheme: 'malicious class' } }),
  JSON.stringify({
    state: {
      uiTheme: 'neon',
      accentColor: 'constructor',
      fontSize: 'medium',
      compactMode: false,
      animationLevel: 'full',
    },
  }),
])('ignores invalid saved appearance before rendering', (saved) => {
  localStorage.setItem('mekstation-appearance', saved);
  expect(() => window.eval(APPEARANCE_BOOTSTRAP_SCRIPT)).not.toThrow();
  expect(document.documentElement.className).toBe('');
});

it('rehydrates colors from another tab without discarding a local font preview', async () => {
  const store = useAppearanceStore.getState();
  store.initDraftAppearance();
  store.setDraftFontSize('large');
  const saved = JSON.parse(localStorage.getItem('mekstation-appearance')!);
  saved.state.uiTheme = 'field';
  saved.state.accentColor = 'rose';
  localStorage.setItem('mekstation-appearance', JSON.stringify(saved));
  await useAppearanceStore.persist.rehydrate();
  expect(useAppearanceStore.getState().draftAppearance).toMatchObject({
    uiTheme: 'field',
    accentColor: 'rose',
    fontSize: 'large',
  });
  expect(useAppearanceStore.getState().hasUnsavedOtherAppearance).toBe(true);
});
