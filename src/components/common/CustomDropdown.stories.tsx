import type { Meta, StoryObj } from '@storybook/react';
import CustomDropdown from './CustomDropdown';
import { useState } from 'react';

const meta: Meta<typeof CustomDropdown> = {
  title: 'Common/CustomDropdown',
  component: CustomDropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CustomDropdown>;

const engineOptions = ['Standard', 'XL', 'Light', 'XXL', 'Compact'];
const techBaseOptions = ['Inner Sphere', 'Clan', 'Mixed'];

export const Default: Story = {
  args: {
    value: 'Standard',
    options: engineOptions,
    onChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

export const WithPlaceholder: Story = {
  args: {
    value: '',
    options: techBaseOptions,
    onChange: () => {},
    placeholder: 'Select tech base...',
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    value: 'XL',
    options: engineOptions,
    onChange: () => {},
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

const InteractiveExample = () => {
  const [value, setValue] = useState('Standard');
  return (
    <div className="space-y-4 w-48">
      <CustomDropdown value={value} options={engineOptions} onChange={setValue} />
      <p className="text-text-theme-secondary text-sm">
        Selected: <span className="text-accent font-medium">{value}</span>
      </p>
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveExample />,
};
