import type {
  ICreateEncounterInput,
  IEncounter,
  IEncounterValidationResult,
  IUpdateEncounterInput,
  EncounterStatus,
  ScenarioTemplateType,
} from '@/types/encounter';

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Raw stored force-id strings keyed by encounter id, returned alongside the
 * hydrated encounter array so the list page can detect broken-pill state
 * without an extra round-trip.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State)
 */
export type RawForceIdsByEncounterId = Record<
  string,
  {
    readonly playerForceId: string | null;
    readonly opponentForceId: string | null;
  }
>;

export interface ListEncountersResponse {
  encounters: IEncounter[];
  count: number;
  rawForceIds?: RawForceIdsByEncounterId;
}

export interface EncounterResponse {
  success: boolean;
  id?: string;
  encounter?: IEncounter;
  error?: string;
}

export interface LaunchResponse {
  success: boolean;
  gameSessionId?: string;
  error?: string;
}

export interface SeedSamplesResponse {
  success: boolean;
  ids?: readonly string[];
  error?: string;
}

export interface LaunchEncounterOptions {
  readonly campaignId?: string | null;
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
}

export interface ValidationResponse {
  validation: IEncounterValidationResult;
}

// =============================================================================
// Store State
// =============================================================================

export interface EncounterStoreState {
  /** All loaded encounters */
  encounters: IEncounter[];
  /**
   * Raw stored force-id strings keyed by encounter id, populated from the
   * `/api/encounters` GET response. Consumed by `getEncounterRawForceIds`
   * + the `encounterBrokenRefs` helper for broken-pill detection on the
   * list page.
   */
  rawForceIds: RawForceIdsByEncounterId;
  /** Currently selected encounter ID */
  selectedEncounterId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Filter by status */
  statusFilter: EncounterStatus | 'all';
  /** Search query */
  searchQuery: string;
  /** Validation cache (keyed by encounter ID) */
  validations: Map<string, IEncounterValidationResult>;
}

export interface EncounterStoreActions {
  /** Load all encounters from API */
  loadEncounters: () => Promise<void>;
  /** Get a single encounter by ID */
  getEncounter: (id: string) => IEncounter | undefined;
  /**
   * Get the raw stored force-id strings for an encounter. Returns null if
   * the encounter id is unknown to the store (no entry in `rawForceIds`).
   * Pair with `encounterBrokenRefs` to render broken-pill state.
   */
  getEncounterRawForceIds: (id: string) => {
    playerForceId: string | null;
    opponentForceId: string | null;
  } | null;
  /** Create a new encounter */
  createEncounter: (input: ICreateEncounterInput) => Promise<string | null>;
  /** Update an encounter */
  updateEncounter: (
    id: string,
    input: IUpdateEncounterInput,
  ) => Promise<boolean>;
  /** Delete an encounter */
  deleteEncounter: (id: string) => Promise<boolean>;
  /** Select an encounter */
  selectEncounter: (id: string | null) => void;
  /** Get selected encounter */
  getSelectedEncounter: () => IEncounter | null;
  /** Set player force */
  setPlayerForce: (encounterId: string, forceId: string) => Promise<boolean>;
  /**
   * Clear the player force on an encounter. Routes through the existing
   * `DELETE /api/encounters/[id]/player-force` endpoint — used by the
   * detail-page repair banner when the operator confirms the broken
   * reference should be cleared.
   *
   * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
   *       (Requirement: Encounter Detail Page Repair Banner)
   */
  clearPlayerForce: (encounterId: string) => Promise<boolean>;
  /** Set opponent force */
  setOpponentForce: (encounterId: string, forceId: string) => Promise<boolean>;
  /** Clear opponent force */
  clearOpponentForce: (encounterId: string) => Promise<boolean>;
  /**
   * POST `/api/encounters/seed-samples` — creates 4 starter encounters,
   * one per `ScenarioTemplateType` value (Duel/Skirmish/Battle/Custom),
   * then refreshes the local list. Used by the empty-state seed button.
   *
   * Returns the array of newly-created ids on success, `null` on failure
   * (with `error` populated on the store).
   *
   * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
   *       (Requirement: Empty-State Seed Samples)
   */
  seedSampleEncounters: () => Promise<readonly string[] | null>;
  /** Apply a template */
  applyTemplate: (
    encounterId: string,
    template: ScenarioTemplateType,
  ) => Promise<boolean>;
  /** Validate an encounter */
  validateEncounter: (id: string) => Promise<IEncounterValidationResult | null>;
  /** Launch an encounter — returns gameSessionId on success, null on failure */
  launchEncounter: (
    id: string,
    options?: LaunchEncounterOptions,
  ) => Promise<string | null>;
  /** Clone an encounter */
  cloneEncounter: (id: string, newName: string) => Promise<string | null>;
  /** Set status filter */
  setStatusFilter: (status: EncounterStatus | 'all') => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Get filtered encounters */
  getFilteredEncounters: () => IEncounter[];
  /** Clear error */
  clearError: () => void;
}

export type EncounterStore = EncounterStoreState & EncounterStoreActions;
