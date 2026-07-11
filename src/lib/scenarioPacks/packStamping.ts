/**
 * Scenario Pack Id Stamping — the graph-aware remap machinery (design D4
 * + D11).
 *
 * Two halves, sharing one mechanism:
 *
 * - **Load side** (`stampPackIds`): per test-worker load, rewrites a
 *   pack's row-external id (campaign id / match id) to a fresh
 *   `${packId}-w${workerIndex}-${uuid}` template so parallel workers
 *   never share a persisted row (design D4, template deviation from the
 *   `${workerIndex}-${Date.now()}` e2e convention — a uuid never
 *   collides inside one millisecond).
 * - **Mint side** (`canonicalizePackPayload`): at mint time, rewrites the
 *   captured wall-clock production id graph to deterministic,
 *   pack-scoped template ids (`pack:<packId>:<role>[:<NN>]`) and strips
 *   the two verified cross-store references
 *   (`SerializedCampaignRosterMissionRecord.encounterId`/`gameSessionId`,
 *   design D11.2) so payloads become true id-templates: two mints of the
 *   same deterministic state carry identical id graphs.
 *
 * Both halves apply an enumerated, per-field remap and then run the
 * **zero-residue scan** (design D4.3) over the ENTIRE resulting
 * payload — a mechanical backstop that fails loud, naming the JSON
 * path, when a remapped-from id survives anywhere the enumeration
 * doesn't (yet) know about, rather than silently widening the
 * enumeration or pretending it is complete forever.
 *
 * Remap-family scope (deliberately bounded — design D4.1's
 * "self-contained graph" escape hatch): only the **row-external** id
 * (campaign id / match id) and the roster-projection mission ids (which
 * D11's own worked example canonicalizes: `pack:…:mission:01`) are
 * tracked. Force ids, unit ids, and body-level mission ids never leave
 * a single campaign row and never collide across rows, so they MAY keep
 * their minted values (design D4.1) — this implementation exercises
 * that allowance rather than remapping them.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D4, D11)
 */

import type { CampaignPackPayload, EncounterPackPayload } from './packSchemas';

// =============================================================================
// Shared types
// =============================================================================

export interface StampOptions {
  readonly packId: string;
  readonly workerIndex: number;
}

export interface MintOptions {
  readonly packId: string;
}

export interface StampedCampaignIds {
  readonly campaignId: string;
}

export interface StampedEncounterIds {
  readonly matchId: string;
}

export interface StampedCampaignPackResult {
  readonly payload: CampaignPackPayload;
  readonly ids: StampedCampaignIds;
}

export interface StampedEncounterPackResult {
  readonly payload: EncounterPackPayload;
  readonly ids: StampedEncounterIds;
}

/**
 * Thrown by the zero-residue scan (design D4.3) when a remapped-from id
 * survives anywhere in the stamped/canonicalized payload outside the
 * locations the targeted remap touched. Naming the exact path is the
 * point — this is the mechanical backstop for R3's "half-stamped id
 * graph" risk, not a soft warning.
 */
export class PackIdResidueError extends Error {
  constructor(
    readonly context: string,
    readonly residuePath: string,
    readonly residueValue: string,
  ) {
    super(
      `${context}: stamped id residue found at path "${residuePath}" — the value "${residueValue}" survived outside the enumerated remap locations`,
    );
    this.name = 'PackIdResidueError';
  }
}

// =============================================================================
// Shared helpers
// =============================================================================

/**
 * Deep-clones a JSON-safe payload. Pack payloads are, by contract,
 * JSON-serializable (they are read from / written to `.json` files), so
 * a stringify/parse round-trip is sufficient and — unlike
 * `structuredClone` — needs no jsdom polyfill (the global is not
 * reliably present under the `unit` project's jsdom test environment;
 * see the codebase's existing `structuredClone` polyfill shims for the
 * same gotcha).
 */
function cloneJsonPayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

/**
 * Mints a fresh, collision-resistant id segment. Prefers
 * `crypto.randomUUID()` (design D4's chosen template component — it
 * cannot collide inside one millisecond the way the legacy
 * `${workerIndex}-${Date.now()}` e2e convention can); falls back to a
 * timestamp + random-base36 pair when unavailable (mirrors
 * `src/lib/campaign/persistence/deviceId.ts`'s `mintUuid` — jsdom does
 * not reliably expose `crypto.randomUUID`).
 */
function mintUniqueIdSegment(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  const rand = (): string => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}

/**
 * Recursively walks a JSON-safe value looking for any string that
 * exactly equals one of `forbiddenValues`. Returns the first offending
 * path (`a.b[2].c` form) or `undefined` when none is found. Exact-match
 * (not substring) by design: production id generators
 * (`createEventId()` → `uuidv4()`, `generateUniqueId()`) never embed one
 * id as a substring of another, so exact matching avoids false
 * positives from unrelated strings that merely contain an id-shaped
 * substring (e.g. a free-text description).
 */
