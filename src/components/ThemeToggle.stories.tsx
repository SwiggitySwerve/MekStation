import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '@/stores/useThemeStore';

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
        <div className="p-8 bg-white rounded-lg">
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
        <div className="dark bg-gray-900 p-8 rounded-lg">
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
        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg transition-colors duration-300 space-y-4">
          <p className="text-gray-900 dark:text-gray-100 text-sm font-medium">
            Current theme: <span className="font-bold">{theme}</span>
          </p>
          <ThemeToggle />
          <p className="text-gray-500 dark:text-gray-400 text-xs">
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
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg transition-colors duration-300 w-96 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h2>
            <ThemeToggle />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Win Rate
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              80%
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ↑ +5% vs last week
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Damage Output
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              1,250
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              ↓ -8% decline
            </p>
          </div>
        </div>
      </div>
    );
  },
};
