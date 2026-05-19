import type { Meta, StoryObj } from '@storybook/react';

import { SAMPLE_MEDICAL_BAY } from './__fixtures__/bayFixtures';
import { BayError } from './BayStates';
import { MedicalBay } from './MedicalBay';

const meta = {
  title: 'Campaign/Bays/MedicalBay',
  component: MedicalBay,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0f172a' }],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MedicalBay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — injured pilots across several injury levels and statuses. */
export const Populated: Story = {
  args: {
    medicalBay: SAMPLE_MEDICAL_BAY,
  },
};

/** Empty — no injured pilots; an empty state rather than an error (design D7). */
export const Empty: Story = {
  args: {
    medicalBay: [],
  },
};

/** Error — inventory load failed; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    medicalBay: [],
  },
  render: () => (
    <BayError
      message="The campaign inventory failed to load."
      onRetry={() => undefined}
    />
  ),
};
