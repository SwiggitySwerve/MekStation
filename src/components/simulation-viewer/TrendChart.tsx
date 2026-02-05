import React, { useState, useCallback, useRef, memo } from 'react';

import type {
  ITrendChartProps,
  ITrendDataPoint,
} from '@/components/simulation-viewer/types';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';
import { useIsMobile } from '@/utils/responsive';

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
const DEFAULT_TIME_RANGE_OPTIONS = ['7d', '14d', '30d', '60d', '90d'];

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(val % 1 === 0 ? 0 : 1);
}

function computeNiceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const range = max - min;
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

const EmptyState: React.FC = () => (
  <div
    className="flex h-full flex-col items-center justify-center text-center"
    data-testid="trend-chart-empty"
  >
    <div className="mb-4 text-4xl">📊</div>
    <p className="mb-2 text-gray-500 dark:text-gray-400">No data available</p>
    <p className="text-sm text-gray-400 dark:text-gray-500">
      Data will appear after first simulation
    </p>
  </div>
);

interface TooltipState {
  x: number;
  y: number;
  point: ITrendDataPoint;
}

export const TrendChart = memo<ITrendChartProps>(
  ({
    data,
    timeRange,
    timeRangeOptions = DEFAULT_TIME_RANGE_OPTIONS,
    onTimeRangeChange,
    threshold,
    thresholdLabel,
    height: heightProp,
    className = '',
  }) => {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const isMobile = useIsMobile();

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (!data || data.length === 0 || !svgRef.current) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;

        const plotWidth = svgWidth - CHART_PADDING.left - CHART_PADDING.right;
        const mouseX = e.clientX - rect.left - CHART_PADDING.left;

        const xDivisor = data.length > 1 ? data.length - 1 : 1;
        const index = Math.round((mouseX / plotWidth) * xDivisor);
        const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
        const point = data[clampedIndex];

        const values = data.map((d) => d.value);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const valRange = maxVal - minVal || 1;
        const plotHeight = svgHeight - CHART_PADDING.top - CHART_PADDING.bottom;

        const px = CHART_PADDING.left + (clampedIndex / xDivisor) * plotWidth;
        const py =
          CHART_PADDING.top +
          plotHeight -
          ((point.value - minVal) / valRange) * plotHeight;

        setTooltip({ x: px, y: py, point });
      },
      [data],
    );

    const handleMouseLeave = useCallback(() => setTooltip(null), []);

    const containerClasses = [
      'relative w-full bg-white dark:bg-gray-800 rounded-lg p-4',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const isEmpty = !data || data.length === 0;

    return (
      <div
        className={containerClasses}
        style={{ height: heightProp }}
        data-testid="trend-chart"
      >
        {onTimeRangeChange && (
          <div
            className="absolute top-4 right-4 z-10"
            data-testid="time-range-container"
          >
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className={`min-h-[44px] rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 md:min-h-0 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${FOCUS_RING_CLASSES}`}
              aria-label="Time range"
              data-testid="time-range-select"
            >
              {timeRangeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {isEmpty ? (
          <EmptyState />
        ) : (
          <ChartSVG
            data={data}
            threshold={threshold}
            thresholdLabel={thresholdLabel}
            tooltip={tooltip}
            svgRef={svgRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            isMobile={isMobile}
          />
        )}
      </div>
    );
  },
);

TrendChart.displayName = 'TrendChart';

interface ChartSVGProps {
  data: ITrendDataPoint[];
  threshold?: number;
  thresholdLabel?: string;
  tooltip: TooltipState | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave: () => void;
  isMobile: boolean;
}

const ChartSVG: React.FC<ChartSVGProps> = ({
  data,
  threshold,
  thresholdLabel,
  tooltip,
  svgRef,
  onMouseMove,
  onMouseLeave,
  isMobile,
}) => {
  const viewBoxWidth = 600;
  const viewBoxHeight = 300;

  const plotLeft = CHART_PADDING.left;
  const plotTop = CHART_PADDING.top;
  const plotWidth = viewBoxWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = viewBoxHeight - CHART_PADDING.top - CHART_PADDING.bottom;

  const values = data.map((d) => d.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  if (threshold !== undefined) {
    minVal = Math.min(minVal, threshold);
    maxVal = Math.max(maxVal, threshold);
  }

  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  const valRange = maxVal - minVal;

  const xDivisor = data.length > 1 ? data.length - 1 : 1;
  const toX = (i: number) => plotLeft + (i / xDivisor) * plotWidth;
  const toY = (v: number) =>
    plotTop + plotHeight - ((v - minVal) / valRange) * plotHeight;

  const linePath = data
    .map(
      (d, i) =>
        `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(d.value).toFixed(2)}`,
    )
    .join(' ');

  const yTicks = computeNiceTicks(minVal, maxVal, isMobile ? 3 : 5);

  const maxXLabels = isMobile ? 3 : 6;
  const xStep = Math.max(1, Math.floor(data.length / maxXLabels));
  const xIndices = data
    .map((_, i) => i)
    .filter((i) => i % xStep === 0 || i === data.length - 1);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) {
          const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
          } as React.MouseEvent<SVGSVGElement>;
          onMouseMove(mouseEvent);
        }
      }}
      onTouchEnd={onMouseLeave}
      role="img"
      aria-label={`Trend chart showing ${data.length} data points from ${formatDateLabel(data[0].date)} to ${formatDateLabel(data[data.length - 1].date)}`}
      data-testid="trend-chart-svg"
    >
      <title>{`Trend chart: ${data.length} data points`}</title>
      {yTicks.map((tick) => (
        <line
          key={`grid-${tick}`}
          x1={plotLeft}
          y1={toY(tick)}
          x2={plotLeft + plotWidth}
          y2={toY(tick)}
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="1"
          data-testid="grid-line"
        />
      ))}

      {yTicks.map((tick) => (
        <text
          key={`ylabel-${tick}`}
          x={plotLeft - 8}
          y={toY(tick) + 4}
          textAnchor="end"
          className="fill-gray-500 text-[11px] dark:fill-gray-400"
          data-testid="y-label"
        >
          {formatValue(tick)}
        </text>
      ))}

      {xIndices.map((i) => (
        <text
          key={`xlabel-${i}`}
          x={toX(i)}
          y={plotTop + plotHeight + 24}
          textAnchor="middle"
          className="fill-gray-500 text-[11px] dark:fill-gray-400"
          data-testid="x-label"
        >
          {formatDateLabel(data[i].date)}
        </text>
      ))}

      {threshold !== undefined && (
        <>
          <line
            x1={plotLeft}
            y1={toY(threshold)}
            x2={plotLeft + plotWidth}
            y2={toY(threshold)}
            className="stroke-red-500 dark:stroke-red-400"
            strokeWidth="1"
            strokeDasharray="4"
            data-testid="threshold-line"
          />
          {thresholdLabel && (
            <text
              x={plotLeft + plotWidth - 4}
              y={toY(threshold) - 6}
              textAnchor="end"
              className="fill-red-500 text-[10px] font-medium dark:fill-red-400"
              data-testid="threshold-label"
            >
              {thresholdLabel}
            </text>
          )}
        </>
      )}

      <path
        d={linePath}
        fill="none"
        className="stroke-blue-600 dark:stroke-blue-400"
        strokeWidth={isMobile ? 3 : 2}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-testid="chart-line"
      />

      {data.map((d, i) => (
        <circle
          key={`dot-${i}`}
          cx={toX(i)}
          cy={toY(d.value)}
          r={isMobile ? 5 : 3}
          className="fill-blue-600 dark:fill-blue-400"
          data-testid="data-point"
        />
      ))}

      {tooltip && (
        <>
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r="5"
            className="fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-gray-900"
            strokeWidth="2"
            data-testid="tooltip-dot"
          />
          <foreignObject
            x={tooltip.x + 10}
            y={tooltip.y - 40}
            width="140"
            height="50"
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <div
              className="pointer-events-none rounded-md bg-gray-900/90 px-3 py-2 text-sm whitespace-nowrap text-white"
              data-testid="tooltip"
            >
              <div className="font-medium">
                {formatDateLabel(tooltip.point.date)}
              </div>
              <div>{formatValue(tooltip.point.value)}</div>
            </div>
          </foreignObject>
        </>
      )}
    </svg>
  );
};
