import type { NextConfig } from 'next';
import type { Configuration, WebpackPluginInstance } from 'webpack';

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const FALLBACK_APP_VERSION = '0.0.0';
const FALLBACK_BUILD_NUMBER = '0';

function runCommand(command: string): string | undefined {
  try {
    const output = execSync(command, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    return output.length > 0 ? output : undefined;
  } catch {
    return undefined;
  }
}

function readPackageVersion(): string {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version?: unknown;
    };

    if (typeof packageJson.version === 'string') {
      const version = packageJson.version.trim();
      if (version.length > 0) {
        return version;
      }
    }
  } catch {
    return FALLBACK_APP_VERSION;
  }

  return FALLBACK_APP_VERSION;
}

const appVersion =
  process.env.npm_package_version?.trim() || readPackageVersion();
const buildNumber =
  process.env.BUILD_NUMBER?.trim() ||
  process.env.GITHUB_RUN_NUMBER?.trim() ||
  runCommand('git rev-list --count HEAD') ||
  FALLBACK_BUILD_NUMBER;
const gitSha = runCommand('git rev-parse --short HEAD') || 'unknown';
const buildVersion = `${appVersion}+${buildNumber}`;

interface WebpackContext {
  buildId: string;
  dev: boolean;
  isServer: boolean;
  defaultLoaders: unknown;
  webpack: {
    ProgressPlugin: new (options: {
      activeModules?: boolean;
      entries?: boolean;
      modules?: boolean;
      dependencies?: boolean;
    }) => WebpackPluginInstance;
  };
}

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Turbopack config — resolve Node.js-only modules for browser builds
  // (equipmentBVResolver.ts uses fs/path for catalog loading at runtime)
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/utils/construction/emptyModule.ts' },
      path: { browser: './src/utils/construction/emptyModule.ts' },
    },
  },

  // Configure page extensions to exclude test files
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Enable standalone output for Docker and Electron deployment
  // This creates a self-contained build with all dependencies
  output: 'standalone',

  // Optimize for production builds
  experimental: {
    // Enable modern output for better tree-shaking
    esmExternals: true,
  },

  // Webpack configuration for bundle optimization
  webpack: (
    config: Configuration,
    { dev, isServer, webpack }: WebpackContext,
  ): Configuration => {
    // Enable tree-shaking for equipment data files
    if (!dev && config.optimization && config.module?.rules) {
      config.optimization.sideEffects = false;

      // Add specific tree-shaking rules for equipment files
      config.module.rules.push({
        test: /src\/data\/equipment.*\.ts$/,
        sideEffects: false,
      });
    }

    // Add bundle analyzer in development
    if (dev && !isServer && config.plugins) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: false,
        }),
      );
    }

    // Optimize chunk splitting for better caching
    if (!dev && !isServer && config.optimization) {
      const existingSplitChunks = config.optimization.splitChunks;
      const existingCacheGroups =
        existingSplitChunks && typeof existingSplitChunks === 'object'
          ? existingSplitChunks.cacheGroups
          : {};

      config.optimization.splitChunks = {
        ...(existingSplitChunks && typeof existingSplitChunks === 'object'
          ? existingSplitChunks
          : {}),
        cacheGroups: {
          ...(existingCacheGroups && typeof existingCacheGroups === 'object'
            ? existingCacheGroups
            : {}),

          // Separate chunk for equipment data
          equipment: {
            test: /[\\/]src[\\/]data[\\/]equipment/,
            name: 'equipment',
            chunks: 'all',
            priority: 30,
          },

          // Separate chunk for services
          services: {
            test: /[\\/]src[\\/]services[\\/]/,
            name: 'services',
            chunks: 'all',
            priority: 25,
          },

          // Separate chunk for utilities
          utils: {
            test: /[\\/]src[\\/]utils[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 20,
          },

          // Separate chunk for components
          components: {
            test: /[\\/]src[\\/]components[\\/]/,
            name: 'components',
            chunks: 'all',
            priority: 15,
          },
        },
      };
    }

    // Add progress plugin for build feedback
    if (!dev && config.plugins) {
      config.plugins.push(
        new webpack.ProgressPlugin({
          activeModules: true,
          entries: true,
          modules: true,
          dependencies: true,
        }),
      );
    }

    // Optimize module resolution for faster builds
    if (config.resolve) {
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string>),
        '@/services': './src/services',
        '@/utils': './src/utils',
        '@/components': './src/components',
        '@/data': './src/data',
        '@/types': './src/types',
      };
    }

    return config;
  },

  // Enable static optimization
  trailingSlash: false,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Enable compression
  compress: true,

  // Power-user settings
  poweredByHeader: false,

  // Generate build ID for cache busting
  generateBuildId: async () => {
    return `${Date.now()}`;
  },

  // Environment variables for build optimization
  env: {
    BUNDLE_ANALYZE: process.env.ANALYZE === 'true' ? 'true' : 'false',
    BUILD_TIME: new Date().toISOString(),
    APP_VERSION: appVersion,
    BUILD_NUMBER: buildNumber,
    BUILD_VERSION: buildVersion,
    GIT_SHA: gitSha,
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_NUMBER: buildNumber,
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
    NEXT_PUBLIC_GIT_SHA: gitSha,
  },
};

export default nextConfig;
