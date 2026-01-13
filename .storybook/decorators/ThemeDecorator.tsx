import React from 'react';
import type { Decorator } from '@storybook/react';

export const ThemeDecorator: Decorator = (Story) => (
  <div className="theme-default bg-surface-base text-text-theme-primary min-h-[200px] p-4">
    <Story />
  </div>
);
