import type { Meta, StoryObj } from "@storybook/react";

import { fn } from "@storybook/test";
import { useState } from "react";

import { MechLocation } from "@/types/construction/CriticalSlotAllocation";

import {
  ArmorDiagram,
  type ArmorAllocationType,
  type ArmorData,
} from "./ArmorDiagram";

/**
 * The armor/ArmorDiagram component is a self-contained front/rear armor
 * editor used outside of the heavyweight customizer pipeline. It accepts a
 * structured ArmorData object and emits per-location armor edits along with
 * optional auto-allocation requests.
 */
const meta: Meta<typeof ArmorDiagram> = {
  title: "Armor/ArmorDiagram",
  component: ArmorDiagram,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Standalone armor diagram with front/rear toggle and optional auto-allocate dropdown. Renders a CSS-grid silhouette layout on desktop and a vertical stack on mobile.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-deep w-[640px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    onArmorChange: fn(),
    onAutoAllocate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ArmorDiagram>;

const fullArmor: ArmorData = {
  front: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 31,
    [MechLocation.LEFT_TORSO]: 22,
    [MechLocation.RIGHT_TORSO]: 22,
    [MechLocation.LEFT_ARM]: 17,
    [MechLocation.RIGHT_ARM]: 17,
    [MechLocation.LEFT_LEG]: 26,
    [MechLocation.RIGHT_LEG]: 26,
  },
  rear: {
    [MechLocation.CENTER_TORSO]: 14,
    [MechLocation.LEFT_TORSO]: 10,
    [MechLocation.RIGHT_TORSO]: 10,
  },
  max: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 47,
    [MechLocation.LEFT_TORSO]: 32,
    [MechLocation.RIGHT_TORSO]: 32,
    [MechLocation.LEFT_ARM]: 34,
    [MechLocation.RIGHT_ARM]: 34,
    [MechLocation.LEFT_LEG]: 42,
    [MechLocation.RIGHT_LEG]: 42,
  },
};

const partialArmor: ArmorData = {
  front: {
    [MechLocation.HEAD]: 5,
    [MechLocation.CENTER_TORSO]: 18,
    [MechLocation.LEFT_TORSO]: 14,
    [MechLocation.RIGHT_TORSO]: 14,
    [MechLocation.LEFT_ARM]: 10,
    [MechLocation.RIGHT_ARM]: 10,
    [MechLocation.LEFT_LEG]: 18,
    [MechLocation.RIGHT_LEG]: 18,
  },
  rear: {
    [MechLocation.CENTER_TORSO]: 5,
    [MechLocation.LEFT_TORSO]: 0,
    [MechLocation.RIGHT_TORSO]: 0,
  },
  max: fullArmor.max,
};

const emptyArmor: ArmorData = {
  front: {
    [MechLocation.HEAD]: 0,
    [MechLocation.CENTER_TORSO]: 0,
    [MechLocation.LEFT_TORSO]: 0,
    [MechLocation.RIGHT_TORSO]: 0,
    [MechLocation.LEFT_ARM]: 0,
    [MechLocation.RIGHT_ARM]: 0,
    [MechLocation.LEFT_LEG]: 0,
    [MechLocation.RIGHT_LEG]: 0,
  },
  rear: {
    [MechLocation.CENTER_TORSO]: 0,
    [MechLocation.LEFT_TORSO]: 0,
    [MechLocation.RIGHT_TORSO]: 0,
  },
  max: fullArmor.max,
};

export const FullArmor: Story = {
  args: {
    armor: fullArmor,
  },
};

export const PartialArmor: Story = {
  args: {
    armor: partialArmor,
  },
};

export const EmptyArmor: Story = {
  args: {
    armor: emptyArmor,
  },
};

export const WithAutoAllocate: Story = {
  args: {
    armor: partialArmor,
    onAutoAllocate: fn(),
  },
};

export const WithoutAutoAllocate: Story = {
  args: {
    armor: partialArmor,
    onAutoAllocate: undefined,
  },
};

/**
 * Stateful story that lets you walk through allocation by clicking on
 * locations. Demonstrates the front/rear toggle and auto-allocate flow.
 */
export const Interactive: Story = {
  render: (args) => {
    const [armor, setArmor] = useState<ArmorData>(partialArmor);

    const handleArmorChange = (
      location: MechLocation,
      value: number,
      facing: "front" | "rear",
    ) => {
      setArmor((prev) => ({
        ...prev,
        [facing]: { ...prev[facing], [location]: value },
      }));
    };

    const handleAutoAllocate = (type: ArmorAllocationType) => {
      // Naive demo: distribute max armor evenly across the front face
      // (front-weighted/rear-weighted variants left as stub).
      if (type === "even") {
        setArmor((prev) => ({
          ...prev,
          front: { ...prev.max },
        }));
      }
    };

    return (
      <ArmorDiagram
        {...args}
        armor={armor}
        onArmorChange={handleArmorChange}
        onAutoAllocate={handleAutoAllocate}
      />
    );
  },
};
