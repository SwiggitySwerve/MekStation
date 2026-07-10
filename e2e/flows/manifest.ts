/**
 * Flow-Audit Manifest — the typed registry of named audit flows.
 *
 * This is the single source of truth (design D1) for the flow-audit routines:
 * `e2e/flow-audits.spec.ts` generates one Playwright test per entry here, and
 * the runner (`scripts/qc/run-flow-audit.mjs`, task 4) enumerates it for
 * `--list`. Each flow declares a unique kebab-case id, a human-readable
 * description, the subsystem tag(s) it exercises, an ordered list of named
 * checkpoints, and the viewport presets it supports.
 *
 * Every checkpoint carries a `holdSafe` flag (design D3 honesty rule): true
 * only when the application state AT that checkpoint is server-persisted, so a
 * developer running `--hold` can open the dev server and actually see it.
 * Browser-only state (mid-battle IndexedDB, non-serialized projections) is
 * `holdSafe: false`.
 *
 * @spec openspec/changes/add-flow-audit-routines/specs/flow-audit-routines/spec.md
 */

/**
 * The gameplay subsystems a flow can exercise (spec: Flow Registry). This is
 * a closed vocabulary matching the spec's literal six-tag enum exactly — do
 * not add tags here without amending the spec text first.
 */
export type FlowSubsystem =
  | 'navigation'
  | 'combat'
  | 'economy'
  | 'maintenance'
  | 'personnel'
  | 'experience';

/** Named viewport presets derived from the canonical layout breakpoints. */
export const FLOW_VIEWPORT_PRESETS = ['mobile', 'tablet', 'desktop'] as const;
export type FlowViewportPreset = (typeof FLOW_VIEWPORT_PRESETS)[number];

/** One named boundary within a flow where evidence is captured. */
export interface IFlowCheckpoint {
  /** Stable, unique-within-flow checkpoint name. */
  readonly name: string;
  /**
   * True when the state reached at this checkpoint is server-persisted and
   * therefore visible on a running dev server in `--hold` mode (design D3).
   */
  readonly holdSafe: boolean;
}

/** A single registered audit flow. */
export interface IFlowDefinition {
  /** Unique kebab-case flow id (also the generated test title). */
  readonly id: string;
  /** Human-readable summary of what the flow drives. */
  readonly description: string;
  /** Subsystem tag(s) the flow exercises. */
  readonly subsystems: readonly FlowSubsystem[];
  /** Ordered checkpoints, matched 1:1 by the flow implementation. */
  readonly checkpoints: readonly IFlowCheckpoint[];
  /** Viewport presets the flow supports. */
  readonly viewports: readonly FlowViewportPreset[];
}

/** All flows support all presets; the run picks one via the viewport env var. */
const ALL_VIEWPORTS: readonly FlowViewportPreset[] = FLOW_VIEWPORT_PRESETS;

/**
 * The initial flow registry — one flow per gameplay subsystem (spec:
 * Subsystem Flow Coverage). Checkpoint names/order MUST match the
 * implementations in `e2e/flow-audits.spec.ts` exactly.
 */
