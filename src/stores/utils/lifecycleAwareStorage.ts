/**
 * Local-storage seam for the contract-rules reader floor (S1b).
 *
 * Browser storage outlives the code that wrote it: an older tab, or a cached
 * older bundle, shares it and reads whatever sits under the keys it knows
 * (`campaign-store`, `missions-<id>`, `campaign-<id>`). Older code hydrates a
 * contract it does not understand intact, then terminalizes and pays it with
 * the legacy formula. So a campaign holding a contract above this build's
 * reader level is NEVER written under those keys. The full value goes to
 * `<key>.lifecycle`, and the old key holds a tombstone that older code reads as
 * an empty store.
 *
 * Stamps: the slot and its tombstone share one `stamp`. A tombstone carries it
 * as top-level `lifecycleSlot`; a plain write made while a slot exists carries
 * it as `lifecycleSlotReleased` (the slot is then a kept, ignored orphan).
 * Older code reads only `state` and `version`, so neither marker reaches it.
 *
 * Reading, in order: no slot, or a damaged one, reads the old key as it stands;
 * a tombstone reads the slot; a release marker reads the old key; any other
 * content of the same campaign is a write by an outdated tab that the server
 * never accepted, so the slot wins and the user is told. A slot is never
 * deleted here: orphans are kept and ignored.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { StateStorage } from 'zustand/middleware';

import { scanLifecycleRequirement } from '@/lib/campaign/persistence/lifecycleReaderGate';
import { LIFECYCLE_RULES_READER_MAX } from '@/types/campaign/ContractLifecycleRules';

import { clientSafeStorage } from './clientSafeStorage';

export const LIFECYCLE_SLOT_SUFFIX = '.lifecycle';

interface ISlot {
  readonly stamp: number;
  readonly campaignId: string | null;
  readonly campaignName: string | null;
  /** The exact string the store tried to write under the old key. */
  readonly value: string;
}

type Envelope = Record<string, unknown> & {
  state?: Record<string, unknown> | null;
  version?: number;
  lifecycleSlot?: unknown;
  lifecycleSlotReleased?: unknown;
};

export interface IOutdatedTabNotice {
  readonly campaignId: string;
  readonly campaignName: string | null;
}

// ---------------------------------------------------------------------------
// The notice the user sees when an outdated tab's changes were not kept.
// ---------------------------------------------------------------------------

let notices: readonly IOutdatedTabNotice[] = [];
const noticeListeners = new Set<() => void>();

function publishNotices(next: readonly IOutdatedTabNotice[]): void {
  notices = next;
  noticeListeners.forEach((listener) => listener());
}

export function getOutdatedTabNotices(): readonly IOutdatedTabNotice[] {
  return notices;
}

export function subscribeOutdatedTabNotices(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

export function dismissOutdatedTabNotice(campaignId: string): void {
  publishNotices(notices.filter((entry) => entry.campaignId !== campaignId));
}

export function resetOutdatedTabNotices(): void {
  publishNotices([]);
}

function noteOutdatedTab(campaignId: string, name: string | null): void {
  const existing = notices.find((entry) => entry.campaignId === campaignId);
  if (existing) {
    if (existing.campaignName === null && name !== null) {
      publishNotices(
        notices.map((entry) =>
          entry === existing ? { campaignId, campaignName: name } : entry,
        ),
      );
    }
    return;
  }
  publishNotices([...notices, { campaignId, campaignName: name }]);
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseEnvelope(raw: string | null): Envelope | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Envelope)
      : null;
  } catch {
    return null;
  }
}

function parseSlot(raw: string | null): ISlot | null {
  const slot = parseEnvelope(raw) as Partial<ISlot> | null;
  if (
    slot === null ||
    typeof slot.stamp !== 'number' ||
    typeof slot.value !== 'string'
  ) {
    return null;
  }
  return {
    stamp: slot.stamp,
    campaignId: typeof slot.campaignId === 'string' ? slot.campaignId : null,
    campaignName:
      typeof slot.campaignName === 'string' ? slot.campaignName : null,
    value: slot.value,
  };
}

/** The persisted body whose `missions` / `contractMarket` the scan reads. */
function bodyOf(envelope: Envelope): unknown {
  const state = envelope.state;
  if (typeof state !== 'object' || state === null) return null;
  const campaign = (state as { campaign?: unknown }).campaign;
  return campaign !== undefined ? campaign : state;
}

