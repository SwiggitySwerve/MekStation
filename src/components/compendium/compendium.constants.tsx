import React from 'react';

import {
  StructureIcon,
  LightningIcon,
  ShieldIcon,
  FlameIcon,
  GyroIcon,
  RocketIcon,
  ListIcon,
} from './CompendiumIcons';

export interface RuleSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export const RULE_SECTIONS: RuleSection[] = [
  { id: 'structure', title: 'Structure', icon: <StructureIcon /> },
  { id: 'engine', title: 'Engine', icon: <LightningIcon /> },
  { id: 'armor', title: 'Armor', icon: <ShieldIcon /> },
  { id: 'heatsinks', title: 'Heat Sinks', icon: <FlameIcon /> },
  { id: 'gyro', title: 'Gyro', icon: <GyroIcon /> },
  { id: 'movement', title: 'Movement', icon: <RocketIcon /> },
  { id: 'criticals', title: 'Criticals', icon: <ListIcon /> },
];
