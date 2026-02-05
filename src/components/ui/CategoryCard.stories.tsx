import type { Meta, StoryObj } from '@storybook/react';

import { CategoryCard } from './CategoryCard';

const WeaponIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-6 w-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

const ArmorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-6 w-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const MechIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-6 w-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const meta: Meta<typeof CategoryCard> = {
  title: 'UI/CategoryCard',
  component: CategoryCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    accentColor: {
      control: 'select',
      options: ['amber', 'cyan', 'emerald', 'rose', 'violet'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof CategoryCard>;

export const Default: Story = {
  args: {
    icon: <WeaponIcon />,
    title: 'WEAPONS',
    subtitle: 'Energy, Ballistic, Missile',
    href: '/weapons',
    accentColor: 'rose',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithoutSubtitle: Story = {
  args: {
    icon: <ArmorIcon />,
    title: 'ARMOR',
    href: '/armor',
    accentColor: 'cyan',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const AllAccentColors: StoryObj = {
  render: () => (
    <div className="grid w-96 gap-3">
      <CategoryCard
        icon={<WeaponIcon />}
        title="WEAPONS"
        subtitle="Rose accent"
        href="#"
        accentColor="rose"
      />
      <CategoryCard
        icon={<ArmorIcon />}
        title="ARMOR"
        subtitle="Cyan accent"
        href="#"
        accentColor="cyan"
      />
      <CategoryCard
        icon={<MechIcon />}
        title="MECHS"
        subtitle="Emerald accent"
        href="#"
        accentColor="emerald"
      />
      <CategoryCard
        icon={<WeaponIcon />}
        title="EQUIPMENT"
        subtitle="Amber accent"
        href="#"
        accentColor="amber"
      />
      <CategoryCard
        icon={<ArmorIcon />}
        title="PILOTS"
        subtitle="Violet accent"
        href="#"
        accentColor="violet"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const AsButton: Story = {
  args: {
    icon: <MechIcon />,
    title: 'CREATE NEW',
    subtitle: 'Click to trigger action',
    href: '#',
    accentColor: 'emerald',
    onClick: () => alert('Button clicked!'),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};
