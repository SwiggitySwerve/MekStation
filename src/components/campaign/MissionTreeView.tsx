/**
 * MissionTreeView Component
 * Visual tree/timeline showing mission progression in a campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import React from 'react';

import { ICampaignMission, CampaignMissionStatus } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

interface MissionTreeViewProps {
  missions: readonly ICampaignMission[];
  currentMissionId: string | null;
  onMissionClick?: (mission: ICampaignMission) => void;
}

interface MissionNodeProps {
  mission: ICampaignMission;
  isCurrent: boolean;
  onClick?: () => void;
  showConnector?: boolean;
  isLast?: boolean;
  branchType?: 'victory' | 'defeat' | 'normal';
}

// =============================================================================
// Status Helpers
// =============================================================================

function getMissionStatusStyles(
  status: CampaignMissionStatus,
  isCurrent: boolean,
): {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
} {
  if (isCurrent) {
    return {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500 ring-2 ring-amber-500/30',
      text: 'text-amber-400',
      icon: (
        <svg
          className="h-4 w-4 animate-pulse"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    };
  }

  switch (status) {
    case CampaignMissionStatus.Victory:
      return {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500',
        text: 'text-emerald-400',
        icon: (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
      };
    case CampaignMissionStatus.Defeat:
      return {
        bg: 'bg-red-500/20',
        border: 'border-red-500',
        text: 'text-red-400',
        icon: (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
      };
    case CampaignMissionStatus.Available:
      return {
        bg: 'bg-cyan-500/20',
        border: 'border-cyan-500/50',
        text: 'text-cyan-400',
        icon: (
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
      };
    case CampaignMissionStatus.InProgress:
      return {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500',
        text: 'text-amber-400',
        icon: (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ),
      };
    case CampaignMissionStatus.Locked:
    case CampaignMissionStatus.Skipped:
    default:
      return {
        bg: 'bg-surface-raised/50',
        border: 'border-border-theme-subtle',
        text: 'text-text-theme-muted',
        icon: (
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      };
  }
}

// =============================================================================
// Mission Node Component
// =============================================================================

function MissionNode({
  mission,
  isCurrent,
  onClick,
  showConnector = true,
  isLast = false,
  branchType,
}: MissionNodeProps): React.ReactElement {
  const styles = getMissionStatusStyles(mission.status, isCurrent);
  const isClickable =
    onClick && mission.status !== CampaignMissionStatus.Locked;

  return (
    <div className="relative flex items-start">
      {/* Vertical connector line */}
      {showConnector && !isLast && (
        <div
          className={`absolute top-10 left-5 h-full w-0.5 ${
            mission.status === CampaignMissionStatus.Victory ||
            mission.status === CampaignMissionStatus.Defeat
              ? styles.border.replace('border-', 'bg-')
              : 'bg-border-theme-subtle'
          }`}
        />
      )}

      {/* Branch indicator */}
      {branchType && (
        <div className="absolute top-3 -left-4 text-xs font-medium">
          {branchType === 'victory' && (
            <span className="text-emerald-400">WIN</span>
          )}
          {branchType === 'defeat' && (
            <span className="text-red-400">LOSS</span>
          )}
        </div>
      )}

      {/* Node */}
      <div
        className={`flex flex-1 items-center gap-3 rounded-lg p-3 transition-all ${
          styles.bg
        } border ${styles.border} ${
          isClickable
            ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg'
            : mission.status === CampaignMissionStatus.Locked
              ? 'opacity-50'
              : ''
        }`}
        onClick={isClickable ? onClick : undefined}
        data-testid={`mission-node-${mission.id}`}
        data-mission-id={mission.id}
      >
        {/* Status icon */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.bg} ${styles.text}`}
        >
          {styles.icon}
        </div>

        {/* Mission info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`truncate font-medium ${styles.text}`}>
              {mission.name}
            </h4>
            {mission.isFinal && (
              <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-violet-400 uppercase">
                Final
              </span>
            )}
          </div>
          <p className="text-text-theme-muted mt-0.5 truncate text-xs">
            {mission.description}
          </p>
        </div>

        {/* Order number */}
        <div className="text-text-theme-muted text-xs">#{mission.order}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MissionTreeView({
  missions,
  currentMissionId,
  onMissionClick,
}: MissionTreeViewProps): React.ReactElement {
  // Sort missions by order
  const sortedMissions = [...missions].sort((a, b) => a.order - b.order);

  // Build tree structure with branches
  const buildTree = () => {
    const mainPath: ICampaignMission[] = [];
    const branches: Map<
      string,
      { mission: ICampaignMission; type: 'victory' | 'defeat' }[]
    > = new Map();

    // Identify main path (missions without "defeat" branch condition leading to them)
    for (const mission of sortedMissions) {
      const isDefeatBranch = sortedMissions.some((m) =>
        m.branches.some(
          (b) => b.targetMissionId === mission.id && b.condition === 'defeat',
        ),
      );

      if (!isDefeatBranch) {
        mainPath.push(mission);
      }
    }

    // Group branch missions
    for (const mission of sortedMissions) {
      for (const branch of mission.branches) {
        const targetMission = sortedMissions.find(
          (m) => m.id === branch.targetMissionId,
        );
        if (targetMission && branch.condition !== 'special') {
          const existingBranches = branches.get(mission.id) || [];
          existingBranches.push({
            mission: targetMission,
            type: branch.condition as 'victory' | 'defeat',
          });
          branches.set(mission.id, existingBranches);
        }
      }
    }

    return { mainPath, branches };
  };

  const { mainPath, branches } = buildTree();

  if (missions.length === 0) {
    return (
      <div className="text-text-theme-muted py-8 text-center">
        <svg
          className="mx-auto mb-3 h-12 w-12 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p>No missions defined yet</p>
        <p className="mt-1 text-sm">
          Add missions to see the campaign structure
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pl-4" data-testid="mission-tree">
      {mainPath.map((mission, index) => {
        const missionBranches = branches.get(mission.id);
        const isLast = index === mainPath.length - 1 && !missionBranches;

        return (
          <div key={mission.id}>
            <MissionNode
              mission={mission}
              isCurrent={mission.id === currentMissionId}
              onClick={
                onMissionClick ? () => onMissionClick(mission) : undefined
              }
              showConnector={true}
              isLast={isLast}
            />

            {/* Show branches */}
            {missionBranches && missionBranches.length > 0 && (
              <div className="border-border-theme-subtle mt-2 ml-8 space-y-2 border-l-2 border-dashed pl-4">
                {missionBranches.map((branch) => (
                  <MissionNode
                    key={branch.mission.id}
                    mission={branch.mission}
                    isCurrent={branch.mission.id === currentMissionId}
                    onClick={
                      onMissionClick
                        ? () => onMissionClick(branch.mission)
                        : undefined
                    }
                    showConnector={false}
                    branchType={branch.type}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default MissionTreeView;
