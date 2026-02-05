import type { Meta, StoryObj } from '@storybook/react';

import type { IAnomaly } from '@/types/simulation-viewer';

import { AnomalyAlertCard } from './AnomalyAlertCard';

const meta: Meta<typeof AnomalyAlertCard> = {
  title: 'Simulation/AnomalyAlertCard',
  component: AnomalyAlertCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AnomalyAlertCard>;

const criticalAnomaly: IAnomaly = {
  id: 'anom-001',
  type: 'invariant-violation',
  severity: 'critical',
  battleId: 'battle-100',
  turn: 5,
  unitId: 'unit-001',
  message:
    'Negative armor value detected on Atlas AS7-D left torso (-3 points)',
  snapshot: { armor: { leftTorso: -3 } },
  timestamp: Date.now(),
};

const warningWithConfig: IAnomaly = {
  id: 'anom-002',
  type: 'heat-suicide',
  severity: 'warning',
  battleId: 'battle-200',
  turn: 8,
  unitId: 'unit-002',
  message: 'Atlas AS7-D generated 35 heat in a single turn (threshold: 30)',
  thresholdUsed: 30,
  actualValue: 35,
  configKey: 'heatSuicideThreshold',
  timestamp: Date.now(),
};

const warningNoConfig: IAnomaly = {
  id: 'anom-003',
  type: 'passive-unit',
  severity: 'warning',
  battleId: 'battle-300',
  turn: 12,
  unitId: 'unit-003',
  message: 'Hunchback HBK-4G did not fire weapons for 5 consecutive turns',
  timestamp: Date.now(),
};

const infoAnomaly: IAnomaly = {
  id: 'anom-004',
  type: 'long-game',
  severity: 'info',
  battleId: 'battle-400',
  turn: null,
  unitId: null,
  message:
    'Game exceeded 50 turns without resolution — possible stalemate detected',
  timestamp: Date.now(),
};

const actionHandlers = {
  onViewSnapshot: (a: IAnomaly) => alert(`View snapshot for ${a.id}`),
  onViewBattle: (id: string) => alert(`View battle ${id}`),
  onConfigureThreshold: (key: string) => alert(`Configure ${key}`),
  onDismiss: (id: string) => alert(`Dismissed ${id}`),
};

export const Critical: Story = {
  args: {
    anomaly: criticalAnomaly,
    ...actionHandlers,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export const WarningWithThresholdConfig: Story = {
  args: {
    anomaly: warningWithConfig,
    ...actionHandlers,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export const WarningWithoutConfigKey: Story = {
  args: {
    anomaly: warningNoConfig,
    ...actionHandlers,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export const Info: Story = {
  args: {
    anomaly: infoAnomaly,
    onViewBattle: actionHandlers.onViewBattle,
    onDismiss: actionHandlers.onDismiss,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export const DarkModeCritical: Story = {
  args: {
    anomaly: criticalAnomaly,
    ...actionHandlers,
  },
  decorators: [
    (Story) => (
      <div className="dark max-w-xl rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const DarkModeWarning: Story = {
  args: {
    anomaly: warningWithConfig,
    ...actionHandlers,
  },
  decorators: [
    (Story) => (
      <div className="dark max-w-xl rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const DarkModeInfo: Story = {
  args: {
    anomaly: infoAnomaly,
    onViewBattle: actionHandlers.onViewBattle,
    onDismiss: actionHandlers.onDismiss,
  },
  decorators: [
    (Story) => (
      <div className="dark max-w-xl rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const AllSeverities: StoryObj = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <AnomalyAlertCard anomaly={criticalAnomaly} {...actionHandlers} />
      <AnomalyAlertCard anomaly={warningWithConfig} {...actionHandlers} />
      <AnomalyAlertCard
        anomaly={infoAnomaly}
        onViewBattle={actionHandlers.onViewBattle}
        onDismiss={actionHandlers.onDismiss}
      />
    </div>
  ),
};

export const AllSeveritiesDark: StoryObj = {
  render: () => (
    <div className="dark max-w-xl space-y-4 rounded-lg bg-gray-900 p-8">
      <AnomalyAlertCard anomaly={criticalAnomaly} {...actionHandlers} />
      <AnomalyAlertCard anomaly={warningWithConfig} {...actionHandlers} />
      <AnomalyAlertCard
        anomaly={infoAnomaly}
        onViewBattle={actionHandlers.onViewBattle}
        onDismiss={actionHandlers.onDismiss}
      />
    </div>
  ),
};
