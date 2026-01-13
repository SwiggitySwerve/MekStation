import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
          '@': resolve(__dirname, '../src'),
          'next/link': resolve(__dirname, './mocks/next-link.tsx'),
          'next/head': resolve(__dirname, './mocks/next-head.tsx'),
          'next/router': resolve(__dirname, './mocks/next-router.tsx'),
          'next/navigation': resolve(__dirname, './mocks/next-router.tsx'),
          '@/hooks/useDeviceCapabilities': resolve(__dirname, './mocks/useDeviceCapabilities.tsx'),
        },
      },
      css: {
        postcss: {},
      },
    });
  },
};

export default config;