function findFirstResiduePath(
  value: unknown,
  forbiddenValues: ReadonlySet<string>,
  path: string,
): string | undefined {
  if (typeof value === 'string') {
    return forbiddenValues.has(value) ? path : undefined;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findFirstResiduePath(
        value[index],
        forbiddenValues,
        `${path}[${index}]`,
      );
      if (hit) return hit;
    }
    return undefined;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const hit = findFirstResiduePath(
        nested,
        forbiddenValues,
        path ? `${path}.${key}` : key,
      );
      if (hit) return hit;
    }
    return undefined;
  }
  return undefined;
}

/**
 * The zero-residue guarantee (design D4.3): after a targeted remap is
 * applied, the serialized payload SHALL contain zero occurrences of any
 * id the remap table maps from. Throws `PackIdResidueError` naming the
 * offending path on the first hit.
 */
function assertZeroResidue(
  payload: unknown,
  remapTable: ReadonlyMap<string, string>,
  context: string,
): void {
  const forbidden = new Set(remapTable.keys());
  if (forbidden.size === 0) return;
  const hit = findFirstResiduePath(payload, forbidden, '$');
  if (hit) {
    const value = readAtDottedPath(payload, hit);
    throw new PackIdResidueError(
      context,
      hit,
      typeof value === 'string' ? value : String(value),
    );
  }
}

/** Resolves a `$.a.b[2].c`-shaped path (as produced by `findFirstResiduePath`) back to its value, for error messages. */
function readAtDottedPath(root: unknown, path: string): unknown {
  const segments = path
    .replace(/^\$\.?/, '')
    .split(/\.|\[|\]/)
    .filter((segment) => segment.length > 0);
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// =============================================================================
// Type guards
// =============================================================================

function isCampaignPackPayload(
  payload: CampaignPackPayload | EncounterPackPayload,
): payload is CampaignPackPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'body' in payload &&
    'campaignId' in payload
  );
}

function isEncounterPackPayload(
  payload: CampaignPackPayload | EncounterPackPayload,
): payload is EncounterPackPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'events' in payload &&
    'matchId' in payload &&
    !('body' in payload)
  );
}

// =============================================================================
// Load-side stamping (`stampPackIds`)
// =============================================================================

/**
 * Stamps fresh, parallel-safe ids into a pack payload before any PUT or
 * IndexedDB seed (design D4). Reads the CURRENT id value(s) present at
 * the known remap-family locations — this makes stamping compose
 * cleanly on top of `canonicalizePackPayload`'s output (whatever the
 * canonical template id is becomes the "from" value, same as a raw
 * production id would) — then applies a single freshly-minted id at
 * every one of those locations, and runs the zero-residue scan.
 */
export function stampPackIds(
  payload: CampaignPackPayload,
  options: StampOptions,
): StampedCampaignPackResult;
export function stampPackIds(
  payload: EncounterPackPayload,
  options: StampOptions,
): StampedEncounterPackResult;
export function stampPackIds(
  payload: CampaignPackPayload | EncounterPackPayload,
  options: StampOptions,
): StampedCampaignPackResult | StampedEncounterPackResult {
  if (isCampaignPackPayload(payload)) {
    return stampCampaignPackIds(payload, options);
  }
  if (isEncounterPackPayload(payload)) {
    return stampEncounterPackIds(payload, options);
  }
  throw new Error(
    'stampPackIds: payload is neither a campaign pack nor an encounter pack',
  );
}

function stampCampaignPackIds(
  payload: CampaignPackPayload,
  { packId, workerIndex }: StampOptions,
): StampedCampaignPackResult {
  const stampedCampaignId = `${packId}-w${workerIndex}-${mintUniqueIdSegment()}`;

  // Gather every current occurrence of the campaignId family (design
  // D4.1: envelope.campaignId, body.id, rosterProjection.campaignId,
  // every rosterProjection mission record's campaignId) as remap-from
  // candidates — even if a malformed input carries divergent values
  // across these locations, every one of them gets swept into the same
  // stamped id and the residue scan proves none of the originals survive.
  const fromValues = new Set<string>();
  if (payload.campaignId) fromValues.add(payload.campaignId);
  if (payload.body?.id) fromValues.add(payload.body.id);
  const rosterProjection = payload.body?.rosterProjection;
  if (rosterProjection?.campaignId) fromValues.add(rosterProjection.campaignId);
  for (const mission of rosterProjection?.missions ?? []) {
    if (mission.campaignId) fromValues.add(mission.campaignId);
  }

  const clone = cloneJsonPayload(payload);
  clone.campaignId = stampedCampaignId;
  if (clone.body) {
    clone.body.id = stampedCampaignId;
    if (clone.body.rosterProjection) {
      clone.body.rosterProjection.campaignId = stampedCampaignId;
      for (const mission of clone.body.rosterProjection.missions ?? []) {
        mission.campaignId = stampedCampaignId;
      }
    }
  }

  const remapTable = new Map(
    Array.from(fromValues, (from) => [from, stampedCampaignId]),
  );
  assertZeroResidue(
    clone,
    remapTable,
    `stampPackIds(campaign, packId=${packId})`,
  );

  return { payload: clone, ids: { campaignId: stampedCampaignId } };
}

