import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': resolve(process.cwd(), 'src'),
          'next/link': resolve(process.cwd(), '.storybook/mocks/next-link.tsx'),
          'next/head': resolve(process.cwd(), '.storybook/mocks/next-head.tsx'),
          'next/router': resolve(process.cwd(), '.storybook/mocks/next-router.tsx'),
          'next/navigation': resolve(process.cwd(), '.storybook/mocks/next-router.tsx'),
          '@/hooks/useDeviceCapabilities': resolve(process.cwd(), '.storybook/mocks/useDeviceCapabilities.tsx'),
        },
      },
      css: {
        postcss: {},
      },
    });
  },
};

export default config;
