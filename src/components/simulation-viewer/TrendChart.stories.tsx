import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrendChart } from './TrendChart';

const meta: Meta<typeof TrendChart> = {
  title: 'Simulation/TrendChart',
  component: TrendChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TrendChart>;

function generateData(days: number, base: number, variance: number) {
  const now = new Date('2026-01-26');
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      value: base + Math.round((Math.random() - 0.5) * variance),
    };
  });
}

const weekData = generateData(7, 1200, 400);
const monthData = generateData(30, 1200, 400);
const quarterData = generateData(90, 1200, 400);

export const Default: Story = {
  args: {
    data: weekData,
    timeRange: '7d',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

const InteractiveTimeRange = () => {
  const [range, setRange] = useState('7d');
  const dataMap: Record<string, typeof weekData> = {
    '7d': weekData,
    '14d': generateData(14, 1200, 400),
    '30d': monthData,
    '60d': generateData(60, 1200, 400),
    '90d': quarterData,
  };
  return (
    <div className="max-w-2xl">
      <TrendChart
        data={dataMap[range] ?? weekData}
        timeRange={range}
        onTimeRangeChange={setRange}
        height={300}
      />
    </div>
  );
};

export const WithTimeRangeSelector: StoryObj = {
  render: () => <InteractiveTimeRange />,
};

export const WithThreshold: Story = {
  args: {
    data: weekData,
    timeRange: '7d',
    threshold: 1200,
    thresholdLabel: 'Target',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const EmptyState: Story = {
  args: {
    data: [],
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const SevenDays: Story = {
  args: {
    data: weekData,
    timeRange: '7d',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const ThirtyDays: Story = {
  args: {
    data: monthData,
    timeRange: '30d',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const NinetyDays: Story = {
  args: {
    data: quarterData,
    timeRange: '90d',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    data: weekData,
    timeRange: '7d',
    threshold: 1100,
    thresholdLabel: 'Minimum',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8 rounded-lg max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const MobileSize: Story = {
  args: {
    data: weekData,
    timeRange: '7d',
    height: 200,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const LargeValues: Story = {
  args: {
    data: generateData(14, 1500000, 500000),
    timeRange: '14d',
    threshold: 1200000,
    thresholdLabel: 'Budget',
    height: 300,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
