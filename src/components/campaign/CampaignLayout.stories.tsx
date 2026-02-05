import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { CampaignLayout, CampaignLayoutProps } from './CampaignLayout';
import { StarmapDisplay, IStarSystem, FACTION_COLORS } from './StarmapDisplay';

const meta: Meta<typeof CampaignLayout> = {
  title: 'Campaign/CampaignLayout',
  component: CampaignLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-screen w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CampaignLayout>;

const factionNames = Object.keys(FACTION_COLORS);

function generateRandomSystems(
  count: number,
  spread: number = 500,
): IStarSystem[] {
  const systemNames = [
    'Terra',
    'Tharkad',
    'Luthien',
    'Sian',
    'Atreus',
    'New Avalon',
    'Solaris',
    'Hesperus',
    'Coventry',
    'Galax',
    'Robinson',
    'Tikonov',
  ];

  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread;
    const baseName = systemNames[i % systemNames.length];
    const suffix =
      i >= systemNames.length
        ? ` ${Math.floor(i / systemNames.length) + 1}`
        : '';

    return {
      id: `system-${i}`,
      name: `${baseName}${suffix}`,
      position: {
        x: Math.cos(angle) * distance + spread,
        y: Math.sin(angle) * distance + spread / 2,
      },
      faction: factionNames[Math.floor(Math.random() * factionNames.length)],
      population:
        Math.random() > 0.3
          ? Math.floor(Math.random() * 5_000_000_000) + 100_000
          : undefined,
    };
  });
}

const demoSystems = generateRandomSystems(50);