/** The campaign a stored value belongs to: from its content, else from its key. */
function campaignIdentity(
  name: string,
  envelope: Envelope,
): { id: string | null; name: string | null } {
  const body = bodyOf(envelope) as {
    id?: unknown;
    name?: unknown;
  } | null;
  if (name === 'campaign-store') {
    return {
      id: typeof body?.id === 'string' ? body.id : null,
      name: typeof body?.name === 'string' ? body.name : null,
    };
  }
  const prefix = name.startsWith('missions-') ? 'missions-' : 'campaign-';
  return {
    id: name.slice(prefix.length),
    name: typeof body?.name === 'string' ? body.name : null,
  };
}

function tombstoneState(name: string, envelope: Envelope): unknown {
  if (name === 'campaign-store') {
    const log = envelope.state?.activityLog;
    return {
      campaign: null,
      activityLog: Array.isArray(log) ? log : [],
      cachedCampaignKey: null,
    };
  }
  if (name.startsWith('missions-')) return { missions: [], scenarios: [] };
  return null;
}

/** Whether this key is one of the three older code reads. */
function isProtectedKey(name: string): boolean {
  return (
    name === 'campaign-store' ||
    name.startsWith('missions-') ||
    name.startsWith('campaign-')
  );
}

function needsSlot(envelope: Envelope): boolean {
  const scan = scanLifecycleRequirement(bodyOf(envelope));
  return scan.unreadable || scan.required > LIFECYCLE_RULES_READER_MAX;
}

/** Whether a value read from an old key has content an older tab could have added. */
function hasContent(name: string, envelope: Envelope): boolean {
  const state = envelope.state;
  if (typeof state !== 'object' || state === null) return false;
  if (name === 'campaign-store') return bodyOf(envelope) !== null;
  if (name.startsWith('missions-')) {
    const { missions, scenarios } = state as {
      missions?: unknown;
      scenarios?: unknown;
    };
    return (
      (Array.isArray(missions) && missions.length > 0) ||
      (Array.isArray(scenarios) && scenarios.length > 0)
    );
  }
  return true;
}

function slotKeyOf(name: string): string {
  return `${name}${LIFECYCLE_SLOT_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// The storage
// ---------------------------------------------------------------------------

export function createLifecycleAwareStorage(
  inner: StateStorage,
  now: () => number = Date.now,
): StateStorage {
  return {
    getItem: (name) => {
      const raw = inner.getItem(name) as string | null;
      if (!isProtectedKey(name)) return raw;
      const slot = parseSlot(inner.getItem(slotKeyOf(name)) as string | null);
      if (slot === null) return raw;
      const envelope = parseEnvelope(raw);
      if (envelope === null) return raw;
      if (typeof envelope.lifecycleSlot === 'number') return slot.value;
      if (envelope.lifecycleSlotReleased === slot.stamp) return raw;

      const identity = campaignIdentity(name, envelope);
      if (name === 'campaign-store') {
        if (identity.id === null || identity.id !== slot.campaignId) {
          return raw;
        }
      }
      if (hasContent(name, envelope)) {
        noteOutdatedTab(
          identity.id ?? slot.campaignId ?? name,
          // The slot's name: the clobbering tab may have renamed the campaign.
          slot.campaignName ?? identity.name,
        );
      }
      return slot.value;
    },

    setItem: (name, value) => {
      if (!isProtectedKey(name)) return inner.setItem(name, value);
      const slotRaw = inner.getItem(slotKeyOf(name)) as string | null;
      // Fast path: nothing above the reader level can be in a value that never
      // names a rules version, and no slot means there is nothing to release.
      if (slotRaw === null && !value.includes('"lifecycleRulesVersion"')) {
        return inner.setItem(name, value);
      }
      const envelope = parseEnvelope(value);
      if (envelope === null) return inner.setItem(name, value);

      if (needsSlot(envelope)) {
        const identity = campaignIdentity(name, envelope);
        const stamp = now();
        const slot: ISlot = {
          stamp,
          campaignId: identity.id,
          campaignName: identity.name,
          value,
        };
        // Slot first: a failure after it leaves the data and an old key that
        // still reads as it did, never a tombstone with nothing behind it.
        inner.setItem(slotKeyOf(name), JSON.stringify(slot));
        inner.setItem(
          name,
          JSON.stringify({
            state: tombstoneState(name, envelope),
            ...(envelope.version === undefined
              ? {}
              : { version: envelope.version }),
            lifecycleSlot: stamp,
          }),
        );
        return undefined;
      }

      const slot = parseSlot(slotRaw);
      if (slot === null) return inner.setItem(name, value);
      return inner.setItem(
        name,
        JSON.stringify({ ...envelope, lifecycleSlotReleased: slot.stamp }),
      );
    },

    // Only the old key. A slot is kept and ignored, never deleted here.
    removeItem: (name) => inner.removeItem(name),
  };
}

/** The storage every campaign store and the campaign record writer use. */
export const lifecycleAwareStorage: StateStorage =
  createLifecycleAwareStorage(clientSafeStorage);
