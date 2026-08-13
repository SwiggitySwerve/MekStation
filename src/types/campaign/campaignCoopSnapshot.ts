import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

export interface ICampaignCoopSnapshot {
  readonly campaignId: string;
  readonly matchId: string;
  readonly revision: number;
  readonly state: ICampaignAuthoritativeState;
}

export type CampaignCoopSnapshotResult =
  | { readonly ok: true; readonly snapshot: ICampaignCoopSnapshot }
  | { readonly ok: false; readonly reason: string };

export function parseCampaignCoopSnapshot(input: {
  readonly campaignId: unknown;
  readonly matchId: unknown;
  readonly revision: unknown;
  readonly state: unknown;
}): CampaignCoopSnapshotResult {
  if (typeof input.campaignId !== 'string' || input.campaignId.length === 0) {
    return { ok: false, reason: 'campaign id missing' };
  }
  if (typeof input.matchId !== 'string' || input.matchId.length === 0) {
    return { ok: false, reason: 'match id missing' };
  }
  if (
    typeof input.revision !== 'number' ||
    !Number.isInteger(input.revision) ||
    input.revision < 0
  ) {
    return { ok: false, reason: 'revision stale or malformed' };
  }
  const state = input.state as ICampaignAuthoritativeState | null;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { ok: false, reason: 'state missing' };
  }
  if (state.campaignId !== input.campaignId) {
    return { ok: false, reason: 'foreign campaign' };
  }
  const rosterUnits = state.rosterUnits ?? {};
  for (const [unitId, unit] of Object.entries(rosterUnits)) {
    if (!unit || unit.unitId !== unitId) {
      return { ok: false, reason: 'roster identity mismatch' };
    }
    const parsed = parseRosterUnitSource(unit.unitSource);
    if (parsed.kind === 'invalid') {
      return { ok: false, reason: 'unknown source' };
    }
    if (!unit.unitRef) {
      return { ok: false, reason: 'unit reference missing' };
    }
  }
  const seen = new Set<string>();
  for (const [forceId, unitIds] of Object.entries(state.forceUnits ?? {})) {
    if (!forceId || !Array.isArray(unitIds)) {
      return { ok: false, reason: 'membership malformed' };
    }
    for (const unitId of unitIds) {
      if (!rosterUnits[unitId]) {
        return { ok: false, reason: 'membership references absent unit' };
      }
      if (seen.has(unitId)) {
        return { ok: false, reason: 'duplicate unit membership' };
      }
      seen.add(unitId);
    }
  }
  return {
    ok: true,
    snapshot: {
      campaignId: input.campaignId,
      matchId: input.matchId,
      revision: input.revision,
      state,
    },
  };
}
