import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';
import { useState } from 'react';

import { MechLocation } from '@/types/construction';

import { ArmorDiagram, LocationArmorData } from './ArmorDiagram';

const meta: Meta<typeof ArmorDiagram> = {
  title: 'Customizer/Armor/ArmorDiagram',
  component: ArmorDiagram,
  tags: ['autodocs'],
  parameters: {
    zustand: {
      appSettings: {
        armorDiagramMode: 'silhouette',
      },
    },
  },
  args: {
    onLocationClick: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof ArmorDiagram>;

const mockArmorData: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  {
    location: MechLocation.CENTER_TORSO,
    current: 31,
    maximum: 47,
    rear: 14,
    rearMaximum: 14,
  },
  {
    location: MechLocation.LEFT_TORSO,
    current: 22,
    maximum: 32,
    rear: 10,
    rearMaximum: 10,
  },
  {
    location: MechLocation.RIGHT_TORSO,
    current: 22,
    maximum: 32,
    rear: 10,
    rearMaximum: 10,
  },
  { location: MechLocation.LEFT_ARM, current: 17, maximum: 34 },
  { location: MechLocation.RIGHT_ARM, current: 17, maximum: 34 },
  { location: MechLocation.LEFT_LEG, current: 26, maximum: 42 },
  { location: MechLocation.RIGHT_LEG, current: 26, maximum: 42 },
];

const partialArmorData: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 5, maximum: 9 },
  {
    location: MechLocation.CENTER_TORSO,
    current: 20,
    maximum: 47,
    rear: 5,
    rearMaximum: 14,
  },
  {
    location: MechLocation.LEFT_TORSO,
    current: 15,
    maximum: 32,
    rear: 0,
    rearMaximum: 10,
  },
  {
    location: MechLocation.RIGHT_TORSO,
    current: 15,
    maximum: 32,
    rear: 0,
    rearMaximum: 10,
  },
  { location: MechLocation.LEFT_ARM, current: 10, maximum: 34 },
  { location: MechLocation.RIGHT_ARM, current: 10, maximum: 34 },
  { location: MechLocation.LEFT_LEG, current: 20, maximum: 42 },
  { location: MechLocation.RIGHT_LEG, current: 20, maximum: 42 },
];

export const Default: Story = {
  args: {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: 0,
  },
};

export const WithSelection: Story = {
  args: {
    armorData: mockArmorData,
    selectedLocation: MechLocation.CENTER_TORSO,
    unallocatedPoints: 0,
  },
};

export const WithUnallocatedPoints: Story = {
  args: {
    armorData: partialArmorData,
    selectedLocation: null,
    unallocatedPoints: 85,
  },
};

export const OverAllocated: Story = {
  args: {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: -10,
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedLocation, setSelectedLocation] =
      useState<MechLocation | null>(null);
    const [armorData, setArmorData] = useState(partialArmorData);
    const [unallocatedPoints, setUnallocatedPoints] = useState(85);

    return (
      <div className="max-w-2xl">
        <ArmorDiagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={unallocatedPoints}
          onLocationClick={setSelectedLocation}
        />
        {selectedLocation && (
          <div className="bg-surface-base border-border-theme mt-4 rounded border p-4">
            <p className="text-white">Selected: {selectedLocation}</p>
          </div>
        )}
      </div>
    );
  },
};

export const SchematicMode: Story = {
  args: {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: 0,
  },
  parameters: {
    zustand: {
      appSettings: {
        armorDiagramMode: 'schematic',
      },
    },
  },
};
