import type { Meta, StoryObj } from '@storybook/react';
import { Badge, TechBaseBadge, WeightClassBadge } from './Badge';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'blue', 'emerald', 'purple', 'amber', 'orange', 'red', 'cyan', 'violet', 'yellow', 'slate',
        'rose', 'sky', 'fuchsia', 'teal', 'lime', 'pink',
        'orange-light', 'sky-light', 'violet-light', 'rose-light',
        'muted', 'warning', 'success', 'info',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    pill: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'slate',
  },
};

export const Blue: Story = {
  args: {
    children: 'Inner Sphere',
    variant: 'blue',
  },
};

export const Emerald: Story = {
  args: {
    children: 'Clan',
    variant: 'emerald',
  },
};

export const Pill: Story = {
  args: {
    children: 'Pilot',
    variant: 'amber',
    pill: true,
  },
};

export const Small: Story = {
  args: {
    children: 'XS',
    variant: 'cyan',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Extra Large',
    variant: 'violet',
    size: 'lg',
  },
};

export const BaseColors: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="blue">Blue</Badge>
      <Badge variant="emerald">Emerald</Badge>
      <Badge variant="purple">Purple</Badge>
      <Badge variant="amber">Amber</Badge>
      <Badge variant="orange">Orange</Badge>
      <Badge variant="red">Red</Badge>
      <Badge variant="cyan">Cyan</Badge>
      <Badge variant="violet">Violet</Badge>
      <Badge variant="yellow">Yellow</Badge>
      <Badge variant="slate">Slate</Badge>
    </div>
  ),
};

export const ExtendedColors: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="rose">Rose</Badge>
      <Badge variant="sky">Sky</Badge>
      <Badge variant="fuchsia">Fuchsia</Badge>
      <Badge variant="teal">Teal</Badge>
      <Badge variant="lime">Lime</Badge>
      <Badge variant="pink">Pink</Badge>
    </div>
  ),
};

export const LightVariants: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="orange-light">Ballistic Ammo</Badge>
      <Badge variant="sky-light">Missile Ammo</Badge>
      <Badge variant="violet-light">Artillery Ammo</Badge>
      <Badge variant="rose-light">Energy Ammo</Badge>
    </div>
  ),
};

export const SemanticVariants: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="muted">Muted</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const AllSizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm" variant="cyan">Small</Badge>
      <Badge size="md" variant="cyan">Medium</Badge>
      <Badge size="lg" variant="cyan">Large</Badge>
    </div>
  ),
};

export const TechBaseBadges: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <TechBaseBadge techBase={TechBase.INNER_SPHERE} />
      <TechBaseBadge techBase={TechBase.CLAN} />
    </div>
  ),
};

export const WeightClassBadges: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <WeightClassBadge weightClass={WeightClass.LIGHT} />
      <WeightClassBadge weightClass={WeightClass.MEDIUM} />
      <WeightClassBadge weightClass={WeightClass.HEAVY} />
      <WeightClassBadge weightClass={WeightClass.ASSAULT} />
    </div>
  ),
};

export const WeaponTypeBadges: StoryObj = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Weapon Categories</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="rose">Energy</Badge>
          <Badge variant="orange">Ballistic</Badge>
          <Badge variant="sky">Missile</Badge>
          <Badge variant="fuchsia">Capital</Badge>
        </div>
      </div>
      <div>
        <p className="text-text-theme-secondary text-sm mb-2">Ammunition</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="orange-light">AC/20 Ammo</Badge>
          <Badge variant="sky-light">LRM Ammo</Badge>
          <Badge variant="violet-light">Arrow IV Ammo</Badge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const EquipmentBadges: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="red">Weapon</Badge>
      <Badge variant="orange">Ammo</Badge>
      <Badge variant="cyan">Heat Sink</Badge>
      <Badge variant="blue">Electronics</Badge>
      <Badge variant="slate">Misc</Badge>
    </div>
  ),
};
