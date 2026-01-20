/**
 * Repair Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useRepairStore } from '../useRepairStore';
import {
  RepairJobStatus,
  RepairType,
  UnitLocation,
  IDamageAssessment,
  ILocationDamage,
} from '@/types/repair';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestLocationDamage(
  overrides: Partial<ILocationDamage> = {}
): ILocationDamage {
  return {
    location: UnitLocation.CenterTorso,
    armorDamage: 10,
    armorMax: 40,
    structureDamage: 0,
    structureMax: 20,
    destroyedComponents: [],
    damagedComponents: [],
    ...overrides,
  };
}

function createTestAssessment(
  overrides: Partial<IDamageAssessment> = {}
): IDamageAssessment {
  return {
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    locationDamage: [createTestLocationDamage()],
    totalArmorDamage: 10,
    totalArmorMax: 40,
    totalStructureDamage: 0,
    totalStructureMax: 20,
    allDestroyedComponents: [],
    allDamagedComponents: [],
    operationalPercent: 85,
    isDestroyed: false,
    ...overrides,
  };
}

// Reset store before each test
beforeEach(() => {
  // Get the internal store state and reset it completely
  useRepairStore.setState({
    jobsByCampaign: {},
    baysByCampaign: {},
    salvageByCampaign: {},
    selectedJobId: null,
    isLoading: false,
    error: null,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('useRepairStore', () => {
  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initializeCampaign', () => {
    it('should initialize campaign with default repair bay', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.initializeCampaign(campaignId);
      });

      const bay = result.current.getRepairBay(campaignId);
      expect(bay.capacity).toBeGreaterThan(0);
      expect(bay.efficiency).toBe(1.0);
    });

    it('should initialize empty job list', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.initializeCampaign(campaignId);
      });

      const jobs = result.current.getJobs(campaignId);
      expect(jobs).toHaveLength(0);
    });

    it('should initialize empty salvage inventory', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.initializeCampaign(campaignId);
      });

      const salvage = result.current.getSalvage(campaignId);
      expect(salvage.parts).toHaveLength(0);
      expect(salvage.totalValue).toBe(0);
    });
  });

  // ===========================================================================
  // Job Management
  // ===========================================================================

  describe('createRepairJob', () => {
    it('should create job from damage assessment', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';
      const assessment = createTestAssessment();

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, assessment);
      });

      expect(jobId).toBeTruthy();
      const job = result.current.getJob(campaignId, jobId);
      expect(job).toBeDefined();
      expect(job?.unitId).toBe('unit-1');
      expect(job?.status).toBe(RepairJobStatus.Pending);
    });

    it('should generate repair items from assessment', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';
      const assessment = createTestAssessment({
        locationDamage: [
          createTestLocationDamage({ armorDamage: 10, structureDamage: 5 }),
        ],
      });

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, assessment);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.items.length).toBeGreaterThan(0);
      expect(job?.items.some((i) => i.type === RepairType.Armor)).toBe(true);
      expect(job?.items.some((i) => i.type === RepairType.Structure)).toBe(true);
    });

    it('should calculate total cost and time', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';
      const assessment = createTestAssessment();

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, assessment);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.totalCost).toBeGreaterThan(0);
      expect(job?.totalTimeHours).toBeGreaterThan(0);
    });

    it('should assign incremental priority', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let job1Id = '';
      let job2Id = '';
      act(() => {
        job1Id = result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u1' }));
        job2Id = result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u2' }));
      });

      const job1 = result.current.getJob(campaignId, job1Id);
      const job2 = result.current.getJob(campaignId, job2Id);
      expect(job2?.priority).toBeGreaterThan(job1?.priority ?? 0);
    });
  });

  describe('getJobs', () => {
    it('should return all jobs for campaign', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u1' }));
        result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u2' }));
      });

      const jobs = result.current.getJobs(campaignId);
      expect(jobs).toHaveLength(2);
    });

    it('should return empty array for unknown campaign', () => {
      const { result } = renderHook(() => useRepairStore());
      const jobs = result.current.getJobs('unknown');
      expect(jobs).toHaveLength(0);
    });
  });

  describe('deleteJob', () => {
    it('should remove job from campaign', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      act(() => {
        result.current.deleteJob(campaignId, jobId);
      });

      expect(result.current.getJob(campaignId, jobId)).toBeUndefined();
    });

    it('should clear selection if deleted job was selected', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.selectJob(jobId);
      });

      expect(result.current.selectedJobId).toBe(jobId);

      act(() => {
        result.current.deleteJob(campaignId, jobId);
      });

      expect(result.current.selectedJobId).toBeNull();
    });
  });

  describe('toggleRepairItem', () => {
    it('should toggle item selection', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      const job = result.current.getJob(campaignId, jobId);
      const itemId = job?.items[0]?.id ?? '';
      const originalSelected = job?.items[0]?.selected ?? false;

      act(() => {
        result.current.toggleRepairItem(campaignId, jobId, itemId);
      });

      const updatedJob = result.current.getJob(campaignId, jobId);
      expect(updatedJob?.items[0]?.selected).toBe(!originalSelected);
    });

    it('should recalculate totals after toggle', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      const job = result.current.getJob(campaignId, jobId);
      const originalCost = job?.totalCost ?? 0;
      const itemId = job?.items[0]?.id ?? '';

      act(() => {
        result.current.toggleRepairItem(campaignId, jobId, itemId);
      });

      const updatedJob = result.current.getJob(campaignId, jobId);
      expect(updatedJob?.totalCost).toBeLessThan(originalCost);
    });
  });

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  describe('startJob', () => {
    it('should change status to in progress', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      act(() => {
        result.current.startJob(campaignId, jobId);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.status).toBe(RepairJobStatus.InProgress);
      expect(job?.startedAt).toBeTruthy();
    });

    it('should add to repair bay active jobs', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
      });

      const bay = result.current.getRepairBay(campaignId);
      expect(bay.activeJobs).toContain(jobId);
    });

    it('should fail if bay at capacity', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      // Create and start jobs up to capacity
      const jobIds: string[] = [];
      act(() => {
        result.current.initializeCampaign(campaignId);
        const bay = result.current.getRepairBay(campaignId);
        for (let i = 0; i < bay.capacity + 1; i++) {
          jobIds.push(
            result.current.createRepairJob(campaignId, createTestAssessment({ unitId: `u${i}` }))
          );
        }
      });

      // Start jobs up to capacity
      act(() => {
        const bay = result.current.getRepairBay(campaignId);
        for (let i = 0; i < bay.capacity; i++) {
          result.current.startJob(campaignId, jobIds[i]);
        }
      });

      // Try to start one more
      let success = false;
      act(() => {
        success = result.current.startJob(campaignId, jobIds[jobIds.length - 1]);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should fail for non-pending job', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
      });

      // Try to start again
      let success = false;
      act(() => {
        success = result.current.startJob(campaignId, jobId);
      });

      expect(success).toBe(false);
    });
  });

  describe('completeJob', () => {
    it('should change status to completed', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
        result.current.completeJob(campaignId, jobId);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.status).toBe(RepairJobStatus.Completed);
      expect(job?.completedAt).toBeTruthy();
      expect(job?.timeRemainingHours).toBe(0);
    });

    it('should remove from active jobs', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
        result.current.completeJob(campaignId, jobId);
      });

      const bay = result.current.getRepairBay(campaignId);
      expect(bay.activeJobs).not.toContain(jobId);
    });
  });

  describe('cancelJob', () => {
    it('should change status to cancelled', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.cancelJob(campaignId, jobId);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.status).toBe(RepairJobStatus.Cancelled);
    });
  });

  describe('setJobPriority', () => {
    it('should update job priority', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.setJobPriority(campaignId, jobId, 10);
      });

      const job = result.current.getJob(campaignId, jobId);
      expect(job?.priority).toBe(10);
    });
  });

  describe('getPendingJobs', () => {
    it('should return only pending jobs sorted by priority', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let _job1Id = '';
      let job2Id = '';
      let job3Id = '';
      act(() => {
        _job1Id = result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u1' }));
        job2Id = result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u2' }));
        job3Id = result.current.createRepairJob(campaignId, createTestAssessment({ unitId: 'u3' }));
        result.current.setJobPriority(campaignId, job3Id, 0); // Highest priority
        result.current.startJob(campaignId, job2Id); // Not pending
      });

      const pendingJobs = result.current.getPendingJobs(campaignId);
      expect(pendingJobs).toHaveLength(2);
      expect(pendingJobs[0].id).toBe(job3Id); // Highest priority first
    });
  });

  // ===========================================================================
  // Time Advancement
  // ===========================================================================

  describe('advanceRepairs', () => {
    it('should reduce time remaining on active jobs', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
      });

      const originalTime = result.current.getJob(campaignId, jobId)?.timeRemainingHours ?? 0;

      act(() => {
        result.current.advanceRepairs(campaignId, 1);
      });

      const newTime = result.current.getJob(campaignId, jobId)?.timeRemainingHours ?? 0;
      expect(newTime).toBeLessThan(originalTime);
    });

    it('should complete jobs when time reaches 0', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
      });

      const totalTime = result.current.getJob(campaignId, jobId)?.totalTimeHours ?? 0;

      let completedIds: readonly string[] = [];
      act(() => {
        completedIds = result.current.advanceRepairs(campaignId, totalTime + 1);
      });

      expect(completedIds).toContain(jobId);
      expect(result.current.getJob(campaignId, jobId)?.status).toBe(RepairJobStatus.Completed);
    });

    it('should respect bay efficiency', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.initializeCampaign(campaignId);
        result.current.updateRepairBay(campaignId, { efficiency: 0.5 });
      });

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.startJob(campaignId, jobId);
      });

      const originalTime = result.current.getJob(campaignId, jobId)?.timeRemainingHours ?? 0;

      act(() => {
        result.current.advanceRepairs(campaignId, 2);
      });

      const newTime = result.current.getJob(campaignId, jobId)?.timeRemainingHours ?? 0;
      // With 0.5 efficiency, 2 hours should only reduce by 1 hour
      expect(originalTime - newTime).toBe(1);
    });
  });

  // ===========================================================================
  // Field Repairs
  // ===========================================================================

  describe('applyFieldRepair', () => {
    it('should calculate field repair result', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';
      const assessment = createTestAssessment({
        locationDamage: [
          createTestLocationDamage({ armorDamage: 20, armorMax: 40 }),
        ],
      });

      let repairResult: ReturnType<typeof result.current.applyFieldRepair>;
      act(() => {
        repairResult = result.current.applyFieldRepair(campaignId, assessment, 100);
      });

      expect(repairResult!.totalArmorRestored).toBeGreaterThan(0);
      expect(repairResult!.suppliesUsed).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Salvage
  // ===========================================================================

  describe('addSalvage', () => {
    it('should add parts to inventory', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.addSalvage(campaignId, [
          {
            id: 'part-1',
            componentName: 'Medium Laser',
            sourceUnitName: 'Enemy Mech',
            missionId: 'mission-1',
            condition: 0.8,
            estimatedValue: 5000,
          },
        ]);
      });

      const salvage = result.current.getSalvage(campaignId);
      expect(salvage.parts).toHaveLength(1);
      expect(salvage.totalValue).toBe(5000);
    });
  });

  describe('removeSalvage', () => {
    it('should remove part from inventory', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      act(() => {
        result.current.addSalvage(campaignId, [
          {
            id: 'part-1',
            componentName: 'Medium Laser',
            sourceUnitName: 'Enemy Mech',
            missionId: 'mission-1',
            condition: 0.8,
            estimatedValue: 5000,
          },
        ]);
        result.current.removeSalvage(campaignId, 'part-1');
      });

      const salvage = result.current.getSalvage(campaignId);
      expect(salvage.parts).toHaveLength(0);
      expect(salvage.totalValue).toBe(0);
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('validateJob', () => {
    it('should validate job against resources', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      const validation = result.current.validateJob(campaignId, jobId, 100000, 100);
      expect(validation.valid).toBe(true);
      expect(validation.canAfford).toBe(true);
    });

    it('should detect insufficient resources', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
      });

      const validation = result.current.validateJob(campaignId, jobId, 0, 0);
      expect(validation.valid).toBe(false);
      expect(validation.canAfford).toBe(false);
      expect(validation.shortfall).toBeGreaterThan(0);
    });

    it('should return error for non-existent job', () => {
      const { result } = renderHook(() => useRepairStore());
      const validation = result.current.validateJob('campaign', 'nonexistent', 100000, 100);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Job not found: nonexistent');
    });
  });

  // ===========================================================================
  // Selection
  // ===========================================================================

  describe('selectJob', () => {
    it('should set selected job ID', () => {
      const { result } = renderHook(() => useRepairStore());

      act(() => {
        result.current.selectJob('test-job');
      });

      expect(result.current.selectedJobId).toBe('test-job');
    });

    it('should allow clearing selection', () => {
      const { result } = renderHook(() => useRepairStore());

      act(() => {
        result.current.selectJob('test-job');
        result.current.selectJob(null);
      });

      expect(result.current.selectedJobId).toBeNull();
    });
  });

  describe('getSelectedJob', () => {
    it('should return selected job', () => {
      const { result } = renderHook(() => useRepairStore());
      const campaignId = 'test-campaign';

      let jobId = '';
      act(() => {
        jobId = result.current.createRepairJob(campaignId, createTestAssessment());
        result.current.selectJob(jobId);
      });

      const selected = result.current.getSelectedJob(campaignId);
      expect(selected?.id).toBe(jobId);
    });

    it('should return null if nothing selected', () => {
      const { result } = renderHook(() => useRepairStore());
      expect(result.current.getSelectedJob('campaign')).toBeNull();
    });
  });
});
