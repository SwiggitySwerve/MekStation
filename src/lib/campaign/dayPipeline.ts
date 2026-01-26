/**
 * Day Pipeline - Plugin/registry architecture for daily campaign processing
 *
 * Provides a registry where campaign modules register daily processors.
 * Processors are sorted by phase and executed in deterministic order.
 * Each processor receives the current campaign state and returns an updated
 * campaign with events describing what happened.
 *
 * This is the backbone for all Phase 2 campaign systems (turnover, repair,
 * financial, faction standing, etc.) — they register processors into this pipeline.
 *
 * Based on MekHQ's CampaignNewDayManager 24-phase ordering.
 *
 * @module lib/campaign/dayPipeline
 */

import { ICampaign } from '@/types/campaign/Campaign';
import { createSingleton } from '@/services/core/createSingleton';

// =============================================================================
// Pipeline Phase Enum
// =============================================================================

/**
 * Phases for day advancement processing.
 *
 * Processors are sorted by phase value (ascending).
 * Phases are spaced by 100 to allow future insertion.
 *
 * Based on MekHQ's CampaignNewDayManager ordering:
 * - Personnel processing (healing, medical, education) first
 * - Then facilities, markets, missions
 * - Financial processing near the end
 * - Cleanup/events last
 */
export enum DayPhase {
  /** Pre-processing setup */
  SETUP = 0,
  /** Personnel: healing, medical, education */
  PERSONNEL = 100,
  /** Facilities: field kitchen, MASH */
  FACILITIES = 200,
  /** Market refreshes */
  MARKETS = 300,
  /** Contract/scenario processing */
  MISSIONS = 400,
  /** Maintenance, parts, refits */
  UNITS = 500,
  /** Force processing, combat teams */
  FORCES = 600,
  /** Financial processing (salaries, taxes) */
  FINANCES = 700,
  /** Random events, faction standing */
  EVENTS = 800,
  /** Cleanup and reporting */
  CLEANUP = 900,
}

// =============================================================================
// Pipeline Event Types
// =============================================================================

/**
 * A generic event produced by a day processor.
 *
 * Events are the primary communication mechanism between processors and
 * the UI. Each processor produces events describing what happened during
 * its processing phase.
 *
 * The `type` field is used for backward compatibility mapping to legacy
 * DayReport types (e.g., 'healing', 'contract_expired', 'daily_costs').
 */
export interface IDayEvent {
  /** Event type identifier (e.g., 'healing', 'contract_expired', 'daily_costs') */
  readonly type: string;
  /** Human-readable description of the event */
  readonly description: string;
  /** Severity level for UI display */
  readonly severity: 'info' | 'warning' | 'critical';
  /** Arbitrary event-specific data */
  readonly data?: Record<string, unknown>;
}

// =============================================================================
// Processor Interface
// =============================================================================

/**
 * Result returned by a single day processor.
 */
export interface IDayProcessorResult {
  /** Events produced by this processor */
  readonly events: readonly IDayEvent[];
  /** Updated campaign state after processing */
  readonly campaign: ICampaign;
}

/**
 * Interface for a day processor plugin.
 *
 * Processors are pure functions that receive the current campaign state
 * and return an updated campaign with events. They must not have side effects.
 *
 * @example
 * ```typescript
 * const healingProcessor: IDayProcessor = {
 *   id: 'healing',
 *   phase: DayPhase.PERSONNEL,
 *   displayName: 'Personnel Healing',
 *   process(campaign, date) {
 *     // Process healing logic
 *     return { events: [...], campaign: updatedCampaign };
 *   }
 * };
 * ```
 */
export interface IDayProcessor {
  /** Unique identifier for this processor */
  readonly id: string;
  /** Phase in which this processor runs */
  readonly phase: DayPhase;
  /** Human-readable name for UI display */
  readonly displayName: string;
  /** Process one day for the campaign. Must be pure (no side effects). */
  process(campaign: ICampaign, date: Date): IDayProcessorResult;
}

// =============================================================================
// Pipeline Result
// =============================================================================

/**
 * Aggregated result from running all processors for one day.
 */
export interface IDayPipelineResult {
  /** The date that was processed */
  readonly date: Date;
  /** All events from all processors, in processing order */
  readonly events: readonly IDayEvent[];
  /** The final campaign state after all processors */
  readonly campaign: ICampaign;
  /** IDs of processors that were run, in order */
  readonly processorsRun: readonly string[];
}

