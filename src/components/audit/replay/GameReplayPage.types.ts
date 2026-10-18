import type { IBaseEvent } from '@/types/events';

import {
  type IEventMarker,
  type PlaybackSpeed,
  type PlaybackState,
} from '@/hooks/audit';

export type ReplayViewTab = 'timeline' | 'events';

export interface ReplayProjection {
  readonly playbackState: PlaybackState;
  readonly speed: PlaybackSpeed;
  readonly currentSequence: number;
  readonly currentEvent: IBaseEvent | null;
  readonly currentIndex: number;
  readonly totalEvents: number;
  readonly progress: number;
  readonly markers: readonly IEventMarker[];
  readonly play: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  readonly stepForward: () => void;
  readonly stepBackward: () => void;
  readonly jumpToIndex: (index: number) => void;
  readonly jumpToEvent: (eventId: string) => void;
  readonly setSpeed: (speed: PlaybackSpeed) => void;
  readonly seek: (progress: number) => void;
}