function stampEncounterPackIds(
  payload: EncounterPackPayload,
  { packId, workerIndex }: StampOptions,
): StampedEncounterPackResult {
  const stampedMatchId = `${packId}-w${workerIndex}-${mintUniqueIdSegment()}`;

  // The matchId family (design D4.2): the top-level matchId (the row
  // key) plus every event's `gameId`. Session-scoped deployed unit ids
  // (`${side}-${slot}-${unitRef}` composites, living inside
  // `event.payload.units`) are never touched — they are session-scoped,
  // cross no row boundary, and remapping them would corrupt the event
  // stream's own internal references (design D4.2).
  const fromValues = new Set<string>();
  if (payload.matchId) fromValues.add(payload.matchId);
  for (const event of payload.events) {
    if (event.gameId) fromValues.add(event.gameId);
  }

  const clone = cloneJsonPayload(payload);
  clone.matchId = stampedMatchId;
  for (const event of clone.events) {
    event.gameId = stampedMatchId;
  }

  const remapTable = new Map(
    Array.from(fromValues, (from) => [from, stampedMatchId]),
  );
  assertZeroResidue(
    clone,
    remapTable,
    `stampPackIds(encounter, packId=${packId})`,
  );

  return { payload: clone, ids: { matchId: stampedMatchId } };
}

// =============================================================================
// Mint-side canonicalization (`canonicalizePackPayload`, design D11)
// =============================================================================

export interface CanonicalizedCampaignIds {
  readonly campaignId: string;
}

export interface CanonicalizedEncounterIds {
  readonly matchId: string;
}

export interface CanonicalizedCampaignPackResult {
  readonly payload: CampaignPackPayload;
  readonly ids: CanonicalizedCampaignIds;
}

export interface CanonicalizedEncounterPackResult {
  readonly payload: EncounterPackPayload;
  readonly ids: CanonicalizedEncounterIds;
}

/** `campaign-<epoch>-<rand>` / `force-<epoch>-<rand>` / `mission-<epoch>-<rand>` (`Campaign.ts:599-626`, `campaignRosterStore.helpers.ts:36-38`). */
const WALL_CLOCK_ID_PATTERN = /^(?:campaign|force|mission)-\d+-[a-z0-9]+$/;

/**
 * Canonicalizes a captured pack payload's id graph to deterministic,
 * pack-scoped template ids (design D11) and strips the cross-store
 * references that do not travel with a campaign pack. Uses the SAME
 * remap-and-zero-residue-scan mechanism as `stampPackIds` so the two
 * halves compose: `stampPackIds` run on this function's output remaps
 * cleanly FROM the canonical template ids it just wrote.
 *
 * Pure and deterministic — no `crypto.randomUUID()`, no `Date.now()`:
 * two calls against the same captured payload for the same `packId`
 * produce byte-identical output (design D11's "true id-templates"
 * property, and the recapture job's invariant-level id-graph
 * comparison, design D7).
 */
export function canonicalizePackPayload(
  payload: CampaignPackPayload,
  options: MintOptions,
): CanonicalizedCampaignPackResult;
export function canonicalizePackPayload(
  payload: EncounterPackPayload,
  options: MintOptions,
): CanonicalizedEncounterPackResult;
export function canonicalizePackPayload(
  payload: CampaignPackPayload | EncounterPackPayload,
  options: MintOptions,
): CanonicalizedCampaignPackResult | CanonicalizedEncounterPackResult {
  if (isCampaignPackPayload(payload)) {
    return canonicalizeCampaignPackPayload(payload, options);
  }
  if (isEncounterPackPayload(payload)) {
    return canonicalizeEncounterPackPayload(payload, options);
  }
  throw new Error(
    'canonicalizePackPayload: payload is neither a campaign pack nor an encounter pack',
  );
}

