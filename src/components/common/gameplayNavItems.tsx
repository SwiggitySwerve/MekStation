import React from 'react';

import type { NavItemConfig } from './TopBarMenu';

import {
  CampaignIcon,
  EncounterIcon,
  ForceIcon,
  GameIcon,
  GameplayIcon,
  PilotIcon,
  QuickGameIcon,
} from './icons/NavigationIcons';

export interface GameplayHubItem extends NavItemConfig {
  readonly description: string;
}

export function getGameplayNavItems(): GameplayHubItem[] {
  return [
    {
      href: '/gameplay/quick',
      icon: <QuickGameIcon />,
      label: 'Quick Game',
      description: 'Start a standalone auto-resolve or playable skirmish.',
    },
    {
      href: '/gameplay/pilots',
      icon: <PilotIcon />,
      label: 'Pilots',
      description: 'Manage pilot rosters, skills, and assignments.',
    },
    {
      href: '/gameplay/forces',
      icon: <ForceIcon />,
      label: 'Forces',
      description: 'Organize lances, units, and campaign formations.',
    },
    {
      href: '/gameplay/campaigns',
      icon: <CampaignIcon />,
      label: 'Campaigns',
      description: 'Run persistent mercenary operations and contracts.',
    },
    {
      href: '/gameplay/encounters',
      icon: <EncounterIcon />,
      label: 'Encounters',
      description: 'Build and launch authored combat encounters.',
    },
    {
      href: '/gameplay/games',
      icon: <GameIcon />,
      label: 'Games',
      description: 'Resume active battles and review match history.',
    },
    {
      href: '/multiplayer',
      icon: <GameplayIcon />,
      label: 'Multiplayer',
      description: 'Host or join networked battles with room codes.',
    },
  ];
}
