import type { IRepairJob } from '@/types/repair';

import {
  DamageAssessmentPanel,
  RepairCostBreakdown,
} from '@/components/repair';
import { Card } from '@/components/ui';

import { UnitRepairCard } from './RepairBayPage.sections';

interface RepairWorkspaceProps {
  filteredJobs: IRepairJob[];
  selectedJobId: string | null;
  selectedJob: IRepairJob | null;
  availableCBills: number;
  onJobClick: (jobId: string) => void;
  onToggleItem: (itemId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onStartRepair: () => void;
}

export function RepairWorkspace({
  filteredJobs,
  selectedJobId,
  selectedJob,
  availableCBills,
  onJobClick,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onStartRepair,
}: RepairWorkspaceProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-3 xl:col-span-1" data-testid="repair-unit-list">
        <h3 className="text-text-theme-muted mb-3 text-sm font-semibold tracking-wider uppercase">
          Units Requiring Repair
        </h3>
        <div className="max-h-[calc(100vh-400px)] space-y-3 overflow-y-auto pr-2">
          {filteredJobs.map((job) => (
            <UnitRepairCard
              key={job.id}
              job={job}
              onClick={() => onJobClick(job.id)}
              isSelected={selectedJobId === job.id}
            />
          ))}
        </div>
      </div>

      <div className="xl:col-span-2">
        {selectedJob ? (
          <div className="space-y-6" data-testid="repair-detail-panel">
            <DamageAssessmentPanel
              job={selectedJob}
              onToggleItem={onToggleItem}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              onStartRepair={onStartRepair}
              onPartialRepair={onStartRepair}
              availableCBills={availableCBills}
            />
            <RepairCostBreakdown
              job={selectedJob}
              availableCBills={availableCBills}
            />
          </div>
        ) : (
          <Card
            className="flex h-full min-h-[400px] items-center justify-center"
            data-testid="repair-select-prompt"
          >
            <div className="text-center">
              <div className="bg-surface-deep mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  className="text-text-theme-muted h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
              </div>
              <h3 className="text-text-theme-primary mb-1 text-lg font-semibold">
                Select a Unit
              </h3>
              <p className="text-text-theme-secondary text-sm">
                Click on a unit to view damage assessment and repair options
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
