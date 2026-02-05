import type { Meta, StoryObj } from '@storybook/react';

import { Card, CardSection } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'dark',
        'header',
        'interactive',
        'gradient',
        'accent-left',
        'accent-bottom',
      ],
    },
    accentColor: {
      control: 'select',
      options: ['amber', 'cyan', 'emerald', 'rose', 'violet'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

const SampleContent = () => (
  <>
    <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
      Card Title
    </h3>
    <p className="text-text-theme-secondary">
      This is sample card content demonstrating the card component.
    </p>
  </>
);

export const Default: Story = {
  args: {
    children: <SampleContent />,
    variant: 'default',
  },
};

export const Dark: Story = {
  args: {
    children: <SampleContent />,
    variant: 'dark',
  },
};

export const Header: Story = {
  args: {
    children: <SampleContent />,
    variant: 'header',
  },
};

export const Interactive: Story = {
  args: {
    children: <SampleContent />,
    variant: 'interactive',
    onClick: () => alert('Card clicked!'),
  },
};

export const Gradient: Story = {
  args: {
    children: <SampleContent />,
    variant: 'gradient',
  },
};

export const AccentLeft: Story = {
  args: {
    children: <SampleContent />,
    variant: 'accent-left',
    accentColor: 'amber',
  },
};

export const AccentLeftCyan: Story = {
  args: {
    children: <SampleContent />,
    variant: 'accent-left',
    accentColor: 'cyan',
  },
};

export const AccentBottom: Story = {
  args: {
    children: <SampleContent />,
    variant: 'accent-bottom',
    accentColor: 'emerald',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-4">
      <Card variant="default">
        <SampleContent />
      </Card>
      <Card variant="dark">
        <SampleContent />
      </Card>
      <Card variant="header">
        <SampleContent />
      </Card>
      <Card variant="interactive">
        <SampleContent />
      </Card>
      <Card variant="gradient">
        <SampleContent />
      </Card>
      <Card variant="accent-left" accentColor="cyan">
        <SampleContent />
      </Card>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const AllAccentColors: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-3 gap-4">
      <Card variant="accent-left" accentColor="amber">
        <SampleContent />
      </Card>
      <Card variant="accent-left" accentColor="cyan">
        <SampleContent />
      </Card>
      <Card variant="accent-left" accentColor="emerald">
        <SampleContent />
      </Card>
      <Card variant="accent-left" accentColor="rose">
        <SampleContent />
      </Card>
      <Card variant="accent-left" accentColor="violet">
        <SampleContent />
      </Card>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const CardSectionExample: Story = {
  render: () => (
    <div className="max-w-md">
      <CardSection title="Engine" titleColor="amber" asCard>
        <p className="text-text-theme-secondary">Fusion 300 XL</p>
      </CardSection>
    </div>
  ),
};
