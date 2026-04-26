import type { Meta, StoryObj } from "@storybook/react";

import { fn } from "@storybook/test";
import { useState } from "react";

import {
  TechBaseComponent,
  TechBaseMode,
  createDefaultComponentTechBases,
  type IComponentTechBases,
} from "@/types/construction/TechBaseConfiguration";
import { TechBase } from "@/types/enums/TechBase";

import { TechBaseConfiguration } from "./TechBaseConfiguration";

const meta: Meta<typeof TechBaseConfiguration> = {
  title: "Customizer/Shared/TechBaseConfiguration",
  component: TechBaseConfiguration,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Combined panel showing component selections and tech base toggles. Supports Inner Sphere, Clan, and Mixed Tech modes per BattleTech TechManual mixed tech rules.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
  args: {
    onModeChange: fn(),
    onComponentChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TechBaseConfiguration>;

const innerSphereComponents: IComponentTechBases =
  createDefaultComponentTechBases(TechBase.INNER_SPHERE);
const clanComponents: IComponentTechBases = createDefaultComponentTechBases(
  TechBase.CLAN,
);
const mixedComponents: IComponentTechBases = {
  [TechBaseComponent.CHASSIS]: TechBase.INNER_SPHERE,
  [TechBaseComponent.GYRO]: TechBase.INNER_SPHERE,
  [TechBaseComponent.ENGINE]: TechBase.CLAN,
  [TechBaseComponent.HEATSINK]: TechBase.CLAN,
  [TechBaseComponent.TARGETING]: TechBase.INNER_SPHERE,
  [TechBaseComponent.MYOMER]: TechBase.INNER_SPHERE,
  [TechBaseComponent.MOVEMENT]: TechBase.CLAN,
  [TechBaseComponent.ARMOR]: TechBase.CLAN,
};

const sampleComponentValues = {
  chassis: "Endo Steel",
  gyro: "XL",
  engine: "XL Fusion 300",
  heatsink: "Double",
  targeting: "Standard",
  myomer: "TSM",
  movement: "Jump Jets",
  armor: "Ferro-Fibrous",
};

export const InnerSphereMode: Story = {
  args: {
    mode: TechBaseMode.INNER_SPHERE,
    components: innerSphereComponents,
    componentValues: sampleComponentValues,
    readOnly: false,
  },
};

export const ClanMode: Story = {
  args: {
    mode: TechBaseMode.CLAN,
    components: clanComponents,
    componentValues: {
      ...sampleComponentValues,
      armor: "Ferro-Fibrous (Clan)",
    },
    readOnly: false,
  },
};

export const MixedTechMode: Story = {
  args: {
    mode: TechBaseMode.MIXED,
    components: mixedComponents,
    componentValues: sampleComponentValues,
    readOnly: false,
  },
};

export const ReadOnly: Story = {
  args: {
    mode: TechBaseMode.INNER_SPHERE,
    components: innerSphereComponents,
    componentValues: sampleComponentValues,
    readOnly: true,
  },
};

export const DefaultPlaceholders: Story = {
  args: {
    mode: TechBaseMode.INNER_SPHERE,
    components: innerSphereComponents,
    readOnly: false,
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [mode, setMode] = useState<TechBaseMode>(TechBaseMode.MIXED);
    const [components, setComponents] =
      useState<IComponentTechBases>(mixedComponents);

    return (
      <TechBaseConfiguration
        {...args}
        mode={mode}
        components={components}
        componentValues={sampleComponentValues}
        onModeChange={(next) => {
          setMode(next);
          if (next === TechBaseMode.INNER_SPHERE) {
            setComponents(
              createDefaultComponentTechBases(TechBase.INNER_SPHERE),
            );
          } else if (next === TechBaseMode.CLAN) {
            setComponents(createDefaultComponentTechBases(TechBase.CLAN));
          }
        }}
        onComponentChange={(component, techBase) => {
          setComponents((prev) => ({ ...prev, [component]: techBase }));
        }}
      />
    );
  },
};
