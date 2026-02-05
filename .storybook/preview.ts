import type { Preview } from '@storybook/react';

import '../src/styles/globals.css';
import {
  ThemeDecorator,
  DndDecorator,
  NextRouterDecorator,
  ZustandDecorator,
  ElectronDecorator,
} from './decorators';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'surface-base',
      values: [
        { name: 'surface-deep', value: '#0f172a' },
        { name: 'surface-base', value: '#1e293b' },
        { name: 'surface-raised', value: '#334155' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    ThemeDecorator,
    DndDecorator,
    NextRouterDecorator,
    ZustandDecorator,
    ElectronDecorator,
  ],
  tags: ['autodocs'],
};

export default preview;
