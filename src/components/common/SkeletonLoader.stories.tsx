import type { Meta, StoryObj } from '@storybook/react';
import { SkeletonInput, SkeletonSelect, SkeletonNumberInput, SkeletonText, SkeletonButton, SkeletonFormSection } from './SkeletonLoader';

const meta: Meta<typeof SkeletonInput> = {
  title: 'Common/SkeletonLoader',
  component: SkeletonInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SkeletonInput>;

export const Input: Story = {
  render: () => (
    <div className="w-64">
      <SkeletonInput />
    </div>
  ),
};

export const Select: StoryObj = {
  render: () => (
    <div className="w-64">
      <SkeletonSelect />
    </div>
  ),
};

export const NumberInput: StoryObj = {
  render: () => <SkeletonNumberInput />,
};

export const Text: StoryObj = {
  render: () => <SkeletonText />,
};

export const Button: StoryObj = {
  render: () => (
    <div className="w-32">
      <SkeletonButton />
    </div>
  ),
};

export const FormSection: StoryObj = {
  render: () => (
    <div className="w-80">
      <SkeletonFormSection title="Loading...">
        <div className="space-y-3">
          <SkeletonInput />
          <SkeletonSelect />
          <SkeletonButton />
        </div>
      </SkeletonFormSection>
    </div>
  ),
};

export const AllVariants: StoryObj = {
  render: () => (
    <div className="space-y-6 w-80">
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Input</p>
        <SkeletonInput />
      </div>
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Select</p>
        <SkeletonSelect />
      </div>
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Number Input</p>
        <SkeletonNumberInput />
      </div>
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Text</p>
        <SkeletonText />
      </div>
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Button</p>
        <SkeletonButton />
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
