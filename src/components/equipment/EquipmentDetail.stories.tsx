import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import { EquipmentDetail } from './EquipmentDetail';

const meta: Meta<typeof EquipmentDetail> = {
  title: 'Equipment/EquipmentDetail',
  component: EquipmentDetail,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Full-screen equipment detail panel with slide-in animation. Shows combat stats for weapons.',
      },
    },
    layout: 'fullscreen',
  },
  args: {
    onBack: fn(),
    onAssign: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-screen overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof EquipmentDetail>;

const mediumLaser = {
  id: 'medium-laser',
  name: 'Medium Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  weight: 1,
  criticalSlots: 1,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,
  costCBills: 40000,
  battleValue: 46,
  introductionYear: 2300,
};

const ppc = {
  id: 'ppc',
  name: 'Particle Projection Cannon',
  category: EquipmentCategory.ENERGY_WEAPON,
  weight: 7,
  criticalSlots: 3,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,
  costCBills: 200000,
  battleValue: 176,
  introductionYear: 2460,
};

const jumpJet = {
  id: 'jump-jet-standard',
  name: 'Jump Jet (Standard)',
  category: EquipmentCategory.MISC_EQUIPMENT,
  weight: 1,
  criticalSlots: 1,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,
  costCBills: 50000,
  battleValue: 0,
  introductionYear: 2471,
};

export const WeaponWithStats: Story = {
  args: {
    item: mediumLaser,
    weaponDetails: {
      damage: 5,
      range: '3/6/9',
      heat: 3,
    },
    description:
      'The Medium Laser is one of the most common weapons in the BattleMech arsenal. It offers an excellent balance of damage, heat, and weight.',
  },
};

export const HeavyWeapon: Story = {
  args: {
    item: ppc,
    weaponDetails: {
      damage: 10,
      range: '6/12/18',
      heat: 10,
    },
    description:
      'The Particle Projection Cannon is a powerful energy weapon that fires a concentrated beam of protons. It generates significant heat but deals devastating damage.',
  },
};

export const NonWeaponEquipment: Story = {
  args: {
    item: jumpJet,
    description:
      'Standard jump jets allow a Mech to make short jumps, improving mobility on rough terrain and enabling attacks from unexpected angles.',
  },
};

export const WithoutAssign: Story = {
  args: {
    item: mediumLaser,
    weaponDetails: {
      damage: 5,
      range: '3/6/9',
      heat: 3,
    },
    onAssign: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'View-only mode without assign button.',
      },
    },
  },
};

export const MinimalInfo: Story = {
  args: {
    item: {
      id: 'test-item',
      name: 'Test Equipment',
      category: EquipmentCategory.MISC_EQUIPMENT,
      weight: 2,
      criticalSlots: 2,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      costCBills: 10000,
      battleValue: 0,
      introductionYear: 3000,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Equipment without weapon stats or description.',
      },
    },
  },
};
