/**
 * Campaign Layout - Civilization-style 3-panel layout
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │ [Date] [C-Bills] [Morale] [Rep]            [≡ Menu]    │ <- HUD Bar (48px)
 * ├─────────┬─────────────────────────────────┬─────────────┤
 * │ ROSTER  │                                 │ EVENTS      │
 * │ (slot)  │       MAP AREA (children)       │ (slot)      │ <- Side panels (280px / 40px collapsed)
 * ├─────────┴─────────────────────────────────┴─────────────┤
 * │ CONTEXT PANEL (slot)                                    │ <- Context panel (120px)
 * └─────────────────────────────────────────────────────────┘
 */

import React from 'react';

const PANEL_WIDTH_OPEN = 280;
const PANEL_WIDTH_COLLAPSED = 40;
const HUD_HEIGHT = 48;
const CONTEXT_PANEL_HEIGHT = 120;

export interface CampaignLayoutProps {
  /** Current date string, e.g., "3025-03-15" */
  date: string;
  /** Current C-Bills balance */
  cBills: number;
  /** Morale percentage (0-100) */
  morale: number;
  /** Reputation level, e.g., "Reliable" */
  reputation: string;

  /** Content slot for left panel (Roster) */
  leftPanelContent?: React.ReactNode;
  /** Content slot for right panel (Events/Contracts) */
  rightPanelContent?: React.ReactNode;
  /** Content slot for bottom context panel */
  contextPanelContent?: React.ReactNode;
  /** Main content (Map area) */
  children: React.ReactNode;

  /** Is left panel expanded */
  leftPanelOpen?: boolean;
  /** Is right panel expanded */
  rightPanelOpen?: boolean;
  /** Callback when left panel toggle is clicked */
  onLeftPanelToggle?: () => void;
  /** Callback when right panel toggle is clicked */
  onRightPanelToggle?: () => void;

  /** Optional className for root container */
  className?: string;
}

function formatCBills(value: number): string {
  return value.toLocaleString('en-US');
}

function getMoraleColor(morale: number): string {
  if (morale >= 70) return 'text-emerald-400';
  if (morale >= 40) return 'text-amber-400';
  return 'text-red-400';
}

interface HudBarProps {
  date: string;
  cBills: number;
  morale: number;
  reputation: string;
}

function HudBar({
  date,
  cBills,
  morale,
  reputation,
}: HudBarProps): React.ReactElement {
  return (
    <div
      className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4"
      style={{ height: HUD_HEIGHT }}
      data-testid="hud-bar"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-slate-500 uppercase">
            Date
          </span>
          <span className="font-mono text-sm text-slate-200">{date}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-slate-500 uppercase">
            C-Bills
          </span>
          <span className="font-mono text-sm font-semibold text-amber-400">
            {formatCBills(cBills)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-slate-500 uppercase">
            Morale
          </span>
          <span
            className={`font-mono text-sm font-semibold ${getMoraleColor(morale)}`}
          >
            {morale}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wider text-slate-500 uppercase">
            Rep
          </span>
          <span className="text-sm font-medium text-sky-400">{reputation}</span>
        </div>
      </div>

      <button
        type="button"
        className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        aria-label="Menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}

interface SidePanelProps {
  title: string;
  side: 'left' | 'right';
  isOpen: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  testId: string;
}

function SidePanel({
  title,
  side,
  isOpen,
  onToggle,
  children,
  testId,
}: SidePanelProps): React.ReactElement {
  const isLeft = side === 'left';

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden border-slate-700 bg-slate-800 transition-all duration-300 ease-in-out ${isLeft ? 'border-r' : 'border-l'} `}
      style={{ width: isOpen ? PANEL_WIDTH_OPEN : PANEL_WIDTH_COLLAPSED }}
      data-testid={testId}
    >
      {isOpen ? (
        <div className="flex h-full flex-col">
          <div
            className={`bg-slate-850 flex items-center gap-2 border-b border-slate-700 px-3 py-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'} `}
          >
            <button
              type="button"
              onClick={onToggle}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
              aria-label={`Collapse ${title}`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isLeft ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                />
              </svg>
            </button>
            <h3 className="flex-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {title}
            </h3>
          </div>

          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
          aria-label={`Expand ${title}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isLeft ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
            />
          </svg>
          <span
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {title}
          </span>
        </button>
      )}
    </div>
  );
}

export function CampaignLayout({
  date,
  cBills,
  morale,
  reputation,
  leftPanelContent,
  rightPanelContent,
  contextPanelContent,
  children,
  leftPanelOpen = true,
  rightPanelOpen = true,
  onLeftPanelToggle,
  onRightPanelToggle,
  className = '',
}: CampaignLayoutProps): React.ReactElement {
  return (
    <div className={`flex h-full flex-col bg-slate-900 ${className}`}>
      <HudBar
        date={date}
        cBills={cBills}
        morale={morale}
        reputation={reputation}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidePanel
          title="Roster"
          side="left"
          isOpen={leftPanelOpen}
          onToggle={onLeftPanelToggle}
          testId="left-panel"
        >
          {leftPanelContent}
        </SidePanel>

        <div className="relative flex-1 overflow-hidden" data-testid="map-area">
          {children}
        </div>

        <SidePanel
          title="Events"
          side="right"
          isOpen={rightPanelOpen}
          onToggle={onRightPanelToggle}
          testId="right-panel"
        >
          {rightPanelContent}
        </SidePanel>
      </div>

      <div
        className="overflow-hidden border-t border-slate-700 bg-slate-800"
        style={{ height: CONTEXT_PANEL_HEIGHT }}
        data-testid="context-panel"
      >
        {contextPanelContent ?? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Select a system or unit to view details
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignLayout;
