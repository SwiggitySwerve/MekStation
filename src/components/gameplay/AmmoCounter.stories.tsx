import type { Meta, StoryObj } from '@storybook/react';
import { AmmoCounter } from './AmmoCounter';
import { useState } from 'react';

const meta: Meta<typeof AmmoCounter> = {
  title: 'Gameplay/AmmoCounter',
  component: AmmoCounter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AmmoCounter>;

export const FullAmmo: Story = {
  args: {
    weaponName: 'AC/20',
    shotsRemaining: 5,
    magazineSize: 5,
    onFire: () => {},
    onReload: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const LowAmmo: Story = {
  args: {
    weaponName: 'Machine Gun',
    shotsRemaining: 25,
    magazineSize: 100,
    onFire: () => {},
    onReload: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: {
    weaponName: 'LRM-20',
    shotsRemaining: 0,
    magazineSize: 6,
    onFire: () => {},
    onReload: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Reloading: Story = {
  args: {
    weaponName: 'Gauss Rifle',
    shotsRemaining: 0,
    magazineSize: 8,
    onFire: () => {},
    onReload: () => {},
    isReloading: true,
    reloadTime: 3,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

const InteractiveExample = () => {
  const [shots, setShots] = useState(10);
  const [isReloading, setIsReloading] = useState(false);
  const magazineSize = 10;

  const handleFire = () => {
    if (shots > 0 && !isReloading) {
      setShots(shots - 1);
    }
  };

  const handleReload = () => {
    if (!isReloading && shots < magazineSize) {
      setIsReloading(true);
      setTimeout(() => {
        setShots(magazineSize);
        setIsReloading(false);
      }, 2000);
    }
  };

  return (
    <div className="w-80">
      <AmmoCounter
        weaponName="Medium Laser Array"
        shotsRemaining={shots}
        magazineSize={magazineSize}
        onFire={handleFire}
        onReload={handleReload}
        isReloading={isReloading}
        reloadTime={2}
      />
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveExample />,
};
