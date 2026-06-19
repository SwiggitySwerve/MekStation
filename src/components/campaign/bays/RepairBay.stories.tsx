import type { Meta, StoryObj } from '@storybook/react';

import { action } from '@storybook/addon-actions';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { SAMPLE_REPAIR_BAY } from './__fixtures__/bayFixtures';
import { BayError } from './BayStates';
import { RepairBay } from './RepairBay';

const meta = {
  title: 'Campaign/Bays/RepairBay',
  component: RepairBay,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof RepairBay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — repair tickets grouped by unit with priority-reorder controls. */
export const Populated: Story = {
  args: {
    repairBay: SAMPLE_REPAIR_BAY,
    onReorder: action('reorder'),
  },
};

/** Drill-down focus — opened from the Mech Bay with a unit pre-selected. */
export const FocusedUnit: Story = {
  args: {
    repairBay: SAMPLE_REPAIR_BAY,
    onReorder: action('reorder'),
    focusUnitId: 'unit-locust',
  },
};

/** Empty — no repair tickets; an empty state rather than an error (design D7). */
export const Empty: Story = {
  args: {
    repairBay: [],
    onReorder: action('reorder'),
  },
};

/** Error — inventory load failed; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    repairBay: [],
    onReorder: action('reorder'),
  },
  render: () => (
    <BayError
      message="The campaign inventory failed to load."
      onRetry={() => undefined}
    />
  ),
};
