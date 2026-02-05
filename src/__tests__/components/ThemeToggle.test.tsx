import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useThemeStore } from '@/stores/useThemeStore';

beforeEach(() => {
  act(() => {
    useThemeStore.getState().setTheme('light');
  });
  document.documentElement.classList.remove('dark');
});

describe('ThemeToggle', () => {
  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('shows moon icon in light mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toHaveAttribute('data-theme', 'light');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  it('shows sun icon in dark mode', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toHaveAttribute('data-theme', 'dark');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('toggles theme from light to dark on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    fireEvent.click(button);

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(button).toHaveAttribute('data-theme', 'dark');
  });

  it('toggles theme from dark to light on click', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    fireEvent.click(button);

    expect(useThemeStore.getState().theme).toBe('light');
    expect(button).toHaveAttribute('data-theme', 'light');
  });

  it('applies dark class to documentElement in dark mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from documentElement in light mode', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('accepts and applies custom className', () => {
    render(<ThemeToggle className="mt-4" />);
    const button = screen.getByTestId('theme-toggle');
    expect(button.className).toContain('mt-4');
  });

  it('is keyboard accessible via button role', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });
});

describe('useThemeStore', () => {
  beforeEach(() => {
    act(() => {
      useThemeStore.getState().setTheme('light');
    });
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light theme', () => {
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('toggleTheme switches from light to dark', () => {
    act(() => {
      useThemeStore.getState().toggleTheme();
    });
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('toggleTheme switches from dark to light', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    act(() => {
      useThemeStore.getState().toggleTheme();
    });
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('setTheme sets specific theme', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    expect(useThemeStore.getState().theme).toBe('dark');
    act(() => {
      useThemeStore.getState().setTheme('light');
    });
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('applyTheme adds dark class for dark theme', () => {
    act(() => {
      useThemeStore.getState().setTheme('dark');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applyTheme removes dark class for light theme', () => {
    document.documentElement.classList.add('dark');
    act(() => {
      useThemeStore.getState().setTheme('light');
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('double toggle returns to original state', () => {
    act(() => {
      useThemeStore.getState().toggleTheme();
      useThemeStore.getState().toggleTheme();
    });
    expect(useThemeStore.getState().theme).toBe('light');
  });
});
