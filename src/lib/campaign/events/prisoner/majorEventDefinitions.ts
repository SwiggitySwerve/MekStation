import { PrisonerEventType } from '@/types/campaign/events/randomEventTypes';

import type { IPrisonerEventDefinition } from './minorEventDefinitions';

export const MAJOR_EVENT_DEFINITIONS: ReadonlyMap<
  PrisonerEventType,
  IPrisonerEventDefinition
> = new Map([
  [
    PrisonerEventType.BREAKOUT,
    {
      type: PrisonerEventType.BREAKOUT,
      title: 'Prisoner Breakout!',
      description:
        'A group of prisoners has broken out of the holding facility!',
      effects: [{ type: 'prisoner_escape', percentage: 0.2 }],
    },
  ],
  [
    PrisonerEventType.RIOT,
    {
      type: PrisonerEventType.RIOT,
      title: 'Prisoner Riot!',
      description: 'Prisoners have started a violent riot in the holding area!',
      effects: [
        { type: 'prisoner_casualty', count: 2 },
        {
          type: 'notification',
          message: 'Guards injured suppressing riot',
          severity: 'warning',
        },
      ],
    },
  ],
  [
    PrisonerEventType.MURDER,
    {
      type: PrisonerEventType.MURDER,
      title: 'Prisoner Murder',
      description:
        'A prisoner has been found dead. Suspected murder by fellow inmates.',
      effects: [
        { type: 'prisoner_casualty', count: 1 },
        {
          type: 'notification',
          message: 'Prisoner found dead in holding',
          severity: 'warning',
        },
      ],
    },
  ],
  [
    PrisonerEventType.FIRE,
    {
      type: PrisonerEventType.FIRE,
      title: 'Holding Facility Fire!',
      description: 'A fire has broken out in the prisoner holding area!',
      effects: [
        { type: 'prisoner_casualty', count: 3 },
        {
          type: 'financial',
          amount: -5000,
          description: 'Fire damage repairs',
        },
      ],
    },
  ],
  [
    PrisonerEventType.POISON,
    {
      type: PrisonerEventType.POISON,
      title: 'Poisoning Attempt',
      description: 'Someone tried to poison the prisoner water supply.',
      effects: [
        { type: 'prisoner_casualty', count: 1 },
        {
          type: 'financial',
          amount: -2000,
          description: 'Water decontamination',
        },
      ],
    },
  ],
  [
    PrisonerEventType.HOSTAGE,
    {
      type: PrisonerEventType.HOSTAGE,
      title: 'Hostage Situation',
      description: 'Prisoners have taken a guard hostage!',
      effects: [
        {
          type: 'notification',
          message: 'Guard taken hostage by prisoners!',
          severity: 'critical',
        },
        { type: 'morale_change', value: -3 },
      ],
    },
  ],
  [
    PrisonerEventType.ESCAPE_ROPE,
    {
      type: PrisonerEventType.ESCAPE_ROPE,
      title: 'Escape Rope Found',
      description:
        'Guards discover a makeshift rope hidden in the holding cells.',
      effects: [
        {
          type: 'notification',
          message: 'Escape attempt foiled - rope found',
          severity: 'warning',
        },
      ],
    },
  ],
  [
    PrisonerEventType.TUNNEL,
    {
      type: PrisonerEventType.TUNNEL,
      title: 'Escape Tunnel!',
      description:
        'An escape tunnel has been discovered under the holding facility!',
      effects: [
        { type: 'prisoner_escape', percentage: 0.1 },
        {
          type: 'financial',
          amount: -3000,
          description: 'Tunnel repair and security upgrade',
        },
      ],
    },
  ],
  [
    PrisonerEventType.UNDERCOVER,
    {
      type: PrisonerEventType.UNDERCOVER,
      title: 'Undercover Agent',
      description:
        'One of the prisoners reveals themselves as an intelligence operative.',
      effects: [
        {
          type: 'notification',
          message: 'Enemy intelligence agent discovered among prisoners',
          severity: 'warning',
        },
      ],
    },
  ],
  [
    PrisonerEventType.UNITED,
    {
      type: PrisonerEventType.UNITED,
      title: 'Prisoners United',
      description:
        'The prisoners have organized and present demands in unison.',
      effects: [
        { type: 'morale_change', value: -2 },
        {
          type: 'financial',
          amount: -1000,
          description: 'Prisoner demand concessions',
        },
      ],
    },
  ],
]);
