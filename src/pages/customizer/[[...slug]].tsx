/**
 * Dynamic Customizer Route
 *
 * Handles URL-based routing for the unit customizer:
 * - /customizer - Main customizer (shows active unit or empty state)
 * - /customizer/[unitId] - Specific unit (defaults to structure tab)
 * - /customizer/[unitId]/[tabId] - Specific unit and tab
 *
 * Uses optional catch-all route [[...slug]] to handle all patterns.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import dynamic from 'next/dynamic';
import React from 'react';

import { CustomizerLoadingSkeleton } from '@/components/customizer/CustomizerLoadingSkeleton';

// Dynamically import the customizer content with SSR disabled
// This prevents hydration issues with Zustand's persist middleware
const CustomizerWithRouter = dynamic(
  () => import('@/components/customizer/CustomizerWithRouter'),
  {
    ssr: false,
    loading: () => (
      <CustomizerLoadingSkeleton
        label="Loading customizer"
        className="min-h-screen"
      />
    ),
  },
);

/**
 * Dynamic customizer page
 * Handles all customizer routes via catch-all pattern
 */
export default function CustomizerDynamicPage(): React.ReactElement {
  return <CustomizerWithRouter />;
}