function MockRosterContent() {
  const pilots = [
    { name: 'Cmdr. Sarah Chen', mech: 'Atlas AS7-D', status: 'Ready' },
    { name: 'Lt. Marcus Webb', mech: 'Marauder MAD-3R', status: 'Ready' },
    { name: 'Sgt. Yuki Tanaka', mech: 'Wolverine WVR-6R', status: 'Injured' },
    { name: 'Cpl. Erik Larsen', mech: 'Locust LCT-1V', status: 'Ready' },
  ];

  return (
    <div className="space-y-2 p-3">
      {pilots.map((pilot) => (
        <div
          key={pilot.name}
          className="cursor-pointer rounded border border-slate-600 bg-slate-700/50 p-2 transition-colors hover:border-slate-500"
        >
          <div className="text-sm font-medium text-slate-200">{pilot.name}</div>
          <div className="text-xs text-slate-400">{pilot.mech}</div>
          <div
            className={`mt-1 text-xs ${pilot.status === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {pilot.status}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockEventsContent() {
  const events = [
    {
      type: 'Contract',
      title: 'Raid on Hesperus II',
      reward: '2,500,000 C-Bills',
    },
    { type: 'News', title: 'Lyran offensive stalls', reward: null },
    { type: 'Contract', title: 'Garrison Duty', reward: '800,000 C-Bills' },
  ];

  return (
    <div className="space-y-2 p-3">
      {events.map((event, i) => (
        <div
          key={i}
          className="cursor-pointer rounded border border-slate-600 bg-slate-700/50 p-2 transition-colors hover:border-slate-500"
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                event.type === 'Contract'
                  ? 'bg-amber-900 text-amber-300'
                  : 'bg-sky-900 text-sky-300'
              }`}
            >
              {event.type}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-slate-200">
            {event.title}
          </div>
          {event.reward && (
            <div className="mt-1 text-xs text-amber-400">{event.reward}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MockContextPanel({ systemName }: { systemName?: string }) {
  if (!systemName) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a system to view details
      </div>
    );
  }

  return (
    <div className="flex h-full gap-8 p-4">
      <div>
        <div className="text-xs tracking-wider text-slate-400 uppercase">
          System
        </div>
        <div className="text-lg font-semibold text-slate-100">{systemName}</div>
      </div>
      <div>
        <div className="text-xs tracking-wider text-slate-400 uppercase">
          Faction
        </div>
        <div className="text-sm text-sky-400">Lyran Commonwealth</div>
      </div>
      <div>
        <div className="text-xs tracking-wider text-slate-400 uppercase">
          Population
        </div>
        <div className="text-sm text-slate-200">3.2 Billion</div>
      </div>
      <div>
        <div className="text-xs tracking-wider text-slate-400 uppercase">
          Distance
        </div>
        <div className="text-sm text-slate-200">12 jumps (24 days)</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-500">
          Set Course
        </button>
        <button className="rounded bg-slate-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-500">
          View Contracts
        </button>
      </div>
    </div>
  );
}

const defaultProps: CampaignLayoutProps = {
  date: '3025-03-15',
  cBills: 12500000,
  morale: 85,
  reputation: 'Reliable',
  children: (
    <div className="flex h-full items-center justify-center bg-slate-950 text-slate-600">
      Map Area
    </div>
  ),
};

export const Default: Story = {
  args: {
    ...defaultProps,
    leftPanelContent: <MockRosterContent />,
    rightPanelContent: <MockEventsContent />,
    contextPanelContent: <MockContextPanel systemName="Tharkad" />,
  },
};

export const WithStarmap: Story = {
  render: function WithStarmapStory() {
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [selectedSystem, setSelectedSystem] = useState<string | undefined>(
      'system-0',
    );

    const selectedName = selectedSystem
      ? demoSystems.find((s) => s.id === selectedSystem)?.name
      : undefined;

    return (
      <CampaignLayout
        date="3025-03-15"
        cBills={12500000}
        morale={85}
        reputation="Reliable"
        leftPanelOpen={leftOpen}
        rightPanelOpen={rightOpen}
        onLeftPanelToggle={() => setLeftOpen(!leftOpen)}
        onRightPanelToggle={() => setRightOpen(!rightOpen)}
        leftPanelContent={<MockRosterContent />}
        rightPanelContent={<MockEventsContent />}
        contextPanelContent={<MockContextPanel systemName={selectedName} />}
      >
        <StarmapDisplay
          systems={demoSystems}
          selectedSystem={selectedSystem}
          onSystemClick={setSelectedSystem}
          className="h-full"
        />
      </CampaignLayout>
    );
  },
};

export const BothPanelsCollapsed: Story = {
  args: {
    ...defaultProps,
    leftPanelOpen: false,
    rightPanelOpen: false,
    leftPanelContent: <MockRosterContent />,
    rightPanelContent: <MockEventsContent />,
  },
};

export const LeftPanelOnly: Story = {
  args: {
    ...defaultProps,
    leftPanelOpen: true,
    rightPanelOpen: false,
    leftPanelContent: <MockRosterContent />,
    rightPanelContent: <MockEventsContent />,
  },
};

export const LowMorale: Story = {
  args: {
    ...defaultProps,
    morale: 25,
    cBills: 500000,
    reputation: 'Questionable',
    leftPanelContent: <MockRosterContent />,
    rightPanelContent: <MockEventsContent />,
  },
};

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);

    return (
      <CampaignLayout
        date="3025-03-15"
        cBills={12500000}
        morale={85}
        reputation="Reliable"
        leftPanelOpen={leftOpen}
        rightPanelOpen={rightOpen}
        onLeftPanelToggle={() => setLeftOpen(!leftOpen)}
        onRightPanelToggle={() => setRightOpen(!rightOpen)}
        leftPanelContent={<MockRosterContent />}
        rightPanelContent={<MockEventsContent />}
        contextPanelContent={<MockContextPanel systemName="New Avalon" />}
      >
        <div className="flex h-full items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="mb-2 text-sm text-slate-400">
              Click panel arrows to collapse/expand
            </div>
            <div className="text-xs text-slate-600">
              Left: {leftOpen ? 'Open' : 'Collapsed'} | Right:{' '}
              {rightOpen ? 'Open' : 'Collapsed'}
            </div>
          </div>
        </div>
      </CampaignLayout>
    );
  },
};
