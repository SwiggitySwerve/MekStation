import {
  SkeletonText,
  SkeletonFormSection,
} from '@/components/common/SkeletonLoader';
import { PageLayout } from '@/components/ui';

export function PilotDetailSkeleton(): React.ReactElement {
  return (
    <PageLayout
      title="Loading..."
      backLink="/gameplay/pilots"
      backLabel="Back to Roster"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <SkeletonFormSection title="Pilot Identity">
            <div className="flex items-start gap-4">
              <div className="bg-surface-raised/50 h-20 w-20 animate-pulse rounded-xl" />
              <div className="flex-1 space-y-2">
                <SkeletonText width="w-32" />
                <SkeletonText width="w-24" />
                <div className="mt-3 flex gap-2">
                  <SkeletonText width="w-16" />
                  <SkeletonText width="w-20" />
                </div>
              </div>
            </div>
          </SkeletonFormSection>

          <SkeletonFormSection title="Combat Skills">
            <div className="flex items-center justify-center gap-12 py-4">
              <div className="space-y-2 text-center">
                <SkeletonText width="w-12" className="mx-auto" />
                <SkeletonText width="w-16" className="mx-auto" />
              </div>
              <div className="space-y-2 text-center">
                <SkeletonText width="w-12" className="mx-auto" />
                <SkeletonText width="w-16" className="mx-auto" />
              </div>
            </div>
          </SkeletonFormSection>

          <SkeletonFormSection title="Career Statistics">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonText width="w-20" />
                  <SkeletonText width="w-12" />
                </div>
              ))}
            </div>
          </SkeletonFormSection>
        </div>

        <div className="lg:col-span-2">
          <SkeletonFormSection title="Progression">
            <div className="space-y-4">
              <SkeletonText width="w-full" />
              <SkeletonText width="w-3/4" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <SkeletonText width="w-full" />
                <SkeletonText width="w-full" />
              </div>
            </div>
          </SkeletonFormSection>
        </div>
      </div>
    </PageLayout>
  );
}
