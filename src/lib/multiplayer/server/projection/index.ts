/**
 * Public surface for the viewer projection seam (authority-audit PR 6).
 *
 * PR 8 owns live/replay/history adoption. This barrel exports the
 * service, registry, and viewer-safe types only. It does not export
 * raw journal row types or anything from private-record storage.
 */

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
