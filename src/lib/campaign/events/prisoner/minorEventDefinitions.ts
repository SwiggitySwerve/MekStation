import type { IRandomEventEffect } from '@/types/campaign/events/randomEventTypes';

import { PrisonerEventType } from '@/types/campaign/events/randomEventTypes';

export interface IPrisonerEventDefinition {
  readonly type: PrisonerEventType;
  readonly title: string;
  readonly description: string;
  readonly effects: readonly IRandomEventEffect[];
}

export const MINOR_EVENT_DEFINITIONS: ReadonlyMap<
  PrisonerEventType,
  IPrisonerEventDefinition
> = new Map([
  [
    PrisonerEventType.ARGUMENT,
    {
      type: PrisonerEventType.ARGUMENT,
      title: 'Prisoner Argument',
      description:
        'Two prisoners got into a heated argument about who was right.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners arguing in holding area',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.WILD_STORIES,
    {
      type: PrisonerEventType.WILD_STORIES,
      title: 'Wild Stories',
      description: 'A prisoner entertains the guards with wild war stories.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner telling wild stories',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.CONVERSATIONS,
    {
      type: PrisonerEventType.CONVERSATIONS,
      title: 'Prisoner Conversations',
      description:
        'Some prisoners have been having quiet conversations about home.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners reminiscing about home',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.RATIONS,
    {
      type: PrisonerEventType.RATIONS,
      title: 'Rations Complaint',
      description: 'Prisoners are complaining about the quality of rations.',
      effects: [{ type: 'morale_change', value: -1 }],
    },
  ],
  [
    PrisonerEventType.TRADE,
    {
      type: PrisonerEventType.TRADE,
      title: 'Prisoner Trade',
      description:
        'Prisoners have been trading personal items among themselves.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners bartering with each other',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.VETERAN,
    {
      type: PrisonerEventType.VETERAN,
      title: 'Veteran Prisoner',
      description:
        'A veteran prisoner shares tactical insights that impress the guards.',
      effects: [
        {
          type: 'notification',
          message: 'Veteran prisoner shares war knowledge',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.GRAFFITI,
    {
      type: PrisonerEventType.GRAFFITI,
      title: 'Graffiti Found',
      description:
        'Guards discover graffiti scratched into the holding cell walls.',
      effects: [
        {
          type: 'notification',
          message: 'Graffiti found in prisoner holding',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.PRAYER,
    {
      type: PrisonerEventType.PRAYER,
      title: 'Prisoner Prayer',
      description: 'Prisoners hold a quiet prayer service together.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners holding prayer service',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.BARTERING,
    {
      type: PrisonerEventType.BARTERING,
      title: 'Bartering',
      description:
        'Prisoners attempt to barter with the guards for small comforts.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners trying to barter with guards',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.SONGS,
    {
      type: PrisonerEventType.SONGS,
      title: 'Prisoner Songs',
      description: 'The prisoners are singing their faction anthem.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners singing faction songs',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.PROPAGANDA,
    {
      type: PrisonerEventType.PROPAGANDA,
      title: 'Propaganda',
      description: 'A prisoner is spreading propaganda among the others.',
      effects: [{ type: 'morale_change', value: -1 }],
    },
  ],
  [
    PrisonerEventType.PLOTTING,
    {
      type: PrisonerEventType.PLOTTING,
      title: 'Plotting Overheard',
      description:
        'Guards overhear prisoners plotting something. Extra watch assigned.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner plotting detected',
          severity: 'warning',
        },
      ],
    },
  ],
  [
    PrisonerEventType.LETTER,
    {
      type: PrisonerEventType.LETTER,
      title: 'Letter Request',
      description:
        'A prisoner requests to write a letter to family. Permission granted.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner writes letter home',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.ILLNESS,
    {
      type: PrisonerEventType.ILLNESS,
      title: 'Prisoner Illness',
      description: 'A prisoner has fallen ill. Medical attention provided.',
      effects: [
        {
          type: 'financial',
          amount: -500,
          description: 'Prisoner medical treatment',
        },
      ],
    },
  ],
  [
    PrisonerEventType.PARANOIA,
    {
      type: PrisonerEventType.PARANOIA,
      title: 'Prisoner Paranoia',
      description: 'A prisoner is showing signs of paranoia and distrust.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner showing paranoid behavior',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.SINGING,
    {
      type: PrisonerEventType.SINGING,
      title: 'Singing',
      description: 'A prisoner sings quietly to themselves through the night.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner singing through the night',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.HOLIDAY,
    {
      type: PrisonerEventType.HOLIDAY,
      title: 'Holiday Observance',
      description: 'Prisoners observe a holiday from their faction calendar.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoners observe faction holiday',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.WHISPERS,
    {
      type: PrisonerEventType.WHISPERS,
      title: 'Whispers',
      description:
        'Hushed whispers among the prisoners. Guards increase patrols.',
      effects: [
        {
          type: 'notification',
          message: 'Increased whispering among prisoners',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.SENTIMENTAL_ITEM,
    {
      type: PrisonerEventType.SENTIMENTAL_ITEM,
      title: 'Sentimental Item',
      description:
        'A prisoner clutches a photo of loved ones. Guards allow it.',
      effects: [
        {
          type: 'notification',
          message: 'Prisoner cherishes personal memento',
          severity: 'info',
        },
      ],
    },
  ],
  [
    PrisonerEventType.PHOTO,
    {
      type: PrisonerEventType.PHOTO,
      title: 'Photo Discovered',
      description:
        "A prisoner's personal photo reveals information about their unit.",
      effects: [
        {
          type: 'notification',
          message: 'Intelligence found in prisoner photo',
          severity: 'info',
        },
      ],
    },
  ],
]);
