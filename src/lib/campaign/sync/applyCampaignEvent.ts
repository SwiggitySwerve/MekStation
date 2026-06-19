/**
 * Shared Campaign State — the campaign event reducer (CO1).
 *
 * `applyCampaignEvent` is the single pure reducer that advances an
 * `ICampaignAuthoritativeState` by one committed `ICampaignEvent`. It is
 * the campaign-tier analogue of the combat `appendEvent` reducer, and —
 * exactly like that reducer — it is the ONE function used by all three
 * consumers, so they can never drift:
 *
 *   1. the `CampaignMatchHost`, to advance its authoritative state when
 *      it commits an event;
 *   2. `replayCampaignEvents`, to reconstruct state from a log;
 *   3. the guest `campaignMirrorStore`, to advance the read-only mirror
 *      from host-broadcast events.
 *
 * The reducer is pure: it never mutates its input and returns a fresh
 * immutable state. Replaying an event log from sequence 0 therefore
 * reconstructs the host's authoritative state exactly (spec scenario
 * "Replaying the log reconstructs campaign state").
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D2, D5)
 */

import type {
  CampaignEventType,
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

type CampaignEventReducer<T extends CampaignEventType> = (
  state: ICampaignAuthoritativeState,
  event: ICampaignEvent<T>,
) => ICampaignAuthoritativeState;

type CampaignEventReducerMap = {
  readonly [T in CampaignEventType]: CampaignEventReducer<T>;
};

function applyRosterUnitChanged(
  state: ICampaignAuthoritativeState,
  event: ICampaignEvent<'RosterUnitChanged'>,
): ICampaignAuthoritativeState {
  const { change, unit } = event.payload;
  if (change === 'removed') {
    const nextUnits = { ...state.rosterUnits };
    delete nextUnits[unit.unitId];
    return { ...state, rosterUnits: nextUnits };
  }

  return {
    ...state,
    rosterUnits: { ...state.rosterUnits, [unit.unitId]: unit },
  };
}

function applySalvageAllocated(
  state: ICampaignAuthoritativeState,
  event: ICampaignEvent<'SalvageAllocated'>,
): ICampaignAuthoritativeState {
  const { poolRemaining, recoveredUnit } = event.payload;
  const nextUnits = recoveredUnit
    ? { ...state.rosterUnits, [recoveredUnit.unitId]: recoveredUnit }
    : state.rosterUnits;
  return {
    ...state,
    salvagePool: poolRemaining,
    rosterUnits: nextUnits,
  };
}

const CAMPAIGN_EVENT_REDUCERS: CampaignEventReducerMap = {
  CampaignSnapshotPublished: (_state, event) => event.payload.state,
  CampaignDayAdvanced: (state, event) => ({
    ...state,
    day: event.payload.newDay,
  }),
  FundsChanged: (state, event) => ({
    ...state,
    balance: event.payload.balance,
  }),
  PilotHired: (state, event) => {
    const { pilot } = event.payload;
    return {
      ...state,
      pilots: { ...state.pilots, [pilot.pilotId]: pilot },
    };
  },
  ContractAccepted: (state, event) => {
    const { contract } = event.payload;
    return {
      ...state,
      contracts: { ...state.contracts, [contract.contractId]: contract },
    };
  },
  RosterUnitChanged: applyRosterUnitChanged,
  SalvageAllocated: applySalvageAllocated,
};

function reduceCampaignEvent<T extends CampaignEventType>(
  state: ICampaignAuthoritativeState,
  event: ICampaignEvent<T>,
): ICampaignAuthoritativeState {
  const reducer = CAMPAIGN_EVENT_REDUCERS[
    event.type
  ] as CampaignEventReducer<T>;
  return reducer(state, event);
}

/**
 * Apply one committed campaign event to a campaign state, returning a
 * fresh state. Pure — the input `state` is never mutated.
 *
 * A `CampaignSnapshotPublished` event REPLACES the state wholesale (it
 * is the baseline a joining guest starts from); every other event is an
 * incremental delta.
 */
export function applyCampaignEvent(
  state: ICampaignAuthoritativeState,
  event: ICampaignEvent,
): ICampaignAuthoritativeState {
  return reduceCampaignEvent(state, event);
  /*
  switch (event.type) {
    case 'CampaignSnapshotPublished': {
      // A snapshot is a whole-state baseline — adopt it verbatim. This
      // is how a joining or large-gap-resyncing guest seeds its mirror.
      return event.payload.state;
    }

    case 'CampaignDayAdvanced': {
      return { ...state, day: event.payload.newDay };
    }

    case 'FundsChanged': {
      // The event carries the resulting balance (design D3) — adopt it
      // directly rather than re-deriving from the delta, so a guest that
      // applies the event lands on exactly the host's figure.
      return { ...state, balance: event.payload.balance };
    }

    case 'PilotHired': {
      const { pilot } = event.payload;
      return {
        ...state,
        pilots: { ...state.pilots, [pilot.pilotId]: pilot },
      };
    }

    case 'ContractAccepted': {
      const { contract } = event.payload;
      return {
        ...state,
        contracts: { ...state.contracts, [contract.contractId]: contract },
      };
    }

    case 'RosterUnitChanged': {
      const { change, unit } = event.payload;
      if (change === 'removed') {
        const nextUnits = { ...state.rosterUnits };
        delete nextUnits[unit.unitId];
        return { ...state, rosterUnits: nextUnits };
      }
      // `added` and `repaired` both write the unit's post-change shape.
      return {
        ...state,
        rosterUnits: { ...state.rosterUnits, [unit.unitId]: unit },
      };
    }

    case 'SalvageAllocated': {
      const { poolRemaining, recoveredUnit } = event.payload;
      const nextUnits = recoveredUnit
        ? { ...state.rosterUnits, [recoveredUnit.unitId]: recoveredUnit }
        : state.rosterUnits;
      return {
        ...state,
        salvagePool: poolRemaining,
        rosterUnits: nextUnits,
      };
    }

    default: {
      // Exhaustiveness guard — a new `CampaignEventType` that lands
      // without a reducer arm trips this at compile time.
      const exhaustive: never = event;
      void exhaustive;
      return state;
    }
  }
  */
}

/**
 * Reconstruct campaign state by replaying an ordered event log from
 * sequence 0 into a fresh empty state. Per design D2 / spec scenario
 * "Replaying the log reconstructs campaign state".
 *
 * The events MUST be ordered ascending by `sequence` (the campaign
 * event log guarantees this on read). A `CampaignSnapshotPublished`
 * anywhere in the log resets the fold to that baseline — which is also
 * how a resync stream that opens with a fresh snapshot reconstructs
 * correctly.
 */
export function replayCampaignEvents(
  campaignId: string,
  events: readonly ICampaignEvent[],
): ICampaignAuthoritativeState {
  let state = createEmptyCampaignState(campaignId);
  for (const event of events) {
    state = applyCampaignEvent(state, event);
  }
  return state;
}