function canonicalizeCampaignPackPayload(
  payload: CampaignPackPayload,
  { packId }: MintOptions,
): CanonicalizedCampaignPackResult {
  const canonicalCampaignId = `pack:${packId}:campaign`;

  const fromValues = new Set<string>();
  if (payload.campaignId) fromValues.add(payload.campaignId);
  if (payload.body?.id) fromValues.add(payload.body.id);
  const rosterProjection = payload.body?.rosterProjection;
  if (rosterProjection?.campaignId) fromValues.add(rosterProjection.campaignId);
  for (const mission of rosterProjection?.missions ?? []) {
    if (mission.campaignId) fromValues.add(mission.campaignId);
  }

  const clone = cloneJsonPayload(payload);
  clone.campaignId = canonicalCampaignId;
  if (clone.body) {
    clone.body.id = canonicalCampaignId;
  }

  const remapTable = new Map(
    Array.from(fromValues, (from) => [from, canonicalCampaignId]),
  );

  const clonedRosterProjection = clone.body?.rosterProjection;
  if (clonedRosterProjection) {
    clonedRosterProjection.campaignId = canonicalCampaignId;

    // Mission ids canonicalize to role-ordinal template ids in
    // missionNumber order (design D11's own worked example:
    // `pack:…:mission:01`). This is the one campaign-internal id family
    // D11 explicitly canonicalizes — mission ids never leave a single
    // campaign row, but D11's worked example still names them, so the
    // mint pass makes two mints of the same state carry identical
    // mission-id graphs too, not just the campaign id.
    const missionIdMap = new Map<string, string>();
    const orderedMissions = [...(clonedRosterProjection.missions ?? [])].sort(
      (a, b) => a.missionNumber - b.missionNumber,
    );
    orderedMissions.forEach((mission, index) => {
      const canonicalMissionId = `pack:${packId}:mission:${String(index + 1).padStart(2, '0')}`;
      missionIdMap.set(mission.id, canonicalMissionId);
      fromValues.add(mission.id);
      remapTable.set(mission.id, canonicalMissionId);
    });

    for (const mission of clonedRosterProjection.missions ?? []) {
      const canonicalMissionId = missionIdMap.get(mission.id);
      if (canonicalMissionId) {
        mission.id = canonicalMissionId;
      }
      mission.campaignId = canonicalCampaignId;
      // Cross-store reference stripping (design D11.2): these fields
      // reference rows in the encounter store / match-log IndexedDB
      // that do NOT travel with a campaign pack — remapping cannot fix
      // them (the referenced rows don't exist in the loading browser),
      // so the canonicalizer strips both. Both are optional on the
      // interface, so absence is the legal pre-link shape.
      delete mission.encounterId;
      delete mission.gameSessionId;
    }

    if (
      clonedRosterProjection.activeMissionId &&
      missionIdMap.has(clonedRosterProjection.activeMissionId)
    ) {
      clonedRosterProjection.activeMissionId = missionIdMap.get(
        clonedRosterProjection.activeMissionId,
      )!;
    }
  }

  assertZeroResidue(
    clone,
    remapTable,
    `canonicalizePackPayload(campaign, packId=${packId})`,
  );
  assertNoWallClockResidueInFamily(
    [clone.campaignId, clone.body?.id, clonedRosterProjection?.campaignId],
    `canonicalizePackPayload(campaign, packId=${packId})`,
  );
  for (const mission of clonedRosterProjection?.missions ?? []) {
    assertNoWallClockResidueInFamily(
      [mission.id, mission.campaignId],
      `canonicalizePackPayload(campaign, packId=${packId})`,
    );
  }

  return { payload: clone, ids: { campaignId: canonicalCampaignId } };
}

function canonicalizeEncounterPackPayload(
  payload: EncounterPackPayload,
  { packId }: MintOptions,
): CanonicalizedEncounterPackResult {
  const canonicalMatchId = `pack:${packId}:match`;

  const fromValues = new Set<string>();
  if (payload.matchId) fromValues.add(payload.matchId);
  for (const event of payload.events) {
    if (event.gameId) fromValues.add(event.gameId);
  }

  const clone = cloneJsonPayload(payload);
  clone.matchId = canonicalMatchId;
  for (const event of clone.events) {
    event.gameId = canonicalMatchId;
  }

  const remapTable = new Map(
    Array.from(fromValues, (from) => [from, canonicalMatchId]),
  );
  assertZeroResidue(
    clone,
    remapTable,
    `canonicalizePackPayload(encounter, packId=${packId})`,
  );

  return { payload: clone, ids: { matchId: canonicalMatchId } };
}

/**
 * Design D11.1's "no wall-clock-shaped id survives" check, scoped ONLY
 * to the fields that ARE part of a tracked remap family (never the
 * whole document — a legitimate, deliberately-untouched `rootForceId`
 * like `force-1720000000000-abc1234` would otherwise false-positive;
 * force ids are explicitly out of this implementation's remap scope,
 * design D4.1's "self-contained graph" allowance).
 */
function assertNoWallClockResidueInFamily(
  familyValues: ReadonlyArray<string | undefined>,
  context: string,
): void {
  for (const value of familyValues) {
    if (value && WALL_CLOCK_ID_PATTERN.test(value)) {
      throw new PackIdResidueError(context, '(remapped-family field)', value);
    }
  }
}
