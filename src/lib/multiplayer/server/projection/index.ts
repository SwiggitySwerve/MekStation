/**
 * Public surface for the viewer projection seam (authority-audit PR 6
 * and PR 8 publication adoption).
 *
 * Exports the service, registry, match-wire catalog, publication
 * boundary, and viewer-safe types only. It does not export raw journal
 * row types or anything from private-record storage.
 */

export {
  MATCH_WIRE_PROJECTOR_VERSION,
  MATCH_WIRE_PUBLIC_IDENTITY,
  MATCH_WIRE_STREAM_TYPE,
  MATCH_WIRE_V2_DECISIONS,
  createMatchWireAudienceProjector,
  listedMatchWireEventTypes,
  matchWireAudienceDefinition,
  projectMatchWirePayloadUnchanged,
} from './MatchWireAudienceCatalog';
export {
  createMatchWireSealedChoiceAudienceContext,
  isMatchWireSealedDeclaration,
  MATCH_WIRE_SEALED_DECLARATION_TYPES,
  sealedDeclarationsRevealedBy,
} from './MatchWireSealedChoices';
export {
  AUTHORITY_ONLY_EVENT_FIELDS,
  projectEventForViewer,
  projectReplayEndForViewer,
  projectReplayStartForViewer,
} from './ViewerFrameProjector';
export type {
  IViewerEventProjected,
  IViewerEventProjectionFailure,
  ViewerEventProjection,
} from './ViewerFrameProjector';
export {
  MATCH_WIRE_PUBLICATION_BOUNDARY,
  ViewerPublicationBoundary,
} from './ViewerPublicationBoundary';
export type {
  IPublicationFailure,
  IPublicationOmit,
  IPublicationSend,
  PublicationGuardResult,
  ReplayFramesGuardResult,
} from './ViewerPublicationBoundary';
export {
  isOwnerAudienceMatch,
  ViewerAudienceProjector,
  ViewerAudienceProjectorRegistry,
} from './ViewerAudienceProjector';
export type {
  IGmOnlyAudienceDecision,
  IHiddenAudienceDecision,
  IOwnerOnlyAudienceDecision,
  IPublicAudienceDecision,
  IViewerAudienceEventDecision,
  IViewerAudienceProjectorDefinition,
  IViewerAudienceRuntimeContext,
  ISealedChoiceAudienceDecision,
  ViewerAudienceDecision,
} from './ViewerAudienceProjector';
export { ViewerProjectionService } from './ViewerProjectionService';
export type { IViewerProjectionServiceDeps } from './ViewerProjectionService';
export {
  isViewerProjectionError,
  VIEWER_PROJECTION_MESSAGES,
  VIEWER_SAFE_FACT_KEYS,
  VIEWER_SAFE_PROJECTION_KEYS,
  ViewerProjectionError,
} from './ViewerProjectionTypes';
export type {
  IViewerProjectionRequest,
  IViewerProjectionScope,
  IViewerSafeFact,
  IViewerSafeProjection,
  JsonPrimitive,
  JsonValue,
  ViewerProjectionErrorCode,
} from './ViewerProjectionTypes';
