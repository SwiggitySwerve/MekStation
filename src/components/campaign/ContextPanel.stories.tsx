import type { Meta, StoryObj } from '@storybook/react';
import { ContextPanel, ContextPanelMode, ContextPanelProps } from './ContextPanel';

const meta: Meta<typeof ContextPanel> = {
  title: 'Campaign/ContextPanel',
  component: ContextPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    mode: {
      control: 'select',
      options: Object.values(ContextPanelMode),
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContextPanel>;

const sampleSystemData = {
  name: 'Tharkad',
  faction: 'Lyran Commonwealth',
  population: 3_200_000_000,
  industrialRating: 'A+',
};

const sampleContractData = {
  name: 'Operation Iron Hammer',
  employer: 'Lyran Commonwealth',
  payment: 2_500_000,
  deadline: '3025-04-15',
  type: 'Raid',
};

const sampleMechData = {
  name: 'Atlas',
  variant: 'AS7-D',
  tonnage: 100,
  armorPercent: 87,
  status: 'Operational',
};

const samplePilotData = {
  name: 'Sarah Chen',
  callsign: 'Hammer',
  gunnery: 3,
  piloting: 4,
  wounds: 0,
};

export const Empty: Story = {
  args: {
    mode: ContextPanelMode.Empty,
  },
};

export const SystemDetails: Story = {
  args: {
    mode: ContextPanelMode.SystemDetails,
    systemData: sampleSystemData,
  },
};

export const SystemMinimal: Story = {
  args: {
    mode: ContextPanelMode.SystemDetails,
    systemData: {
      name: 'Solaris VII',
      faction: 'Free Worlds League',
    },
  },
};

export const ContractDetails: Story = {
  args: {
    mode: ContextPanelMode.ContractDetails,
    contractData: sampleContractData,
  },
};

export const ContractGarrison: Story = {
  args: {
    mode: ContextPanelMode.ContractDetails,
    contractData: {
      name: 'Garrison Duty - Coventry',
      employer: 'House Steiner',
      payment: 800_000,
      deadline: '3025-06-01',
      type: 'Garrison',
    },
  },
};

export const ContractRecon: Story = {
  args: {
    mode: ContextPanelMode.ContractDetails,
    contractData: {
      name: 'Deep Reconnaissance',
      employer: 'MIIO',
      payment: 1_200_000,
      deadline: '3025-05-20',
      type: 'Recon',
    },
  },
};

export const ContractEscort: Story = {
  args: {
    mode: ContextPanelMode.ContractDetails,
    contractData: {
      name: 'VIP Extraction',
      employer: 'ComStar',
      payment: 3_000_000,
      deadline: '3025-04-01',
      type: 'Escort',
    },
  },
};

export const MechStatus: Story = {
  args: {
    mode: ContextPanelMode.MechStatus,
    mechData: sampleMechData,
  },
};

export const MechDamaged: Story = {
  args: {
    mode: ContextPanelMode.MechStatus,
    mechData: {
      name: 'Marauder',
      variant: 'MAD-3R',
      tonnage: 75,
      armorPercent: 45,
      status: 'Damaged',
    },
  },
};

export const MechCritical: Story = {
  args: {
    mode: ContextPanelMode.MechStatus,
    mechData: {
      name: 'Locust',
      variant: 'LCT-1V',
      tonnage: 20,
      armorPercent: 12,
      status: 'Critical',
    },
  },
};

export const MechRepairing: Story = {
  args: {
    mode: ContextPanelMode.MechStatus,
    mechData: {
      name: 'Hunchback',
      variant: 'HBK-4G',
      tonnage: 50,
      armorPercent: 65,
      status: 'Repairing',
    },
  },
};

export const PilotStatus: Story = {
  args: {
    mode: ContextPanelMode.PilotStatus,
    pilotData: samplePilotData,
  },
};

export const PilotInjured: Story = {
  args: {
    mode: ContextPanelMode.PilotStatus,
    pilotData: {
      name: 'Marcus Webb',
      callsign: 'Deadeye',
      gunnery: 2,
      piloting: 3,
      wounds: 2,
    },
  },
};

export const PilotCriticallyWounded: Story = {
  args: {
    mode: ContextPanelMode.PilotStatus,
    pilotData: {
      name: 'Yuki Tanaka',
      callsign: 'Ghost',
      gunnery: 4,
      piloting: 4,
      wounds: 4,
    },
  },
};

export const PilotElite: Story = {
  args: {
    mode: ContextPanelMode.PilotStatus,
    pilotData: {
      name: 'Erik Larsen',
      callsign: 'Ironside',
      gunnery: 1,
      piloting: 2,
      wounds: 0,
    },
  },
};

export const InCampaignLayout: Story = {
  decorators: [
    (Story) => (
      <div className="bg-slate-900 p-4">
        <p className="text-slate-400 text-sm mb-4">
          As it would appear in CampaignLayout&apos;s contextPanelContent slot (120px height):
        </p>
        <div
          className="bg-slate-800 border-t border-slate-700"
          style={{ height: 120 }}
        >
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    mode: ContextPanelMode.SystemDetails,
    systemData: sampleSystemData,
  },
};

export const AllModes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-slate-400 text-sm mb-2">Empty Mode</p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
          <ContextPanel mode={ContextPanelMode.Empty} />
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-2">System Details</p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
          <ContextPanel mode={ContextPanelMode.SystemDetails} systemData={sampleSystemData} />
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-2">Contract Details</p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
          <ContextPanel mode={ContextPanelMode.ContractDetails} contractData={sampleContractData} />
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-2">Mech Status</p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
          <ContextPanel mode={ContextPanelMode.MechStatus} mechData={sampleMechData} />
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-2">Pilot Status</p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg" style={{ height: 120 }}>
          <ContextPanel mode={ContextPanelMode.PilotStatus} pilotData={samplePilotData} />
        </div>
      </div>
    </div>
  ),
  decorators: [],
};
