import Link from 'next/link';
import React from 'react';

import { SettingsSection, SettingsSectionProps } from './SettingsShared';

export function AuditSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  return (
    <SettingsSection
      id="audit"
      title="Audit Log"
      description="View event history and system logs"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <div className="space-y-4">
        <p className="text-text-theme-secondary text-sm">
          Browse the full event history of your campaigns, pilots, and games.
          Track changes, review decisions, and replay past sessions.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/audit/timeline"
            className="bg-surface-raised/50 border-border-theme-subtle hover:bg-surface-raised hover:border-border-theme group flex items-center gap-3 rounded-lg border p-4 transition-all"
          >
            <div className="bg-accent/20 text-accent group-hover:bg-accent flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-text-theme-primary group-hover:text-accent text-sm font-medium transition-colors">
                Event Timeline
              </div>
              <div className="text-text-theme-muted text-xs">
                Browse all events
              </div>
            </div>
          </Link>

          <div className="bg-surface-raised/30 border-border-theme-subtle/50 flex items-center gap-3 rounded-lg border p-4 opacity-60">
            <div className="bg-surface-raised text-text-theme-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z"
                />
              </svg>
            </div>
            <div>
              <div className="text-text-theme-secondary text-sm font-medium">
                Replay Player
              </div>
              <div className="text-text-theme-muted text-xs">Coming soon</div>
            </div>
          </div>
        </div>

        <div className="border-border-theme-subtle border-t pt-4">
          <div className="text-text-theme-muted text-xs">
            <strong className="text-text-theme-secondary">Tip:</strong> You can
            also access event history from individual pilot and force detail
            pages.
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
