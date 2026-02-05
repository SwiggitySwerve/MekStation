import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { StarmapDisplay, IStarSystem, FACTION_COLORS } from './StarmapDisplay';

const meta: Meta<typeof StarmapDisplay> = {
  title: 'Campaign/StarmapDisplay',
  component: StarmapDisplay,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[700px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StarmapDisplay>;

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
    'Kathil',
    'Quentin',
    'Skye',
    'Donegal',
    'Tamarind',
    'Andurien',
    'Capella',
    'St. Ives',
    'Kentares',
    'Dieron',
    'Benjamin',
    'Pesht',
    'Tukayyid',
    'Huntress',
    'Strana Mechty',
    'Arc-Royal',
    'Outreach',
    'Northwind',
    'Galatea',
    'Canopus',
    'Taurus',
    'Detroit',
    'Gibson',
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

const hundredSystems = generateRandomSystems(100);

const clusteredSystems: IStarSystem[] = [
  {
    id: 'terra',
    name: 'Terra',
    position: { x: 400, y: 300 },
    faction: 'ComStar',
    population: 8_000_000_000,
  },
  {
    id: 'tharkad',
    name: 'Tharkad',
    position: { x: 200, y: 150 },
    faction: 'Lyran',
    population: 3_200_000_000,
  },
  {
    id: 'luthien',
    name: 'Luthien',
    position: { x: 600, y: 180 },
    faction: 'Kurita',
    population: 2_800_000_000,
  },
  {
    id: 'sian',
    name: 'Sian',
    position: { x: 550, y: 450 },
    faction: 'Liao',
    population: 2_100_000_000,
  },
  {
    id: 'atreus',
    name: 'Atreus',
    position: { x: 250, y: 400 },
    faction: 'Marik',
    population: 2_500_000_000,
  },
  {
    id: 'new-avalon',
    name: 'New Avalon',
    position: { x: 350, y: 500 },
    faction: 'Davion',
    population: 3_000_000_000,
  },
  {
    id: 'solaris',
    name: 'Solaris VII',
    position: { x: 380, y: 280 },
    faction: 'Independent',
    population: 1_500_000_000,
  },
  {
    id: 'outreach',
    name: 'Outreach',
    position: { x: 420, y: 320 },
    faction: 'Independent',
    population: 500_000_000,
  },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `minor-${i}`,
    name: `Minor World ${i + 1}`,
    position: {
      x: 300 + Math.cos(i * 0.5) * 150,
      y: 300 + Math.sin(i * 0.5) * 120,
    },
    faction: factionNames[i % factionNames.length],
    population: Math.floor(Math.random() * 500_000_000) + 1_000_000,
  })),
];

export const Default: Story = {
  args: {
    systems: hundredSystems,
    selectedSystem: undefined,
  },
};

export const WithSelection: Story = {
  args: {
    systems: clusteredSystems,
    selectedSystem: 'terra',
  },
};

export const InteractiveSelection: Story = {
  render: function InteractiveStory() {
    const [selected, setSelected] = useState<string | undefined>('terra');
    const [hovered, setHovered] = useState<string | null>(null);

    return (
      <div className="flex h-full flex-col">
        <div className="flex gap-4 bg-slate-800 p-2 text-sm text-white">
          <span>
            Selected: <strong>{selected ?? 'None'}</strong>
          </span>
          <span>
            Hovered: <strong>{hovered ?? 'None'}</strong>
          </span>
        </div>
        <div className="flex-1">
          <StarmapDisplay
            systems={clusteredSystems}
            selectedSystem={selected}
            onSystemClick={setSelected}
            onSystemHover={setHovered}
          />
        </div>
      </div>
    );
  },
};

export const FewSystems: Story = {
  args: {
    systems: [
      {
        id: '1',
        name: 'Alpha Centauri',
        position: { x: 200, y: 200 },
        faction: 'Davion',
        population: 5_000_000_000,
      },
      {
        id: '2',
        name: 'Proxima',
        position: { x: 300, y: 250 },
        faction: 'Lyran',
        population: 2_000_000_000,
      },
      {
        id: '3',
        name: 'Barnard',
        position: { x: 400, y: 180 },
        faction: 'Kurita',
        population: 800_000_000,
      },
      {
        id: '4',
        name: 'Wolf 359',
        position: { x: 350, y: 320 },
        faction: 'Liao',
      },
      {
        id: '5',
        name: 'Lalande',
        position: { x: 250, y: 350 },
        faction: 'Marik',
        population: 1_200_000_000,
      },
    ],
  },
};

export const MixedFactions: Story = {
  args: {
    systems: factionNames.map((faction, i) => ({
      id: `faction-${i}`,
      name: `${faction} Capital`,
      position: {
        x: 200 + (i % 5) * 100,
        y: 150 + Math.floor(i / 5) * 150,
      },
      faction,
      population: 2_000_000_000 + Math.random() * 3_000_000_000,
    })),
  },
};

export const LargeDataset: Story = {
  args: {
    systems: generateRandomSystems(500, 800),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Stress test with 500 systems. Use mouse wheel to zoom and drag to pan. Notice how LOD reduces label clutter at far zoom levels.',
      },
    },
  },
};

export const ZoomLevelsDemo: Story = {
  render: function ZoomDemo() {
    return (
      <div className="flex h-full flex-col gap-2 bg-slate-950 p-2">
        <div className="rounded bg-slate-800 p-2 text-sm text-white">
          <strong>LOD Demonstration:</strong> Start zoomed out to see minimal
          detail, then zoom in to reveal labels and population data.
          <ul className="mt-2 list-inside list-disc text-slate-300">
            <li>
              <strong>Far (zoom &lt; 30%):</strong> Dots only (5px)
            </li>
            <li>
              <strong>Medium (30-70%):</strong> Dots (8px) + major labels (pop
              &gt; 1B)
            </li>
            <li>
              <strong>Close (&gt; 70%):</strong> Full details - all labels,
              population, faction rings
            </li>
          </ul>
        </div>
        <div className="flex-1">
          <StarmapDisplay systems={clusteredSystems} />
        </div>
      </div>
    );
  },
};
