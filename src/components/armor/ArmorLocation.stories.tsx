import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ArmorLocation } from './ArmorLocation';

const meta: Meta<typeof ArmorLocation> = {
  title: 'Armor/ArmorLocation',
  component: ArmorLocation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An interactive armor location control with progress bar, quick-add buttons, and fine-tune stepper controls. Expands to show detailed controls on click.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ArmorLocation>;

function InteractiveArmorLocation(props: Omit<React.ComponentProps<typeof ArmorLocation>, 'onArmorChange'> & { initialArmor?: number }) {
  const [armor, setArmor] = useState(props.initialArmor ?? props.currentArmor);
  return <ArmorLocation {...props} currentArmor={armor} onArmorChange={setArmor} />;
}

export const Default: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Center Torso"
      currentArmor={32}
      maxArmor={47}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Left Arm"
      currentArmor={0}
      maxArmor={34}
    />
  ),
};

export const FullArmor: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Head"
      currentArmor={9}
      maxArmor={9}
    />
  ),
};

export const HalfFilled: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Right Torso"
      currentArmor={20}
      maxArmor={40}
    />
  ),
};

export const LowArmor: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Left Leg"
      currentArmor={5}
      maxArmor={42}
    />
  ),
};

export const HighCapacity: Story = {
  render: () => (
    <InteractiveArmorLocation
      location="Center Torso"
      currentArmor={62}
      maxArmor={92}
    />
  ),
};

export const AllLocations: Story = {
  render: () => {
    const locations = [
      { location: 'Head', current: 9, max: 9 },
      { location: 'Center Torso', current: 47, max: 47 },
      { location: 'Left Torso', current: 32, max: 32 },
      { location: 'Right Torso', current: 32, max: 32 },
      { location: 'Left Arm', current: 34, max: 34 },
      { location: 'Right Arm', current: 34, max: 34 },
      { location: 'Left Leg', current: 42, max: 42 },
      { location: 'Right Leg', current: 42, max: 42 },
    ];

    return (
      <div className="space-y-2">
        {locations.map((loc) => (
          <InteractiveArmorLocation
            key={loc.location}
            location={loc.location}
            currentArmor={loc.current}
            maxArmor={loc.max}
          />
        ))}
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const VariedArmorLevels: Story = {
  render: () => {
    const locations = [
      { location: 'Head', current: 9, max: 9 },
      { location: 'Center Torso', current: 30, max: 47 },
      { location: 'Left Torso', current: 15, max: 32 },
      { location: 'Right Torso', current: 28, max: 32 },
      { location: 'Left Arm', current: 0, max: 34 },
      { location: 'Right Arm', current: 34, max: 34 },
      { location: 'Left Leg', current: 20, max: 42 },
      { location: 'Right Leg', current: 10, max: 42 },
    ];

    return (
      <div className="space-y-2">
        {locations.map((loc) => (
          <InteractiveArmorLocation
            key={loc.location}
            location={loc.location}
            currentArmor={loc.current}
            maxArmor={loc.max}
          />
        ))}
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const WithChangeCallback: Story = {
  render: () => {
    const [armor, setArmor] = useState(25);
    const [log, setLog] = useState<string[]>([]);

    const handleChange = (value: number) => {
      setArmor(value);
      setLog((prev) => [
        `${new Date().toLocaleTimeString()}: Changed to ${value}`,
        ...prev.slice(0, 4),
      ]);
    };

    return (
      <div className="space-y-4">
        <ArmorLocation
          location="Center Torso"
          currentArmor={armor}
          maxArmor={47}
          onArmorChange={handleChange}
        />
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono space-y-1">
          <p className="font-semibold mb-2">Change Log:</p>
          {log.length === 0 ? (
            <p className="text-gray-500">Expand and modify armor to see events...</p>
          ) : (
            log.map((entry, i) => <p key={i}>{entry}</p>)
          )}
        </div>
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};
