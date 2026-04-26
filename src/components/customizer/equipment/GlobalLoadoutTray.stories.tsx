import type { Meta, StoryObj } from "@storybook/react";

import { fn } from "@storybook/test";
import { useState } from "react";

import { MechLocation } from "@/types/construction";
import { EquipmentCategory } from "@/types/equipment";

import type {
  AvailableLocation,
  LoadoutEquipmentItem,
} from "./GlobalLoadoutTray.types";

import { GlobalLoadoutTray } from "./GlobalLoadoutTray";

const meta: Meta<typeof GlobalLoadoutTray> = {
  title: "Customizer/Equipment/GlobalLoadoutTray",
  component: GlobalLoadoutTray,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Global loadout tray showing unallocated and allocated equipment with category filters, drag-and-drop, quick assign, and remove confirmation. Uses react-dnd HTML5 backend (provided globally by the Storybook DndDecorator).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-deep flex h-[600px] justify-end">
        <div className="bg-surface-base flex-1" />
        <Story />
      </div>
    ),
  ],
  args: {
    onRemoveEquipment: fn(),
    onRemoveAllEquipment: fn(),
    onToggleExpand: fn(),
    onSelectEquipment: fn(),
    onUnassignEquipment: fn(),
    onQuickAssign: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof GlobalLoadoutTray>;

/**
 * Build a LoadoutEquipmentItem fixture with sensible defaults that mirror
 * the unit-test factory in GlobalLoadoutTray.test.tsx.
 */
function makeItem(
  overrides: Partial<LoadoutEquipmentItem> &
    Pick<LoadoutEquipmentItem, "instanceId" | "name" | "category">,
): LoadoutEquipmentItem {
  return {
    equipmentId: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    weight: 1,
    criticalSlots: 1,
    isAllocated: false,
    isRemovable: true,
    ...overrides,
  };
}

const sampleEquipment: LoadoutEquipmentItem[] = [
  makeItem({
    instanceId: "eq-1",
    name: "Medium Laser",
    category: EquipmentCategory.ENERGY_WEAPON,
    heat: 3,
    damage: 5,
  }),
  makeItem({
    instanceId: "eq-2",
    name: "Large Laser",
    category: EquipmentCategory.ENERGY_WEAPON,
    heat: 8,
    damage: 8,
    weight: 5,
    criticalSlots: 2,
  }),
  makeItem({
    instanceId: "eq-3",
    name: "AC/10",
    category: EquipmentCategory.BALLISTIC_WEAPON,
    weight: 12,
    criticalSlots: 7,
    heat: 3,
    damage: 10,
    isAllocated: true,
    location: "Right Torso",
  }),
  makeItem({
    instanceId: "eq-4",
    name: "AC/10 Ammo",
    category: EquipmentCategory.AMMUNITION,
    weight: 1,
  }),
  makeItem({
    instanceId: "eq-5",
    name: "LRM 15",
    category: EquipmentCategory.MISSILE_WEAPON,
    weight: 7,
    criticalSlots: 3,
    heat: 5,
    damage: "1/missile",
    isAllocated: true,
    location: "Left Torso",
  }),
  makeItem({
    instanceId: "eq-6",
    name: "LRM Ammo",
    category: EquipmentCategory.AMMUNITION,
    weight: 1,
  }),
  makeItem({
    instanceId: "eq-7",
    name: "CASE",
    category: EquipmentCategory.MISC_EQUIPMENT,
    weight: 0.5,
    isRemovable: false,
  }),
];

const omniEquipment: LoadoutEquipmentItem[] = sampleEquipment.map((item) => ({
  ...item,
  isOmniPodMounted: item.category !== EquipmentCategory.STRUCTURAL,
}));

const sampleAvailableLocations: AvailableLocation[] = [
  {
    location: MechLocation.LEFT_ARM,
    label: "Left Arm",
    availableSlots: 4,
    canFit: true,
  },
  {
    location: MechLocation.RIGHT_ARM,
    label: "Right Arm",
    availableSlots: 4,
    canFit: true,
  },
  {
    location: MechLocation.LEFT_TORSO,
    label: "Left Torso",
    availableSlots: 8,
    canFit: true,
  },
  {
    location: MechLocation.CENTER_TORSO,
    label: "Center Torso",
    availableSlots: 2,
    canFit: false,
  },
  {
    location: MechLocation.RIGHT_TORSO,
    label: "Right Torso",
    availableSlots: 6,
    canFit: true,
  },
];

export const Default: Story = {
  args: {
    equipment: sampleEquipment,
    equipmentCount: sampleEquipment.length,
    isExpanded: true,
    selectedEquipmentId: null,
    availableLocations: sampleAvailableLocations,
    isOmni: false,
  },
};

export const Empty: Story = {
  args: {
    equipment: [],
    equipmentCount: 0,
    isExpanded: true,
    selectedEquipmentId: null,
    availableLocations: sampleAvailableLocations,
    isOmni: false,
  },
};

export const Collapsed: Story = {
  args: {
    equipment: sampleEquipment,
    equipmentCount: sampleEquipment.length,
    isExpanded: false,
    selectedEquipmentId: null,
    availableLocations: sampleAvailableLocations,
    isOmni: false,
  },
};

export const SelectedItem: Story = {
  args: {
    equipment: sampleEquipment,
    equipmentCount: sampleEquipment.length,
    isExpanded: true,
    selectedEquipmentId: "eq-1",
    availableLocations: sampleAvailableLocations,
    isOmni: false,
  },
};

export const OmniPodMounted: Story = {
  args: {
    equipment: omniEquipment,
    equipmentCount: omniEquipment.length,
    isExpanded: true,
    selectedEquipmentId: null,
    availableLocations: sampleAvailableLocations,
    isOmni: true,
  },
};

export const FullyAllocated: Story = {
  args: {
    equipment: sampleEquipment.map((item) => ({
      ...item,
      isAllocated: true,
      location: item.location ?? "Right Torso",
    })),
    equipmentCount: sampleEquipment.length,
    isExpanded: true,
    selectedEquipmentId: null,
    availableLocations: sampleAvailableLocations,
    isOmni: false,
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
      <GlobalLoadoutTray
        {...args}
        equipment={sampleEquipment}
        equipmentCount={sampleEquipment.length}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((prev) => !prev)}
        selectedEquipmentId={selectedId}
        onSelectEquipment={setSelectedId}
        availableLocations={sampleAvailableLocations}
      />
    );
  },
};
