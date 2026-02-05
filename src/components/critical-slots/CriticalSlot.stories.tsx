import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';
import { useState } from 'react';

import {
  CriticalSlot,
  CriticalSlotsGrid,
  CriticalSlotData,
} from './CriticalSlot';

const meta: Meta<typeof CriticalSlot> = {
  title: 'Critical-Slots/CriticalSlot',
  component: CriticalSlot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single critical slot display with tap-to-highlight and remove functionality.',
      },
    },
  },
  args: {
    onRemove: fn(),
    onAssign: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[150px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CriticalSlot>;

const emptySlot: CriticalSlotData = {
  id: 'slot-1',
  index: 0,
  equipment: null,
};

const equippedSlot: CriticalSlotData = {
  id: 'slot-2',
  index: 1,
  equipment: {
    id: 'eq-1',
    name: 'Medium Laser',
    type: 'Energy Weapon',
  },
};

export const Empty: Story = {
  args: {
    slot: emptySlot,
  },
};

export const EmptyNoAssign: Story = {
  args: {
    slot: emptySlot,
    onAssign: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty slot without assign callback shows "Empty slot" text.',
      },
    },
  },
};

export const WithEquipment: Story = {
  args: {
    slot: equippedSlot,
  },
};

export const WithIcon: Story = {
  args: {
    slot: {
      ...equippedSlot,
      equipment: {
        ...equippedSlot.equipment!,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2360a5fa"><circle cx="12" cy="12" r="10"/></svg>',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [slots, setSlots] = useState<CriticalSlotData[]>([
      {
        id: '1',
        index: 0,
        equipment: { id: 'e1', name: 'PPC', type: 'Energy' },
      },
      { id: '2', index: 1, equipment: null },
      {
        id: '3',
        index: 2,
        equipment: { id: 'e2', name: 'Medium Laser', type: 'Energy' },
      },
      { id: '4', index: 3, equipment: null },
    ]);

    const handleRemove = (slotId: string) => {
      setSlots(
        slots.map((s) => (s.id === slotId ? { ...s, equipment: null } : s)),
      );
    };

    return (
      <div className="max-w-[300px]">
        <CriticalSlotsGrid
          slots={slots}
          onRemove={handleRemove}
          onAssign={(slotId) => alert(`Assign to slot ${slotId}`)}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive grid. Click equipment to highlight, then click remove button. Tap empty slots to trigger assign.',
      },
    },
  },
};

export const MechArm: Story = {
  render: () => {
    const armSlots: CriticalSlotData[] = [
      {
        id: '1',
        index: 0,
        equipment: { id: 's1', name: 'Shoulder', type: 'Actuator' },
      },
      {
        id: '2',
        index: 1,
        equipment: { id: 's2', name: 'Upper Arm Actuator', type: 'Actuator' },
      },
      {
        id: '3',
        index: 2,
        equipment: { id: 's3', name: 'Lower Arm Actuator', type: 'Actuator' },
      },
      {
        id: '4',
        index: 3,
        equipment: { id: 's4', name: 'Hand Actuator', type: 'Actuator' },
      },
      {
        id: '5',
        index: 4,
        equipment: { id: 'e1', name: 'Medium Laser', type: 'Energy Weapon' },
      },
      { id: '6', index: 5, equipment: null },
      { id: '7', index: 6, equipment: null },
      { id: '8', index: 7, equipment: null },
      { id: '9', index: 8, equipment: null },
      { id: '10', index: 9, equipment: null },
      { id: '11', index: 10, equipment: null },
      { id: '12', index: 11, equipment: null },
    ];

    return (
      <div>
        <h3 className="mb-4 font-bold text-white">Left Arm (12 slots)</h3>
        <CriticalSlotsGrid
          slots={armSlots}
          onRemove={(id) => console.log('Remove', id)}
          onAssign={(id) => console.log('Assign', id)}
          className="max-w-[600px]"
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a BattleMech arm with actuators and equipment.',
      },
    },
  },
};
