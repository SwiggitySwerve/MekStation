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
  family,
  tabs,
  diagram,
  readOnly = false,
}: {
  /** Announced to assistive technology, e.g. "Loading customizer". */
  label: string;
  className?: string;
  family?: string;
  tabs?: readonly { id: string; label: string }[];
  diagram?: React.ReactNode;
  readOnly?: boolean;
}): React.ReactElement {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      data-testid="customizer-loading-skeleton"
      data-family={family}
      className={`bg-surface-deep flex min-h-0 flex-1 flex-col gap-4 p-4 ${className}`}
    >
      {family && (
        <p className="text-text-theme-secondary text-sm">
          {family}
          {readOnly ? ' · Read-Only' : ''}
        </p>
      )}
      <div className="flex gap-2">
        <SkeletonText width="w-48" />
        <SkeletonText width="w-10" />
      </div>
      <div className="flex gap-3">
        <SkeletonText width="w-24" />
        <SkeletonText width="w-20" />
        <SkeletonText width="w-20" />
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs ? (
          tabs.map((tab) => (
            <span key={tab.id} className="text-text-theme-secondary text-sm">
              {tab.label}
            </span>
          ))
        ) : (
          <>
            <SkeletonText width="w-20" />
            <SkeletonText width="w-20" />
            <SkeletonText width="w-20" />
            <SkeletonText width="w-20" />
          </>
        )}
      </div>
      <div
        className={`grid grid-cols-1 gap-4 ${diagram ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]' : 'lg:grid-cols-2'}`}
      >
        <div className={diagram ? 'grid min-w-0 gap-4' : 'contents'}>
          {readOnly ? (
            <SkeletonFormSection title="">
              <SkeletonText />
              <SkeletonText />
              <SkeletonText />
            </SkeletonFormSection>
          ) : (
            <>
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
            </>
          )}
        </div>
        {diagram && (
          <fieldset
            disabled
            inert
            aria-hidden="true"
            data-testid="loading-location-diagram"
            className="pointer-events-none order-first min-w-0 lg:order-last"
          >
            {diagram}
          </fieldset>
        )}
      </div>
    </div>
  );
}
