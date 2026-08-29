/**
 * Per-match journal-authority admission (task 4.2; design D4).
 *
 * Journal authority is chosen per match at creation, not by the process
 * flag alone. Mode 'off'/'shadow' stay inert (no baseline). An imported
 * or pre-existing stream never enters this path.
 */

import { logger } from "@/utils/logger";

import { AuthorizedViewerResolver } from "./authorization/AuthorizedViewer";
import { authorizeHumanAction } from "./authorization/HumanActionAuthorizationGate";
import {
  MATCH_BASELINE_BRANCH_ID,
  MATCH_BASELINE_FIRST_GENERATION,
  digestRetainedMatchHistory,
} from "./matchAuthorityBaseline";
import {
  getCombatJournalAuthorityMode,
  getProcessShadowMismatchCount,
  type CombatJournalAuthorityMode,
  type IMatchJournalAuthorityBaseline,
} from "./matchJournalAuthority";
import { ViewerDeliveryCursors } from "./projection/ViewerDeliveryCursors";
import {
  MATCH_WIRE_PUBLICATION_BOUNDARY,
  ViewerPublicationBoundary,
} from "./projection/ViewerPublicationBoundary";

export type JournalAuthorityAdmissionRefusalReason =
  "imported-legacy" | "shadow-mismatch" | "missing-privacy-gates";

export interface IJournalAuthorityAdmissionRefusal {
  readonly matchId: string;
  readonly reason: JournalAuthorityAdmissionRefusalReason;
}

/**
 * Structural wiring of the five umbrella privacy gates, grouped as the
 * host collaborators that carry them: authorization (active membership
 * + server-derived viewer + human-action audit), pre-serialization
 * projection, and private-record delivery. Admission does not re-run
 * the gates; it asserts they are present.
 */
export interface IJournalAuthorityPrivacyGateWiring {
  readonly authorizedViewerResolver: AuthorizedViewerResolver | null;
  readonly authorizeHumanAction: typeof authorizeHumanAction | null;
  readonly viewerPublicationBoundary: ViewerPublicationBoundary | null;
  readonly viewerDeliveryCursors: ViewerDeliveryCursors | null;
}

export interface IJournalAuthorityBaselineStore {
  getJournalAuthorityBaseline(
    matchId: string,
  ): IMatchJournalAuthorityBaseline | null;
  insertJournalAuthorityBaseline(
    baseline: IMatchJournalAuthorityBaseline,
  ): void;
}

export interface IAdmitJournalAuthorityInput {
  readonly matchId: string;
  readonly mode: CombatJournalAuthorityMode;
  readonly requested: boolean;
  readonly imported: boolean;
  readonly processMismatchCount: number;
  readonly gates: IJournalAuthorityPrivacyGateWiring;
  readonly existingBaseline: IMatchJournalAuthorityBaseline | null;
}

export type JournalAuthorityAdmissionDecision =
  | {
      readonly kind: "admitted";
      readonly baseline: IMatchJournalAuthorityBaseline;
      readonly reuse: boolean;
    }
  | {
      readonly kind: "refused";
      readonly reason: JournalAuthorityAdmissionRefusalReason;
    }
  | { readonly kind: "inert" };

const admissionRefusals = new Map<string, IJournalAuthorityAdmissionRefusal>();

export function getJournalAuthorityAdmissionRefusal(
  matchId: string,
): IJournalAuthorityAdmissionRefusal | null {
  return admissionRefusals.get(matchId) ?? null;
}

export function _resetJournalAuthorityAdmissionForTests(): void {
  admissionRefusals.clear();
}

export function productionJournalAuthorityPrivacyGates(
  resolver: AuthorizedViewerResolver,
  deliveryCursors: ViewerDeliveryCursors,
): IJournalAuthorityPrivacyGateWiring {
  return {
    authorizedViewerResolver: resolver,
    authorizeHumanAction,
    viewerPublicationBoundary: MATCH_WIRE_PUBLICATION_BOUNDARY,
    viewerDeliveryCursors: deliveryCursors,
  };
}

export function privacyGatesArePresent(
  gates: IJournalAuthorityPrivacyGateWiring,
): boolean {
  return (
    gates.authorizedViewerResolver instanceof AuthorizedViewerResolver &&
    gates.authorizeHumanAction === authorizeHumanAction &&
    gates.viewerPublicationBoundary instanceof ViewerPublicationBoundary &&
    gates.viewerDeliveryCursors instanceof ViewerDeliveryCursors
  );
}

