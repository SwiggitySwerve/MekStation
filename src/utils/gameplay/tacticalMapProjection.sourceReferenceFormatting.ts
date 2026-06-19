import type {
  ITacticalMapProjectionSourceReference,
  TacticalMapProjectionSourceChannel,
} from './tacticalMapProjection.types';

export function formatTacticalProjectionSourceReferences(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .map(formatTacticalProjectionSourceReference)
    .join('|');
}

export function formatTacticalProjectionSourceLabels(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .map(
      (reference) =>
        `${formatSourceChannelLabel(reference.channel)}: ${reference.label}`,
    )
    .join('; ');
}

export function formatTacticalProjectionRuleReferences(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .flatMap((reference) =>
      (reference.ruleReferences ?? []).map(
        (ruleReference) =>
          `${reference.channel}:${reference.kind}:${ruleReference}`,
      ),
    )
    .join('|');
}

export function formatTacticalProjectionRuleReferenceLabels(
  sourceReferences: readonly ITacticalMapProjectionSourceReference[],
): string {
  return sourceReferences
    .flatMap((reference) =>
      (reference.ruleReferences ?? []).map(
        (ruleReference) =>
          `${formatSourceChannelLabel(reference.channel)}: ${ruleReference}`,
      ),
    )
    .join('; ');
}

export function formatTacticalProjectionSourceReference(
  reference: ITacticalMapProjectionSourceReference,
): string {
  const detail = reference.detail ? `:${reference.detail}` : '';
  return `${reference.channel}:${reference.kind}:${reference.label}${detail}`;
}

function formatSourceChannelLabel(
  channel: TacticalMapProjectionSourceChannel,
): string {
  switch (channel) {
    case 'terrain-elevation':
      return 'terrain/elevation';
    case 'movement':
      return 'movement';
    case 'combat':
      return 'combat';
    case 'los-blocker':
      return 'LOS blocker';
    case 'legacy-attack-range':
      return 'legacy attack range';
  }
}
