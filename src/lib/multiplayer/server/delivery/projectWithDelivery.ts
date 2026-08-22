/**
 * Visible-projection plus durable sequence assignment (authority-audit
 * PR 7).
 *
 * Calls ViewerProjectionService.projectWithIdentities so hidden and
 * failed facts never reach assignSequences, then persists gapless
 * sequences for the VISIBLE identities only. The viewer-safe fact
 * objects stay byte-identical to PR 6; identity and sequence live on
 * a server-internal wrapper.
 *
 * Projector version is taken from the projection result (registry),
 * never from a client-supplied field, so a caller cannot target a
 * foreign projector epoch through this function.
 *
 * PR 8 owns live socket and route adoption. This module does not
 * import the private-record storage class or journal row types.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import type {
  IViewerProjectionRequest,
  IViewerSafeFact,
  IViewerSafeProjection,
} from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

import { isAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import {
  DELIVERY_EPOCH_MESSAGES,
  DeliveryEpochError,
  type IDeliveryEpochStore,
} from './IDeliveryEpochStore';

/**
 * One visible fact paired with its durable identity and sequence.
 * `fact` is the PR 6 viewer-safe object; identity and sequence stay
 * off that object so serialization of `fact` cannot grow journal
 * fields.
 */
export interface IDeliveredViewerFact {
  readonly fact: IViewerSafeFact;
  readonly projectedEventIdentity: string;
  readonly deliverySequence: number;
  readonly reused: boolean;
}

export interface IProjectWithDeliveryResult {
  readonly projection: IViewerSafeProjection;
  readonly deliveryEpochId: string;
  readonly effectiveGeneration: number;
  readonly facts: readonly IDeliveredViewerFact[];
}

/**
 * Projects a stream for one branded viewer and assigns durable
 * sequences for every visible fact in that viewer's current epoch.
 * Projection failure throws before any sequence write.
 */
export async function projectWithDelivery(
  service: ViewerProjectionService,
  store: IDeliveryEpochStore,
  viewer: IAuthorizedViewer,
  request: IViewerProjectionRequest,
): Promise<IProjectWithDeliveryResult> {
  if (!isAuthorizedViewer(viewer)) {
    throw new DeliveryEpochError(
      'not-a-viewer',
      DELIVERY_EPOCH_MESSAGES.notAViewer,
    );
  }
  const identified = await service.projectWithIdentities(viewer, request);
  const baseline = store.resolveEpoch(viewer, {
    streamType: request.streamType,
    streamId: request.streamId,
    projectorVersion: identified.projection.projectorVersion,
  });
  const identities = identified.identifiedFacts.map(
    (entry) => entry.projectedEventIdentity,
  );
  const assigned = store.assignSequences(baseline.deliveryEpochId, identities);
  const facts: IDeliveredViewerFact[] = [];
  for (let index = 0; index < identified.identifiedFacts.length; index += 1) {
    const entry = identified.identifiedFacts[index];
    const mapping = assigned[index];
    if (entry === undefined || mapping === undefined) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    facts.push(
      Object.freeze({
        fact: entry.fact,
        projectedEventIdentity: mapping.projectedEventIdentity,
        deliverySequence: mapping.deliverySequence,
        reused: mapping.reused,
      }),
    );
  }
  return Object.freeze({
    projection: identified.projection,
    deliveryEpochId: baseline.deliveryEpochId,
    effectiveGeneration: baseline.effectiveGeneration,
    facts: Object.freeze(facts),
  });
}
