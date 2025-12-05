import type { NextConfig } from "next";
import type { Configuration, WebpackPluginInstance } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

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
  
  // Turbopack config (empty to silence Next.js 16 warning)
  turbopack: {},
  
  // Enable standalone output for Docker and Electron deployment
  // This creates a self-contained build with all dependencies
  output: 'standalone',
  
  // Optimize for production builds
  experimental: {
    // Enable modern output for better tree-shaking
    esmExternals: true,
  },

  // Webpack configuration for bundle optimization
  webpack: (config: Configuration, { dev, isServer, webpack }: WebpackContext): Configuration => {
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
        })
      );
    }

    // Optimize chunk splitting for better caching
    if (!dev && !isServer && config.optimization) {
      const existingSplitChunks = config.optimization.splitChunks;
      const existingCacheGroups = existingSplitChunks && typeof existingSplitChunks === 'object'
        ? existingSplitChunks.cacheGroups
        : {};
      
      config.optimization.splitChunks = {
        ...(existingSplitChunks && typeof existingSplitChunks === 'object' ? existingSplitChunks : {}),
        cacheGroups: {
          ...(existingCacheGroups && typeof existingCacheGroups === 'object' ? existingCacheGroups : {}),
          
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
        })
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
  },
};

export default nextConfig;
