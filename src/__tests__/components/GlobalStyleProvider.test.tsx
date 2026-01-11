/**
 * GlobalStyleProvider Tests
 *
 * Tests for the global style infrastructure including:
 * - Theme class application to body
 * - CSS variable updates for accent colors
 * - Draft/preview system for settings
 * - Reduce motion accessibility support
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { GlobalStyleProvider } from '@/components/GlobalStyleProvider';
import { useAppSettingsStore, ACCENT_COLOR_CSS, FONT_SIZE_CSS } from '@/stores/useAppSettingsStore';

// Reset store before each test
beforeEach(() => {
  // Reset to defaults
  act(() => {
    useAppSettingsStore.getState().resetToDefaults();
  });

  // Clear body classes
  document.body.className = '';

  // Clear inline styles on root
  document.documentElement.style.cssText = '';
});

describe('GlobalStyleProvider', () => {
  describe('Theme Class Application', () => {
    it('should apply default theme class to body', () => {
      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-default')).toBe(true);
    });

    it('should apply neon theme class when uiTheme is neon', () => {
      act(() => {
        useAppSettingsStore.getState().setUITheme('neon');
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-neon')).toBe(true);
      expect(document.body.classList.contains('theme-default')).toBe(false);
    });

    it('should apply tactical theme class when uiTheme is tactical', () => {
      act(() => {
        useAppSettingsStore.getState().setUITheme('tactical');
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-tactical')).toBe(true);
    });

    it('should apply minimal theme class when uiTheme is minimal', () => {
      act(() => {
        useAppSettingsStore.getState().setUITheme('minimal');
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-minimal')).toBe(true);
    });

    it('should remove old theme class when switching themes', () => {
      act(() => {
        useAppSettingsStore.getState().setUITheme('neon');
      });

      const { rerender } = render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-neon')).toBe(true);

      act(() => {
        useAppSettingsStore.getState().setUITheme('tactical');
      });

      rerender(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-tactical')).toBe(true);
      expect(document.body.classList.contains('theme-neon')).toBe(false);
    });
  });

  describe('Accent Color CSS Variables', () => {
    it('should set amber accent color variables by default', () => {
      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--accent-primary')).toBe(ACCENT_COLOR_CSS.amber.primary);
      expect(root.style.getPropertyValue('--accent-hover')).toBe(ACCENT_COLOR_CSS.amber.hover);
      expect(root.style.getPropertyValue('--accent-muted')).toBe(ACCENT_COLOR_CSS.amber.muted);
    });

    it('should update accent variables when accent color changes', () => {
      const { rerender } = render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      act(() => {
        useAppSettingsStore.getState().setAccentColor('cyan');
      });

      rerender(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--accent-primary')).toBe(ACCENT_COLOR_CSS.cyan.primary);
      expect(root.style.getPropertyValue('--accent-hover')).toBe(ACCENT_COLOR_CSS.cyan.hover);
    });

    it('should support all accent colors', () => {
      const accentColors = ['amber', 'cyan', 'emerald', 'rose', 'violet', 'blue'] as const;

      accentColors.forEach((color) => {
        act(() => {
          useAppSettingsStore.getState().setAccentColor(color);
        });

        render(
          <GlobalStyleProvider>
            <div>Test</div>
          </GlobalStyleProvider>
        );

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--accent-primary')).toBe(ACCENT_COLOR_CSS[color].primary);
      });
    });
  });

  describe('Font Size CSS Variables', () => {
    it('should set medium font size by default', () => {
      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--font-size-base')).toBe(FONT_SIZE_CSS.medium);
    });

    it('should update font size variable when changed', () => {
      const { rerender } = render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      act(() => {
        useAppSettingsStore.getState().setFontSize('large');
      });

      rerender(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--font-size-base')).toBe(FONT_SIZE_CSS.large);
    });
  });

  describe('Draft/Preview System', () => {
    it('should use draft theme for preview when draft exists', () => {
      // Initialize draft
      act(() => {
        useAppSettingsStore.getState().initDraftAppearance();
      });

      // Set draft theme different from saved
      act(() => {
        useAppSettingsStore.getState().setDraftUITheme('neon');
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      // Should show draft theme (neon) not saved theme (default)
      expect(document.body.classList.contains('theme-neon')).toBe(true);
    });

    it('should use draft accent color for preview when draft exists', () => {
      act(() => {
        useAppSettingsStore.getState().initDraftAppearance();
        useAppSettingsStore.getState().setDraftAccentColor('violet');
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--accent-primary')).toBe(ACCENT_COLOR_CSS.violet.primary);
    });

    it('should revert to saved values when draft is cleared', () => {
      // Set saved theme to tactical
      act(() => {
        useAppSettingsStore.getState().setUITheme('tactical');
      });

      // Initialize and modify draft
      act(() => {
        useAppSettingsStore.getState().initDraftAppearance();
        useAppSettingsStore.getState().setDraftUITheme('neon');
      });

      const { rerender } = render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('theme-neon')).toBe(true);

      // Revert draft
      act(() => {
        useAppSettingsStore.getState().revertAppearance();
      });

      rerender(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      // Should now show saved theme
      expect(document.body.classList.contains('theme-tactical')).toBe(true);
      expect(document.body.classList.contains('theme-neon')).toBe(false);
    });
  });

  describe('Reduce Motion', () => {
    it('should not have reduce-motion class by default', () => {
      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('reduce-motion')).toBe(false);
    });

    it('should add reduce-motion class when enabled', () => {
      act(() => {
        useAppSettingsStore.getState().setReduceMotion(true);
      });

      render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('reduce-motion')).toBe(true);
    });

    it('should remove reduce-motion class when disabled', () => {
      act(() => {
        useAppSettingsStore.getState().setReduceMotion(true);
      });

      const { rerender } = render(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('reduce-motion')).toBe(true);

      act(() => {
        useAppSettingsStore.getState().setReduceMotion(false);
      });

      rerender(
        <GlobalStyleProvider>
          <div>Test</div>
        </GlobalStyleProvider>
      );

      expect(document.body.classList.contains('reduce-motion')).toBe(false);
    });
  });

  describe('Children Rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <GlobalStyleProvider>
          <div>Child Content</div>
        </GlobalStyleProvider>
      );

      expect(getByText('Child Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <GlobalStyleProvider>
          <div>First Child</div>
          <div>Second Child</div>
        </GlobalStyleProvider>
      );

      expect(getByText('First Child')).toBeInTheDocument();
      expect(getByText('Second Child')).toBeInTheDocument();
    });
  });
});
