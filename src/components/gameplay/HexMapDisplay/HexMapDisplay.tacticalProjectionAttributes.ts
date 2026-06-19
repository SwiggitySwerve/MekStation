import type {
  ITacticalMapHexProjection,
  ITacticalMapProjectionSourceReference,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

type ProjectionSourceChannel = ITacticalMapProjectionSourceReference['channel'];

export interface TacticalProjectionSourceMetadata {
  readonly channel?: string;
  readonly sourceRefs?: string;
  readonly ruleRefs?: string;
}

export type TacticalProjectionDataAttributes = Record<
  string,
  string | number | undefined
>;

const SHARED_TACTICAL_MAP_PROJECTION_SOURCE = 'shared-tactical-map-projection';

export function tacticalProjectionSourceReferencesFor(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
  channels: ProjectionSourceChannel | readonly ProjectionSourceChannel[],
): readonly ITacticalMapProjectionSourceReference[] {
  const channelSet = new Set(Array.isArray(channels) ? channels : [channels]);
  return (
    sourceReferences?.filter((source) => channelSet.has(source.channel)) ?? []
  );
}

export function sourceReferencesForProjection(
  projection: ITacticalMapHexProjection | undefined,
  channels: ProjectionSourceChannel | readonly ProjectionSourceChannel[],
): readonly ITacticalMapProjectionSourceReference[] {
  return tacticalProjectionSourceReferencesFor(
    projection?.sourceReferences,
    channels,
  );
}

export function tacticalProjectionSourceMetadata(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
  channel: string,
): TacticalProjectionSourceMetadata {
  const references = sourceReferences ?? [];
  if (references.length === 0) return {};

  return {
    channel,
    sourceRefs:
      formatTacticalProjectionSourceReferences(references) || undefined,
    ruleRefs: formatTacticalProjectionRuleReferences(references) || undefined,
  };
}

export function movementProjectionSourceMetadata(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): TacticalProjectionSourceMetadata {
  return tacticalProjectionSourceMetadata(
    tacticalProjectionSourceReferencesFor(sourceReferences, 'movement'),
    'movement',
  );
}

export function combatProjectionSourceMetadata(
  sourceReferences:
    | readonly ITacticalMapProjectionSourceReference[]
    | undefined,
): TacticalProjectionSourceMetadata {
  return tacticalProjectionSourceMetadata(
    tacticalProjectionSourceReferencesFor(sourceReferences, 'combat'),
    'combat',
  );
}

export function tacticalProjectionDataAttributes(
  metadata: TacticalProjectionSourceMetadata,
  rulesSurface = metadata.channel,
): TacticalProjectionDataAttributes {
  return {
    'data-tactical-projection-source': metadata.channel
      ? SHARED_TACTICAL_MAP_PROJECTION_SOURCE
      : undefined,
    'data-tactical-projection-channel': metadata.channel,
    'data-tactical-rules-surface': metadata.channel ? rulesSurface : undefined,
  };
}
