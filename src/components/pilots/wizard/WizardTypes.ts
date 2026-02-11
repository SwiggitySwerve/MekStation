/**
 * Pilot Creation Wizard - Types, Constants & Utilities
 *
 * Shared type definitions, constants, and utility functions
 * used across wizard step components.
 */

import React from 'react';

import {
  PilotExperienceLevel,
  IPilotIdentity,
  IPilotSkills,
  DEFAULT_PILOT_SKILLS,
  GUNNERY_IMPROVEMENT_COSTS,
  PILOTING_IMPROVEMENT_COSTS,
} from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

export type CreationMode = 'template' | 'custom' | 'random' | 'statblock';
export type WizardStep = 'mode' | 'identity' | 'skills' | 'review';

export interface WizardState {
  mode: CreationMode | null;
  identity: IPilotIdentity;
  templateLevel: PilotExperienceLevel;
  customSkills: IPilotSkills;
  randomSkills: IPilotSkills | null;
  statblockSkills: IPilotSkills;
}

export interface PilotCreationWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Called when the wizard is closed */
  onClose: () => void;
  /** Called when a pilot is successfully created */
  onCreated?: (pilotId: string | null) => void;
}

// =============================================================================
// Constants
// =============================================================================

export const INITIAL_STATE: WizardState = {
  mode: null,
  identity: { name: '' },
  templateLevel: PilotExperienceLevel.Regular,
  customSkills: { ...DEFAULT_PILOT_SKILLS },
  randomSkills: null,
  statblockSkills: { ...DEFAULT_PILOT_SKILLS },
};

export const MODE_INFO: Record<
  CreationMode,
  { title: string; description: string; icon: React.ReactNode }
> = {
  template: {
    title: 'Template',
    description:
      'Quick creation using experience level presets. Perfect for starting campaigns.',
    icon: React.createElement(
      'svg',
      {
        className: 'h-6 w-6',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
        d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      }),
    ),
  },
  custom: {
    title: 'Custom',
    description:
      'Build your pilot from scratch with point-buy skill allocation.',
    icon: React.createElement(
      'svg',
      {
        className: 'h-6 w-6',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
        d: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      }),
    ),
  },
  random: {
    title: 'Random',
    description: 'Generate a pilot with randomized skills. Let fate decide.',
    icon: React.createElement(
      'svg',
      {
        className: 'h-6 w-6',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
        d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      }),
    ),
  },
  statblock: {
    title: 'Statblock',
    description:
      'Quick NPC creation without persistence. For one-off encounters.',
    icon: React.createElement(
      'svg',
      {
        className: 'h-6 w-6',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
        d: 'M13 10V3L4 14h7v7l9-11h-7z',
      }),
    ),
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

export function generateRandomSkills(): IPilotSkills {
  // Generate skills with weighted distribution (Regular is most common)
  const roll = Math.random();
  let gunnery: number;
  let piloting: number;

  if (roll < 0.1) {
    // 10% Elite
    gunnery = 2 + Math.floor(Math.random() * 2); // 2-3
    piloting = 3 + Math.floor(Math.random() * 2); // 3-4
  } else if (roll < 0.35) {
    // 25% Veteran
    gunnery = 3 + Math.floor(Math.random() * 2); // 3-4
    piloting = 4 + Math.floor(Math.random() * 2); // 4-5
  } else if (roll < 0.75) {
    // 40% Regular
    gunnery = 4 + Math.floor(Math.random() * 2); // 4-5
    piloting = 5 + Math.floor(Math.random() * 2); // 5-6
  } else {
    // 25% Green
    gunnery = 5 + Math.floor(Math.random() * 2); // 5-6
    piloting = 6 + Math.floor(Math.random() * 2); // 6-7
  }

  return { gunnery, piloting };
}

export function calculatePointCost(skills: IPilotSkills): number {
  // Calculate total "points spent" improving from baseline 4/5
  let cost = 0;

  // Gunnery improvements from 4
  for (let i = DEFAULT_PILOT_SKILLS.gunnery; i > skills.gunnery; i--) {
    cost += GUNNERY_IMPROVEMENT_COSTS[i] || 0;
  }

  // Piloting improvements from 5
  for (let i = DEFAULT_PILOT_SKILLS.piloting; i > skills.piloting; i--) {
    cost += PILOTING_IMPROVEMENT_COSTS[i] || 0;
  }

  return cost;
}
