import type { Meta, StoryObj } from '@storybook/react';

import React, { useEffect } from 'react';

import { useThemeStore } from '@/stores/useThemeStore';

import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Simulation/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const LightMode: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useThemeStore.getState().setTheme('light');
      }, []);
      return (
        <div className="rounded-lg bg-white p-8">
          <Story />
        </div>
      );
    },
  ],
};

export const DarkMode: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useThemeStore.getState().setTheme('dark');
      }, []);
      return (
        <div className="dark rounded-lg bg-gray-900 p-8">
          <Story />
        </div>
      );
    },
  ],
};

export const Interactive: Story = {
  render: () => {
    const { theme } = useThemeStore();
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="space-y-4 rounded-lg bg-white p-8 transition-colors duration-300 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Current theme: <span className="font-bold">{theme}</span>
          </p>
          <ThemeToggle />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click the toggle to switch between light and dark modes.
          </p>
        </div>
      </div>
    );
  },
};

export const WithComponents: StoryObj = {
  render: () => {
    const { theme } = useThemeStore();
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <div className="w-96 space-y-4 rounded-lg bg-gray-50 p-6 transition-colors duration-300 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h2>
            <ThemeToggle />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm tracking-wide text-gray-600 uppercase dark:text-gray-400">
              Win Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              80%
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              ↑ +5% vs last week
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm tracking-wide text-gray-600 uppercase dark:text-gray-400">
              Damage Output
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              1,250
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              ↓ -8% decline
            </p>
          </div>
        </div>
      </div>
    );
  },
};
