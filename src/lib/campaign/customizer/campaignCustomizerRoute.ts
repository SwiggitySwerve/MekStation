import type { ParsedUrlQuery } from 'querystring';

import {
  DEFAULT_TAB,
  type CustomizerTabId,
  isValidTabId,
} from '@/hooks/useCustomizerRouter';
import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';
import { isValidUnitId } from '@/utils/uuid';

export const CAMPAIGN_CUSTOMIZER_MODE = 'campaign-refit' as const;

export type CampaignCustomizerReturnTo = 'mek-stable' | 'mission-readiness';

export interface CampaignCustomizerRouteState {
  readonly mode: typeof CAMPAIGN_CUSTOMIZER_MODE;
  readonly campaignId: string;
  readonly unitId: string;
  readonly missionId?: string;
  readonly returnTo: CampaignCustomizerReturnTo;
  readonly campaignDate: string;
  readonly budget: number;
  readonly rulesLevel: RulesLevel;
  readonly refitConstraints: string;
  readonly editorUnitId?: string;
}

export interface BuildCampaignCustomizerHrefOptions extends Omit<
  CampaignCustomizerRouteState,
  'mode'
> {
  readonly tabId?: CustomizerTabId;
}

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseBudget(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReturnTo(
  value: string | null,
): CampaignCustomizerReturnTo | null {
  return value === 'mek-stable' || value === 'mission-readiness' ? value : null;
}

function parseRulesLevel(value: string | null): RulesLevel {
  const match = ALL_RULES_LEVELS.find((level) => level === value);
  return match ?? RulesLevel.STANDARD;
}

function appendOptional(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === '') return;
  params.set(key, String(value));
}

export function parseCampaignCustomizerRouteState(
  query: ParsedUrlQuery,
): CampaignCustomizerRouteState | null {
  if (firstQueryValue(query.mode) !== CAMPAIGN_CUSTOMIZER_MODE) {
    return null;
  }

  const campaignId = firstQueryValue(query.campaignId);
  const unitId = firstQueryValue(query.unitId);
  const returnTo = parseReturnTo(firstQueryValue(query.returnTo));
  const campaignDate = firstQueryValue(query.campaignDate);
  const budget = parseBudget(firstQueryValue(query.budget));
  const editorUnitId = firstQueryValue(query.editorUnitId) ?? undefined;

  if (!campaignId || !unitId || !returnTo || !campaignDate || budget === null) {
    return null;
  }

  return {
    mode: CAMPAIGN_CUSTOMIZER_MODE,
    campaignId,
    unitId,
    missionId: firstQueryValue(query.missionId) ?? undefined,
    returnTo,
    campaignDate,
    budget,
    rulesLevel: parseRulesLevel(firstQueryValue(query.rulesLevel)),
    refitConstraints:
      firstQueryValue(query.refitConstraints) ?? 'campaign-owned-refit',
    editorUnitId:
      editorUnitId && isValidUnitId(editorUnitId) ? editorUnitId : undefined,
  };
}

export function buildCampaignCustomizerHref(
  options: BuildCampaignCustomizerHrefOptions,
): string {
  const tabId =
    options.tabId && isValidTabId(options.tabId) ? options.tabId : DEFAULT_TAB;
  const path = options.editorUnitId
    ? `/customizer/${encodeURIComponent(options.editorUnitId)}/${tabId}`
    : '/customizer';
  const params = new URLSearchParams({
    mode: CAMPAIGN_CUSTOMIZER_MODE,
    campaignId: options.campaignId,
    unitId: options.unitId,
    returnTo: options.returnTo,
    campaignDate: options.campaignDate,
    budget: String(options.budget),
    rulesLevel: options.rulesLevel,
    refitConstraints: options.refitConstraints,
  });

  appendOptional(params, 'missionId', options.missionId);
  appendOptional(params, 'editorUnitId', options.editorUnitId);

  return `${path}?${params.toString()}`;
}

export function buildCampaignCustomizerReturnHref(
  state: CampaignCustomizerRouteState,
  result?: {
    readonly status?: 'saved' | 'cancelled' | 'blocked';
    readonly refitOrderId?: string;
  },
): string {
  const path =
    state.returnTo === 'mission-readiness' && state.missionId
      ? `/gameplay/campaigns/${encodeURIComponent(
          state.campaignId,
        )}/missions/${encodeURIComponent(state.missionId)}/launch`
      : `/gameplay/campaigns/${encodeURIComponent(state.campaignId)}/mech-bay`;
  const params = new URLSearchParams({
    unit: state.unitId,
    refresh: 'deployment-validation',
  });
  appendOptional(params, 'customizerResult', result?.status);
  appendOptional(params, 'refitOrderId', result?.refitOrderId);
  return `${path}?${params.toString()}`;
}
