import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginImport from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.disabled/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/jest.setup.js',
      '**/desktop/**',
      '**/scripts/**',
      '**/.github/**',
      '**/.worktrees/**',
      '**/openspec/**',
      '**/.storybook/**',
      '**/storybook-static/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      '**/src/docs/**',
      '**/playwright-report/**',
    ],
  },
  
  // Next.js config (using compat for extends)
  ...compat.extends('next/core-web-vitals'),
  
  // TypeScript ESLint recommended
  ...tseslint.configs.recommended,
  
  // Main configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        React: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        // Node.js globals for API routes
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Browser globals
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      import: pluginImport,
    },
    
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    
    rules: {
      // TypeScript rules - strict type safety enforcement
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Prevent double casting with "as unknown as" pattern
      // This bypasses type safety and should be avoided
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAsExpression',
          message: 'Avoid double type assertions (as unknown as). Use type guards, conversion functions, or fix the underlying type issue instead.',
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/explicit-module-boundary-types': ['warn', {
        allowArgumentsExplicitlyTypedAsAny: false,
      }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        'ts-nocheck': true,
        minimumDescriptionLength: 10,
      }],
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      
      // React rules
      'react/jsx-key': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off', // Next.js handles this
      
      // Import rules
      'import/no-anonymous-default-export': 'warn',
    },
  },
  
  // JavaScript files (config files, etc.)
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  
  // E2E test files - more lenient rules
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // Allow double type assertions for window object access in E2E tests
      'no-restricted-syntax': 'off',
      // E2E tests may need to access untyped window properties
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Allow any in E2E test utilities
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

