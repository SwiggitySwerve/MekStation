import { IGameEvent } from '@/types/gameplay';

export function serializeEvent(event: IGameEvent): string {
  return JSON.stringify(event);
}

export function deserializeEvent(json: string): IGameEvent {
  return JSON.parse(json) as IGameEvent;
}

export function serializeEvents(events: readonly IGameEvent[]): string {
  return JSON.stringify(events);
}

export function deserializeEvents(json: string): IGameEvent[] {
  return JSON.parse(json) as IGameEvent[];
}