export const FLOW_MANIFEST: readonly IFlowDefinition[] = [
  {
    id: 'campaign-create-to-launch',
    description:
      'Create a mercenary campaign through the wizard, save it, view the starmap, accept a contract, and open the mission launch briefing.',
    subsystems: ['navigation'],
    checkpoints: [
      // The campaign lives only in the browser store until it is saved.
      { name: 'wizard-complete', holdSafe: false },
      { name: 'campaign-saved', holdSafe: true },
      { name: 'starmap-viewed', holdSafe: true },
      { name: 'contract-accepted', holdSafe: true },
      { name: 'mission-launch-briefing', holdSafe: true },
    ],
    viewports: ALL_VIEWPORTS,
  },
  {
    id: 'battle-turn-loop',
    description:
      'Take a saved campaign with an accepted contract to pre-battle, mount a manual battle, and probe the initiative/first-movement turn loop.',
    subsystems: ['combat'],
    checkpoints: [
      { name: 'campaign-saved', holdSafe: true },
      { name: 'contract-accepted', holdSafe: true },
      { name: 'pre-battle-roster', holdSafe: true },
      // Battle-session state lives in the browser (IndexedDB match log), so it
      // is NOT visible on a dev server in hold mode (design D3 honesty rule).
      { name: 'battle-mounted', holdSafe: false },
      { name: 'initiative-rolled', holdSafe: false },
      { name: 'first-movement-locked', holdSafe: false },
    ],
    viewports: ALL_VIEWPORTS,
  },
  {
    id: 'economy-contract-to-ledger',
    description:
      'Save a campaign, accept a contract, advance a day, and confirm the finances ledger surface renders the resulting transactions.',
    subsystems: ['economy'],
    checkpoints: [
      { name: 'campaign-saved', holdSafe: true },
      { name: 'contract-accepted', holdSafe: true },
      { name: 'day-advanced', holdSafe: true },
      { name: 'ledger-posted', holdSafe: true },
    ],
    viewports: ALL_VIEWPORTS,
  },
  {
    id: 'maintenance-repair-cycle',
    description:
      'Save a campaign, seed repair tickets into the inventory projection, view the repair-bay queue, and advance a day to re-project maintenance.',
    subsystems: ['maintenance'],
    checkpoints: [
      { name: 'campaign-saved', holdSafe: true },
      // The repair-bay reads a derived inventory projection that is NOT
      // serialized to the server, so seeded tickets are browser-only.
      { name: 'repair-tickets-seeded', holdSafe: false },
      { name: 'repair-bay-queue', holdSafe: false },
      { name: 'repair-progressed', holdSafe: false },
    ],
    viewports: ALL_VIEWPORTS,
  },
  {
    id: 'personnel-hiring',
    description:
      'Save a campaign, seed the hiring-hall market, hire a candidate, and confirm the personnel roster surface updates.',
    subsystems: ['personnel'],
    checkpoints: [
      { name: 'campaign-saved', holdSafe: true },
      // The personnel market IS serialized to the server (serializeCampaign),
      // so the seeded/updated market survives into hold mode.
      { name: 'hiring-hall-seeded', holdSafe: true },
      { name: 'candidate-hired', holdSafe: true },
      { name: 'roster-updated', holdSafe: true },
    ],
    viewports: ALL_VIEWPORTS,
  },
  {
    id: 'pilot-xp-progression',
    description:
      'Create a standalone pilot through the creation wizard, open the pilot detail page, and view the career/XP surface.',
    subsystems: ['experience'],
    checkpoints: [
      // Pilots persist to disk via the /api/pilots REST surface.
      { name: 'pilot-created', holdSafe: true },
      { name: 'pilot-detail-viewed', holdSafe: true },
      { name: 'xp-surface-viewed', holdSafe: true },
    ],
    viewports: ALL_VIEWPORTS,
  },
];

/**
 * Fail loud on a malformed registry: duplicate flow ids, duplicate checkpoint
 * names within one flow, or a flow with zero checkpoints (spec: "Duplicate or
 * malformed flow ids are rejected"). Called at module load so any consumer of
 * a bad manifest crashes immediately rather than running a partial registry.
 */
export function validateFlowManifest(
  flows: readonly IFlowDefinition[] = FLOW_MANIFEST,
): void {
  const seenFlowIds = new Set<string>();
  for (const flow of flows) {
    if (seenFlowIds.has(flow.id)) {
      throw new Error(`Flow manifest invalid: duplicate flow id "${flow.id}"`);
    }
    seenFlowIds.add(flow.id);

    if (flow.checkpoints.length === 0) {
      throw new Error(
        `Flow manifest invalid: flow "${flow.id}" has zero checkpoints`,
      );
    }

    const seenCheckpoints = new Set<string>();
    for (const checkpoint of flow.checkpoints) {
      if (seenCheckpoints.has(checkpoint.name)) {
        throw new Error(
          `Flow manifest invalid: flow "${flow.id}" has duplicate checkpoint "${checkpoint.name}"`,
        );
      }
      seenCheckpoints.add(checkpoint.name);
    }
  }
}

// Validate at module load — importing a bad manifest fails any consumer now.
validateFlowManifest();

/** Look up a flow by id, or `undefined` when it is not registered. */
export function getFlow(id: string): IFlowDefinition | undefined {
  return FLOW_MANIFEST.find((flow) => flow.id === id);
}
