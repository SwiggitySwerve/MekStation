import { EventCategory, type IEventQueryFilters } from '@/types/events';

import type { FilterChipVariant } from './FilterChip';

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: EventCategory.Game, label: 'Game Events' },
  { value: EventCategory.Campaign, label: 'Campaign Events' },
  { value: EventCategory.Pilot, label: 'Pilot Events' },
  { value: EventCategory.Repair, label: 'Repair Events' },
  { value: EventCategory.Award, label: 'Award Events' },
  { value: EventCategory.Meta, label: 'Meta Events' },
];

export const EVENT_TYPES_BY_CATEGORY: Record<EventCategory, string[]> = {
  [EventCategory.Game]: [
    'game.started',
    'game.ended',
    'game.phase_changed',
    'game.turn_started',
    'game.turn_ended',
    'game.unit_moved',
    'game.attack_declared',
    'game.damage_applied',
  ],
  [EventCategory.Campaign]: [
    'campaign.created',
    'campaign.mission_started',
    'campaign.mission_completed',
    'campaign.roster_changed',
    'campaign.contract_accepted',
  ],
  [EventCategory.Pilot]: [
    'pilot.created',
    'pilot.xp_gained',
    'pilot.skill_improved',
    'pilot.wounded',
    'pilot.recovered',
    'pilot.killed',
    'pilot.assigned',
  ],
  [EventCategory.Repair]: [
    'repair.started',
    'repair.completed',
    'repair.cost_calculated',
    'repair.parts_ordered',
  ],
  [EventCategory.Award]: [
    'award.earned',
    'award.medal_granted',
    'award.achievement_unlocked',
  ],
  [EventCategory.Meta]: [
    'meta.checkpoint_created',
    'meta.chunk_finalized',
    'meta.save_created',
    'meta.save_loaded',
  ],
};

export function formatEventType(type: string): string {
  const shortType = type.includes('.')
    ? type.split('.').slice(1).join('.')
    : type;
  return shortType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getActiveFilters(filters: IEventQueryFilters): Array<{
  key: string;
  label: string;
  value: string;
  variant: FilterChipVariant;
  onRemove: () => IEventQueryFilters;
}> {
  const active: Array<{
    key: string;
    label: string;
    value: string;
    variant: FilterChipVariant;
    onRemove: () => IEventQueryFilters;
  }> = [];

  if (filters.category) {
    active.push({
      key: 'category',
      label: 'Category',
      value:
        CATEGORY_OPTIONS.find((o) => o.value === filters.category)?.label ||
        filters.category,
      variant: 'category',
      onRemove: () => ({ ...filters, category: undefined }),
    });
  }

  if (filters.types && filters.types.length > 0) {
    filters.types.forEach((type, index) => {
      active.push({
        key: `type-${index}`,
        label: 'Type',
        value: formatEventType(type),
        variant: 'type',
        onRemove: () => ({
          ...filters,
          types: filters.types?.filter((t) => t !== type),
        }),
      });
    });
  }

  if (filters.context) {
    const ctx = filters.context;
    if (ctx.campaignId) {
      active.push({
        key: 'ctx-campaign',
        label: 'Campaign',
        value: ctx.campaignId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, campaignId: undefined },
        }),
      });
    }
    if (ctx.gameId) {
      active.push({
        key: 'ctx-game',
        label: 'Game',
        value: ctx.gameId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, gameId: undefined },
        }),
      });
    }
    if (ctx.pilotId) {
      active.push({
        key: 'ctx-pilot',
        label: 'Pilot',
        value: ctx.pilotId.slice(0, 8) + '...',
        variant: 'context',
        onRemove: () => ({
          ...filters,
          context: { ...ctx, pilotId: undefined },
        }),
      });
    }
  }

  if (filters.timeRange) {
    active.push({
      key: 'time',
      label: 'Time',
      value: `${filters.timeRange.from.split('T')[0]} → ${filters.timeRange.to.split('T')[0]}`,
      variant: 'time',
      onRemove: () => ({ ...filters, timeRange: undefined }),
    });
  }

  if (filters.sequenceRange) {
    active.push({
      key: 'sequence',
      label: 'Sequence',
      value: `#${filters.sequenceRange.from} → #${filters.sequenceRange.to}`,
      variant: 'sequence',
      onRemove: () => ({ ...filters, sequenceRange: undefined }),
    });
  }

  if (filters.rootEventsOnly) {
    active.push({
      key: 'root',
      label: 'Filter',
      value: 'Root only',
      variant: 'category',
      onRemove: () => ({ ...filters, rootEventsOnly: false }),
    });
  }

  return active;
}