// =============================================================================
// Pipeline Registry
// =============================================================================

/**
 * Registry and orchestrator for day processors.
 *
 * Processors register themselves with the registry. When `processDay()` is called,
 * processors are sorted by phase and executed in order. Each processor receives
 * the campaign state from the previous processor (chain pattern).
 *
 * If a processor throws, it is skipped and the pipeline continues with the
 * unchanged campaign state.
 *
 * @example
 * ```typescript
 * const pipeline = getDayPipeline();
 * pipeline.register(healingProcessor);
 * pipeline.register(contractProcessor);
 * const result = pipeline.processDay(campaign);
 * ```
 */
export class DayPipelineRegistry {
  private processors: IDayProcessor[] = [];

  /**
   * Register a processor with the pipeline.
   *
   * If a processor with the same ID already exists, it is replaced.
   *
   * @param processor - The processor to register
   */
  register(processor: IDayProcessor): void {
    const existingIndex = this.processors.findIndex((p) => p.id === processor.id);
    if (existingIndex !== -1) {
      this.processors[existingIndex] = processor;
    } else {
      this.processors.push(processor);
    }
  }

  /**
   * Unregister a processor by ID.
   *
   * @param id - The processor ID to remove
   */
  unregister(id: string): void {
    this.processors = this.processors.filter((p) => p.id !== id);
  }

  /**
   * Get all registered processors, sorted by phase (ascending).
   *
   * Within the same phase, processors are ordered by registration order.
   */
  getProcessors(): readonly IDayProcessor[] {
    return [...this.processors].sort((a, b) => a.phase - b.phase);
  }

  /**
   * Get processors registered for a specific phase.
   *
   * @param phase - The phase to filter by
   */
  getProcessorsByPhase(phase: DayPhase): readonly IDayProcessor[] {
    return this.processors
      .filter((p) => p.phase === phase)
      .sort((a, b) => a.phase - b.phase);
  }

  /**
   * Process one day through all registered processors.
   *
   * Processors are executed in phase order. Each processor receives
   * the campaign state from the previous processor. If a processor throws,
   * it is skipped and processing continues with the unchanged state.
   *
   * The date is advanced by one day AFTER all processors run.
   *
   * @param campaign - The campaign to process
   * @returns Aggregated result from all processors
   */
  processDay(campaign: ICampaign): IDayPipelineResult {
    const processedDate = campaign.currentDate;
    const sortedProcessors = this.getProcessors();
    const allEvents: IDayEvent[] = [];
    const processorsRun: string[] = [];
    let currentCampaign = campaign;

    for (const processor of sortedProcessors) {
      try {
        const result = processor.process(currentCampaign, processedDate);
        currentCampaign = result.campaign;
        allEvents.push(...result.events);
        processorsRun.push(processor.id);
      } catch (error) {
        // Log error but continue pipeline — processor is skipped
        console.error(
          `[DayPipeline] Processor "${processor.id}" (${processor.displayName}) failed:`,
          error
        );
        processorsRun.push(processor.id);
      }
    }

    // Advance the date by one day AFTER all processors
    const nextDate = new Date(processedDate.getTime() + 24 * 60 * 60 * 1000);
    const finalCampaign: ICampaign = {
      ...currentCampaign,
      currentDate: nextDate,
      updatedAt: new Date().toISOString(),
    };

    return {
      date: processedDate,
      events: allEvents,
      campaign: finalCampaign,
      processorsRun,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

const pipelineRegistry = createSingleton(() => new DayPipelineRegistry());

/**
 * Get the singleton DayPipelineRegistry instance.
 */
export function getDayPipeline(): DayPipelineRegistry {
  return pipelineRegistry.get();
}

/**
 * Reset the singleton pipeline (for testing).
 */
export function _resetDayPipeline(): void {
  pipelineRegistry.reset();
}

// =============================================================================
// Date Helper Functions
// =============================================================================

/**
 * Check if a date is the first day of the month.
 */
export function isFirstOfMonth(date: Date): boolean {
  return date.getUTCDate() === 1;
}

/**
 * Check if a date is a Monday.
 */
export function isMonday(date: Date): boolean {
  return date.getUTCDay() === 1;
}

/**
 * Check if a date is the first day of the year.
 */
export function isFirstOfYear(date: Date): boolean {
  return date.getUTCMonth() === 0 && date.getUTCDate() === 1;
}