/**
 * Zero comparisons is not a blocker: equality evidence is the mode
 * flip. Any recorded mismatch in this process un-flips admission.
 */
export function shadowMismatchBlocksAdmission(count: number): boolean {
  return count > 0;
}

/** Identity digest of the empty/genesis stream (no retained events). */
export function genesisJournalAuthorityBaseline(
  streamId: string,
): IMatchJournalAuthorityBaseline {
  return {
    streamType: "match",
    streamId,
    branchId: MATCH_BASELINE_BRANCH_ID,
    revision: 0,
    digest: digestRetainedMatchHistory([]),
    effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
  };
}

export function isJournalAuthorityBaselineStore(
  store: object,
): store is IJournalAuthorityBaselineStore {
  const candidate = store as Partial<IJournalAuthorityBaselineStore>;
  return (
    typeof candidate.getJournalAuthorityBaseline === "function" &&
    typeof candidate.insertJournalAuthorityBaseline === "function"
  );
}

export function matchStreamIsImportedLegacy(
  store: object,
  matchId: string,
): boolean {
  const candidate = store as {
    hasImportedLegacyStream?(id: string): boolean;
    getLegacyImportMarker?(id: string): unknown | null;
    getImportedEventSources?(id: string): readonly unknown[];
  };
  if (typeof candidate.hasImportedLegacyStream === "function") {
    return candidate.hasImportedLegacyStream(matchId);
  }
  if (typeof candidate.getLegacyImportMarker === "function") {
    if (candidate.getLegacyImportMarker(matchId) != null) return true;
  }
  if (typeof candidate.getImportedEventSources === "function") {
    return candidate.getImportedEventSources(matchId).length > 0;
  }
  return false;
}

export function admitJournalAuthority(
  input: IAdmitJournalAuthorityInput,
): JournalAuthorityAdmissionDecision {
  if (input.imported) {
    return { kind: "refused", reason: "imported-legacy" };
  }
  if (input.mode !== "enabled" || !input.requested) {
    return { kind: "inert" };
  }
  if (shadowMismatchBlocksAdmission(input.processMismatchCount)) {
    return { kind: "refused", reason: "shadow-mismatch" };
  }
  if (!privacyGatesArePresent(input.gates)) {
    return { kind: "refused", reason: "missing-privacy-gates" };
  }
  if (input.existingBaseline != null) {
    return {
      kind: "admitted",
      baseline: input.existingBaseline,
      reuse: true,
    };
  }
  return {
    kind: "admitted",
    baseline: genesisJournalAuthorityBaseline(input.matchId),
    reuse: false,
  };
}

export function resolveJournalAuthorityForNewMatch(input: {
  readonly matchId: string;
  readonly store: object;
  readonly requested: boolean;
  readonly gates: IJournalAuthorityPrivacyGateWiring;
  /** The retained pre-command stream head created by host bootstrap. */
  readonly baseline?: IMatchJournalAuthorityBaseline;
}): {
  readonly enabled: boolean;
  readonly refusal: IJournalAuthorityAdmissionRefusal | null;
} {
  const existing = isJournalAuthorityBaselineStore(input.store)
    ? input.store.getJournalAuthorityBaseline(input.matchId)
    : null;
  const decision = admitJournalAuthority({
    matchId: input.matchId,
    mode: getCombatJournalAuthorityMode(),
    requested: input.requested,
    imported: matchStreamIsImportedLegacy(input.store, input.matchId),
    processMismatchCount: getProcessShadowMismatchCount(),
    gates: input.gates,
    existingBaseline: existing,
  });
  if (decision.kind === "admitted") {
    if (!isJournalAuthorityBaselineStore(input.store)) {
      return { enabled: false, refusal: null };
    }
    if (!decision.reuse) {
      input.store.insertJournalAuthorityBaseline(
        input.baseline ?? decision.baseline,
      );
    }
    return { enabled: true, refusal: null };
  }
  if (decision.kind === "refused") {
    const refusal: IJournalAuthorityAdmissionRefusal = {
      matchId: input.matchId,
      reason: decision.reason,
    };
    admissionRefusals.set(input.matchId, refusal);
    logger.warn(
      `[match-journal-admission] refused matchId=${input.matchId} reason=${decision.reason}`,
    );
    return { enabled: false, refusal };
  }
  return { enabled: input.requested, refusal: null };
}
