/**
 * Customizer loading skeleton: the shape of the editor (unit tab, status bar,
 * section tabs, two form sections) while the customizer code or a unit store
 * is still loading. Built from the shared SkeletonLoader parts, following
 * PilotDetailSkeleton.
 */

import React from 'react';

import {
  SkeletonFormSection,
  SkeletonInput,
  SkeletonSelect,
  SkeletonText,
} from '@/components/common/SkeletonLoader';

export function CustomizerLoadingSkeleton({
  label,
  className = '',
}: {
  /** Announced to assistive technology, e.g. "Loading customizer". */
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      data-testid="customizer-loading-skeleton"
      className={`bg-surface-deep flex min-h-0 flex-1 flex-col gap-4 p-4 ${className}`}
    >
      <div className="flex gap-2">
        <SkeletonText width="w-48" />
        <SkeletonText width="w-10" />
      </div>
      <div className="flex gap-3">
        <SkeletonText width="w-24" />
        <SkeletonText width="w-20" />
        <SkeletonText width="w-20" />
      </div>
      <div className="flex gap-2">
        <SkeletonText width="w-20" />
        <SkeletonText width="w-20" />
        <SkeletonText width="w-20" />
        <SkeletonText width="w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonFormSection title="">
          <div className="space-y-3">
            <SkeletonInput />
            <SkeletonInput />
            <SkeletonSelect />
          </div>
        </SkeletonFormSection>
        <SkeletonFormSection title="">
          <div className="space-y-3">
            <SkeletonSelect />
            <SkeletonInput />
            <SkeletonInput />
          </div>
        </SkeletonFormSection>
      </div>
    </div>
  );
}
