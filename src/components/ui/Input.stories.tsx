import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { Input, Select, SearchInput } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    accent: {
      control: 'select',
      options: ['amber', 'cyan', 'emerald', 'violet'],
    },
    variant: {
      control: 'select',
      options: ['default', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithLabel: Story = {
  args: {
    label: 'Mech Name',
    placeholder: 'Atlas AS7-D',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithError: Story = {
  args: {
    label: 'Tonnage',
    value: '150',
    error: 'Maximum tonnage is 100 tons',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const LargeVariant: Story = {
  args: {
    variant: 'large',
    placeholder: 'Large input field',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const AccentColors: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <Input accent="amber" placeholder="Amber accent (default)" />
      <Input accent="cyan" placeholder="Cyan accent" />
      <Input accent="emerald" placeholder="Emerald accent" />
      <Input accent="violet" placeholder="Violet accent" />
    </div>
  ),
};

export const SelectDefault: Story = {
  render: () => (
    <div className="w-80">
      <Select
        label="Tech Base"
        options={[
          { value: 'is', label: 'Inner Sphere' },
          { value: 'clan', label: 'Clan' },
          { value: 'mixed', label: 'Mixed' },
        ]}
        placeholder="Select tech base..."
      />
    </div>
  ),
};

export const SelectWithAccent: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <Select
        accent="cyan"
        label="Engine Type"
        options={[
          { value: 'standard', label: 'Standard' },
          { value: 'xl', label: 'XL' },
          { value: 'light', label: 'Light' },
        ]}
      />
    </div>
  ),
};

const SearchInputExample = () => {
  const [value, setValue] = useState('');
  return (
    <SearchInput
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClear={() => setValue('')}
      placeholder="Search equipment..."
    />
  );
};

export const SearchInputDefault: Story = {
  render: () => (
    <div className="w-80">
      <SearchInputExample />
    </div>
  ),
};

export const AllInputTypes: Story = {
  render: () => (
    <div className="w-96 space-y-6">
      <Input label="Text Input" placeholder="Enter text..." />
      <Select
        label="Dropdown"
        options={[
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ]}
        placeholder="Select..."
      />
      <SearchInputExample />
    </div>
  ),
};
