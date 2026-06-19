/**
 * Refit Launch Panel — Storybook stories
 *
 * Covers the refit launch flow (CP3 — `add-campaign-refit-and-prestige`,
 * design D6): a target-configuration editor with a live class + estimate
 * and a commit action.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import { createRefitOrder } from '@/lib/campaign/refit/refitPipeline';
import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { RefitLaunchPanel } from './RefitLaunchPanel';

const meta = {
  title: 'Campaign/Bays/RefitLaunchPanel',
  component: RefitLaunchPanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof RefitLaunchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default — a unit at the standard baseline, ready to choose a target. */
export const Default: Story = {
  args: {
    unitId: 'atlas-as7d',
    unitName: 'Atlas AS7-D',
    currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
    onCommit: (target) => {
      // A demo commit that always advances to in-progress.
      const order = createRefitOrder({
        id: 'refit-demo',
        unitId: 'atlas-as7d',
        currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
        targetConfiguration: target,
        createdAt: '3025-02-01T00:00:00.000Z',
      });
      return { order: { ...order, status: 'in-progress' } };
    },
    onCancel: () => undefined,
  },
};

/** Commit-blocked — the demo handler reports a construction-validation failure. */
export const ValidationBlocked: Story = {
  args: {
    unitId: 'commando-com2d',
    unitName: 'Commando COM-2D',
    currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
    onCommit: (target) => {
      const order = createRefitOrder({
        id: 'refit-demo',
        unitId: 'commando-com2d',
        currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
        targetConfiguration: target,
        createdAt: '3025-02-01T00:00:00.000Z',
      });
      return {
        order,
        validationErrors: ['Total weight (52t) exceeds tonnage (50t)'],
      };
    },
    onCancel: () => undefined,
  },
};
