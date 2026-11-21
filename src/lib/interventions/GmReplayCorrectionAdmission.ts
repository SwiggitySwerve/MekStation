import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';

import { gmReplayCorrectionEffectSchema } from './GmReplayCorrectionSchema';
import { GM_CORRECTION_UNREPRESENTED_LEAVES, GM_UNIT_RELOAD_UNSUPPORTED_REASON } from './GmCorrectionUnsupportedLeaves';
import { unsupportedGmCorrectionLeaf } from './GmCorrectionLeafPolicy';

export type GmCorrectionAdmission =
  | { readonly kind: 'admitted'; readonly effects: readonly GmReplayCorrectionEffect[] }
  | { readonly kind: 'refused'; readonly reason: 'gm-correction-no-ordinary-carrier' | 'gm-correction-unit-reload-unsupported' | 'gm-correction-invalid-effects'; readonly leaf?: string };

const unsupported: ReadonlySet<string> = new Set(GM_CORRECTION_UNREPRESENTED_LEAVES);

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : undefined;
}

/** Never accepts an arbitrary state or silently discards an unsupported leaf. */
export function admitGmReplayCorrection(input: unknown): GmCorrectionAdmission {
  if (!Array.isArray(input) || input.length === 0)
    return { kind: 'refused', reason: 'gm-correction-invalid-effects' };
  const effects: GmReplayCorrectionEffect[] = [];
  for (const raw of input) {
    const effect = record(raw);
    if (effect?.family === 'unit-reload')
      return { kind: 'refused', reason: GM_UNIT_RELOAD_UNSUPPORTED_REASON };
    const after = record(effect?.after);
    const clear = Array.isArray(effect?.clear) ? effect.clear : [];
    const leaf = [...Object.keys(after ?? {}), ...clear].find(key => typeof key === 'string' && unsupported.has(key));
    if (typeof leaf === 'string')
      return { kind: 'refused', reason: 'gm-correction-no-ordinary-carrier', leaf };
    const parsed = gmReplayCorrectionEffectSchema.safeParse(raw);
    if (!parsed.success)
      return { kind: 'refused', reason: 'gm-correction-invalid-effects' };
    const gap = unsupportedGmCorrectionLeaf(parsed.data);
    if (gap !== undefined)
      return { kind: 'refused', reason: 'gm-correction-no-ordinary-carrier', leaf: gap };
    effects.push(parsed.data);
  }
  return { kind: 'admitted', effects };
}
