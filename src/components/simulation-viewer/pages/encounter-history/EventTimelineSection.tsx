import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { VirtualizedTimeline } from '@/components/simulation-viewer/VirtualizedTimeline';
import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IBattle } from './types';

import { getMaxTurn, resolveUnitName } from './types';

export interface IEventTimelineSectionProps {
  readonly battle: IBattle;
  readonly currentTurn: number;
  readonly onTurnChange: (turn: number) => void;
}

export const EventTimelineSection: React.FC<IEventTimelineSectionProps> = ({
  battle,
  currentTurn,
  onTurnChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [localTurn, setLocalTurn] = useState(currentTurn);
  const turnRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const maxTurn = useMemo(() => getMaxTurn(battle), [battle]);

  useEffect(() => {
    setLocalTurn(currentTurn);
  }, [currentTurn]);

  useEffect(() => {
    setLocalTurn(1);
    setIsPlaying(false);
  }, [battle]);

  useEffect(() => {
    if (!isPlaying || maxTurn === 0) return;
    const ms = 1000 / speed;
    const id = setInterval(() => {
      setLocalTurn((prev) => {
        if (prev >= maxTurn) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [isPlaying, speed, maxTurn]);

  useEffect(() => {
    if (isPlaying) {
      onTurnChange(localTurn);
      const el = turnRefs.current.get(localTurn);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [localTurn, isPlaying, onTurnChange]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (localTurn >= maxTurn && maxTurn > 0) {
        setLocalTurn(1);
        onTurnChange(1);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, localTurn, maxTurn, onTurnChange]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    const next = Math.min(localTurn + 1, Math.max(maxTurn, 1));
    setLocalTurn(next);
    onTurnChange(next);
  }, [maxTurn, localTurn, onTurnChange]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    const prev = Math.max(localTurn - 1, 1);
    setLocalTurn(prev);
    onTurnChange(prev);
  }, [localTurn, onTurnChange]);

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSpeed(Number(e.target.value));
    },
    [],
  );

  const handleEventClick = useCallback(
    (event: { turn: number }) => {
      setLocalTurn(event.turn);
      setIsPlaying(false);
      onTurnChange(event.turn);
    },
    [onTurnChange],
  );

  return (
    <section aria-label="Event timeline" data-testid="event-timeline-section">
      <h2
        className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Event Timeline
      </h2>
      <div
        className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
        data-testid="vcr-controls"
      >
        <button
          type="button"
          onClick={handleStepBack}
          disabled={localTurn <= 1}
          className={`min-h-[44px] rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${FOCUS_RING_CLASSES}`}
          aria-label="Step back"
          data-testid="vcr-step-back"
        >
          ⏮ Back
        </button>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={maxTurn === 0}
          className={`min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1 ${FOCUS_RING_CLASSES}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          data-testid="vcr-play-pause"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={handleStepForward}
          disabled={localTurn >= maxTurn}
          className={`min-h-[44px] rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:py-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${FOCUS_RING_CLASSES}`}
          aria-label="Step forward"
          data-testid="vcr-step-forward"
        >
          Next ⏭
        </button>
        <select
          value={speed}
          onChange={handleSpeedChange}
          className={`min-h-[44px] rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-700 md:min-h-0 md:py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
          aria-label="Playback speed"
          data-testid="vcr-speed-select"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
        <span
          className="ml-auto text-sm text-gray-600 dark:text-gray-400"
          aria-live="polite"
          aria-atomic="true"
          data-testid="vcr-turn-display"
        >
          Turn {localTurn} / {maxTurn}
        </span>
      </div>

      {battle.events.length === 0 ? (
        <p
          className="text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="empty-events"
        >
          No events recorded.
        </p>
      ) : (
        <div data-testid="event-list">
          <VirtualizedTimeline
            events={battle.events}
            height={384}
            itemHeight={52}
            onEventClick={handleEventClick}
            resolveUnitName={(unitId) => resolveUnitName(battle, unitId)}
          />
        </div>
      )}
    </section>
  );
};
