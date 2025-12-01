/**
 * Unit Customizer Page
 * 
 * Full-featured BattleMech construction and modification interface.
 * Uses isolated unit stores with the new architecture.
 * 
 * @spec openspec/changes/add-customizer-ui-components
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the customizer content with SSR disabled
// This prevents hydration issues with Zustand's persist middleware
const CustomizerContent = dynamic(
  () => import('@/components/customizer/CustomizerContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading customizer...</div>
      </div>
    ),
  }
);

/**
 * Main customizer page component
 */
export default function CustomizerPage() {
  return <CustomizerContent />;
}
