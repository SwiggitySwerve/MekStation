import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useEffect } from 'react';

import { useRepairStore } from '@/stores/useRepairStore';
import { PartQuality } from '@/types/campaign/quality';
import {
  DEFAULT_REPAIR_BAY,
  RepairJobStatus,
  RepairType,
  UnitLocation,
  type IRepairJob,
} from '@/types/repair';

import RepairBayPage from './RepairBayPage';

const campaignId = 'story-campaign';

const repairJobs: IRepairJob[] = [
  {
    id: 'repair-atlas-armor',
    unitId: 'unit-atlas-as7-d',
    unitName: 'Atlas AS7-D',
    campaignId,
    status: RepairJobStatus.Pending,
    priority: 1,
    createdAt: '2026-04-28T18:00:00.000Z',
    totalCost: 14500,
    totalTimeHours: 16,
    timeRemainingHours: 16,
    unitQuality: PartQuality.E,
    items: [
      {
        id: 'repair-ct-armor',
        type: RepairType.Armor,
        location: UnitLocation.CenterTorso,
        pointsToRestore: 22,
        cost: 2200,
        timeHours: 3,
        selected: true,
      },
      {
        id: 'repair-ra-structure',
        type: RepairType.Structure,
        location: UnitLocation.RightArm,
        pointsToRestore: 8,
        cost: 4000,
        timeHours: 8,
        selected: true,
      },
      {
        id: 'repair-small-laser',
        type: RepairType.ComponentReplace,
        location: UnitLocation.RightArm,
        componentName: 'Small Laser',
        cost: 8300,
        timeHours: 5,
        selected: false,
      },
    ],
  },
  {
    id: 'repair-centurion-engine',
    unitId: 'unit-centurion-cn9-a',
    unitName: 'Centurion CN9-A',
    campaignId,
    status: RepairJobStatus.InProgress,
    priority: 2,
    createdAt: '2026-04-27T15:00:00.000Z',
    startedAt: '2026-04-29T01:00:00.000Z',
    assignedTechId: 'tech-mara',
    totalCost: 37500,
    totalTimeHours: 42,
    timeRemainingHours: 18,
    unitQuality: PartQuality.D,
    items: [
      {
        id: 'repair-engine-hit',
        type: RepairType.ComponentRepair,
        location: UnitLocation.CenterTorso,
        componentName: 'Fusion Engine',
        cost: 30000,
        timeHours: 36,
        selected: true,
      },
      {
        id: 'repair-lt-structure',
        type: RepairType.Structure,
        location: UnitLocation.LeftTorso,
        pointsToRestore: 5,
        cost: 7500,
        timeHours: 6,
        selected: true,
      },
    ],
  },
  {
    id: 'repair-shadow-hawk',
    unitId: 'unit-shadow-hawk-shd-2h',
    unitName: 'Shadow Hawk SHD-2H',
    campaignId,
    status: RepairJobStatus.Completed,
    priority: 3,
    createdAt: '2026-04-26T14:00:00.000Z',
    startedAt: '2026-04-27T09:00:00.000Z',
    completedAt: '2026-04-28T12:00:00.000Z',
    totalCost: 6800,
    totalTimeHours: 9,
    timeRemainingHours: 0,
    unitQuality: PartQuality.D,
    items: [
      {
        id: 'repair-lrm-reload',
        type: RepairType.ComponentRepair,
        location: UnitLocation.LeftTorso,
        componentName: 'LRM 5 feed mechanism',
        cost: 6800,
        timeHours: 9,
        selected: true,
      },
    ],
  },
];

const RepairStoreDecorator: Decorator = (Story) => {
  useEffect(() => {
    useRepairStore.setState({
      jobsByCampaign: {
        [campaignId]: repairJobs,
      },
      baysByCampaign: {
        [campaignId]: {
          ...DEFAULT_REPAIR_BAY,
          activeJobs: ['repair-centurion-engine'],
          queuedJobs: ['repair-atlas-armor'],
        },
      },
      salvageByCampaign: {
        [campaignId]: { parts: [], totalValue: 0 },
      },
      selectedJobId: 'repair-atlas-armor',
      isLoading: false,
      error: null,
    });

    return () => {
      useRepairStore.setState({
        jobsByCampaign: {},
        baysByCampaign: {},
        salvageByCampaign: {},
        selectedJobId: null,
        isLoading: false,
        error: null,
      });
    };
  }, []);

  return <Story />;
};

const meta: Meta<typeof RepairBayPage> = {
  title: 'Gameplay/RepairBayPage',
  component: RepairBayPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextRouter: {
      pathname: '/gameplay/repair',
      query: { campaignId },
    },
  },
  decorators: [RepairStoreDecorator],
};

export default meta;
type Story = StoryObj<typeof RepairBayPage>;

export const PopulatedRepairBay: Story = {};

export const EmptyRepairBay: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useRepairStore.setState({
          jobsByCampaign: { [campaignId]: [] },
          baysByCampaign: { [campaignId]: { ...DEFAULT_REPAIR_BAY } },
          salvageByCampaign: {
            [campaignId]: { parts: [], totalValue: 0 },
          },
          selectedJobId: null,
          isLoading: false,
          error: null,
        });
      }, []);

      return <Story />;
    },
  ],
};
