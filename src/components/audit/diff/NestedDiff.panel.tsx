/**
 * NestedDiff Component
 * Expandable tree view for nested object diffs with collapsible sections.
 * Shows path breadcrumbs and change count badges.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */
import React, { useMemo } from 'react';

import { SvgIcon } from '@/components/ui/SvgIcon';

import type { NestedDiffProps } from './NestedDiff.types';

import { GroupedView } from './NestedDiff.groups';
import { buildDiffTree, groupByTopLevel } from './NestedDiff.model';
import { TreeNode } from './NestedDiff.tree';

// =============================================================================
// Main Component
// =============================================================================

export function NestedDiff({
  entries,
  groupByPath = true,
  defaultExpanded = true,
  className = '',
}: NestedDiffProps): React.ReactElement {
  // Filter out unchanged entries
  const changedEntries = useMemo(
    () => entries.filter((e) => e.changeType !== 'unchanged'),
    [entries],
  );

  // Build tree or groups
  const tree = useMemo(() => buildDiffTree(changedEntries), [changedEntries]);
  const groups = useMemo(
    () => groupByTopLevel(changedEntries),
    [changedEntries],
  );

  // Empty state
  if (changedEntries.length === 0) {
    return (
      <div
        className={`text-text-theme-muted flex flex-col items-center justify-center py-8 ${className}`}
      >
        <SvgIcon
          size="hero"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="mb-3 h-12 w-12 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </SvgIcon>
        <p className="text-sm font-medium">No Changes</p>
        <p className="mt-1 text-xs">States are identical</p>
      </div>
    );
  }

  return (
    <div className={`font-mono text-sm ${className}`}>
      {groupByPath ? (
        <GroupedView groups={groups} defaultExpanded={defaultExpanded} />
      ) : (
        <div className="border-border-theme-subtle/50 overflow-hidden rounded-lg border">
          {Array.from(tree.children.values()).map((child) => (
            <TreeNode
              key={child.fullPath}
              node={child}
              depth={0}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
