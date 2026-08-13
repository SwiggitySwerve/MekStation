import {
  type ParsedRosterUnitSource,
  parseRosterUnitSource,
} from '@/types/campaign/RosterUnitSource';

export type CanonicalCombatCatalogSnapshot =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly unitRefs: ReadonlySet<string> }
  | { readonly status: 'unavailable'; readonly retryable: true };

export const UNAVAILABLE_CANONICAL_CATALOG: CanonicalCombatCatalogSnapshot = {
  status: 'unavailable',
  retryable: true,
};

export interface CanonicalAdmissionBlocker {
  readonly code: string;
  readonly message: string;
  readonly severity: 'blocker';
  readonly subjectId: string;
  readonly actionLabel?: string;
}

export type CanonicalAdmissionResult =
  | { readonly admitted: true }
  | { readonly admitted: false; readonly blocker: CanonicalAdmissionBlocker };

export function readyCanonicalCatalog(
  unitRefs: readonly string[],
): CanonicalCombatCatalogSnapshot {
  return { status: 'ready', unitRefs: new Set(unitRefs) };
}

export function snapshotFromUnitsApiPayload(
  payload: unknown,
): CanonicalCombatCatalogSnapshot {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return UNAVAILABLE_CANONICAL_CATALOG;
  }
  const record = payload as { success?: unknown; data?: unknown };
  return record.success === true && Array.isArray(record.data)
    ? snapshotFromIndexEntries(record.data)
    : UNAVAILABLE_CANONICAL_CATALOG;
}

export function snapshotFromNodeCatalogIndex(
  loadIndex: () => readonly { readonly id: unknown }[],
): CanonicalCombatCatalogSnapshot {
  try {
    return snapshotFromIndexEntries(loadIndex());
  } catch {
    return UNAVAILABLE_CANONICAL_CATALOG;
  }
}

export function admitCanonicalExactReference(input: {
  readonly parsed: ParsedRosterUnitSource;
  readonly unitRef: string | undefined;
  readonly catalog?: CanonicalCombatCatalogSnapshot;
  readonly unitId: string;
  readonly unitName: string;
}): CanonicalAdmissionResult {
  const { parsed, unitRef, catalog, unitId, unitName } = input;
  // oxfmt-ignore
  if (parsed.kind === 'invalid') return deny(unitId, 'roster_source_invalid', `${unitName} has an invalid roster source and cannot launch.`);
  // oxfmt-ignore
  if (parsed.source === 'custom') return deny(unitId, 'roster_source_custom', `${unitName} is a saved custom design and cannot launch yet.`);
  if (catalog !== undefined) {
    switch (catalog.status) {
      case 'loading':
        // oxfmt-ignore
        return deny(unitId, 'catalog_loading', 'Canonical catalog is still loading; retry launch when it is ready.', 'Retry catalog');
      case 'unavailable':
        // oxfmt-ignore
        return deny(unitId, 'catalog_unavailable', 'Canonical catalog is unavailable; retry launch after it reloads.', 'Retry catalog');
      case 'ready':
        break;
      default: {
        const exhaustive: never = catalog;
        return exhaustive;
      }
    }
  }
  // oxfmt-ignore
  if (!unitRef) return deny(unitId, 'unit_ref_unresolved', `${unitName} has no canonical record; recreate the campaign or edit the unit in Mech Bay before launch.`);
  if (catalog?.status === 'ready' && !catalog.unitRefs.has(unitRef)) {
    // oxfmt-ignore
    return deny(unitId, 'canonical_ref_missing', `${unitName} does not match an exact canonical catalog reference.`);
  }
  return { admitted: true };
}

export function admitRosterUnitSource(input: {
  readonly unitSource: unknown;
  readonly unitRef: string | undefined;
  readonly catalog?: CanonicalCombatCatalogSnapshot;
  readonly unitId: string;
  readonly unitName: string;
}): CanonicalAdmissionResult {
  return admitCanonicalExactReference({
    parsed: parseRosterUnitSource(input.unitSource),
    unitRef: input.unitRef,
    catalog: input.catalog,
    unitId: input.unitId,
    unitName: input.unitName,
  });
}

export interface CampaignLaunchSnapshot {
  readonly campaignId: string;
  readonly matchId?: string;
  readonly revision?: number;
  readonly catalog: CanonicalCombatCatalogSnapshot;
}

export interface CampaignLaunchSelectionUnit {
  readonly unitId: string;
  readonly unitName: string;
  readonly unitRef?: string;
  readonly unitSource?: unknown;
}

export interface CampaignLaunchExpectedIdentity {
  readonly campaignId: string;
  readonly matchId?: string;
  readonly revision?: number;
}

export async function fetchCanonicalCatalogSnapshot(
  fetchImpl: typeof fetch = fetch,
): Promise<CanonicalCombatCatalogSnapshot> {
  try {
    const response = await fetchImpl('/api/units');
    return response.ok
      ? snapshotFromUnitsApiPayload(await response.json())
      : UNAVAILABLE_CANONICAL_CATALOG;
  } catch {
    return UNAVAILABLE_CANONICAL_CATALOG;
  }
}

export function admitCampaignLaunch(input: {
  readonly snapshot: CampaignLaunchSnapshot | undefined;
  readonly expected: CampaignLaunchExpectedIdentity;
  readonly selectedUnits: readonly CampaignLaunchSelectionUnit[];
}): CanonicalAdmissionResult {
  const { snapshot, expected, selectedUnits } = input;
  if (!snapshot) {
    // oxfmt-ignore
    return deny(expected.campaignId, 'catalog_unavailable', 'Canonical catalog is unavailable; retry launch after it reloads.', 'Retry catalog');
  }
  if (
    snapshot.campaignId !== expected.campaignId ||
    (expected.matchId !== undefined && snapshot.matchId !== expected.matchId)
  ) {
    // oxfmt-ignore
    return deny(expected.campaignId, 'snapshot_foreign', 'Campaign catalog snapshot does not match this campaign.');
  }
  if (
    expected.revision !== undefined &&
    snapshot.revision !== expected.revision
  ) {
    // oxfmt-ignore
    return deny(expected.campaignId, 'snapshot_stale', 'Campaign catalog snapshot revision is stale or mismatched.');
  }
  for (const unit of selectedUnits) {
    const admission = admitRosterUnitSource({
      ...unit,
      catalog: snapshot.catalog,
    });
    if (!admission.admitted) return admission;
  }
  return { admitted: true };
}

function snapshotFromIndexEntries(
  entries: readonly unknown[],
): CanonicalCombatCatalogSnapshot {
  const unitRefs = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return UNAVAILABLE_CANONICAL_CATALOG;
    }
    const id = (entry as { id?: unknown }).id;
    if (typeof id !== 'string' || id.length === 0) {
      return UNAVAILABLE_CANONICAL_CATALOG;
    }
    unitRefs.add(id);
  }
  return unitRefs.size === 0
    ? UNAVAILABLE_CANONICAL_CATALOG
    : { status: 'ready', unitRefs };
}

function deny(
  subjectId: string,
  code: string,
  message: string,
  actionLabel?: string,
): CanonicalAdmissionResult {
  return {
    admitted: false,
    blocker: {
      code,
      message,
      severity: 'blocker',
      subjectId,
      ...(actionLabel ? { actionLabel } : {}),
    },
  };
}
