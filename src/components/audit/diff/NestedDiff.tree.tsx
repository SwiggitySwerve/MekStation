/**
 * NestedDiff Component
 * Expandable tree view for nested object diffs with collapsible sections.
 * Shows path breadcrumbs and change count badges.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */
import React, { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/Badge';
import { SvgIcon } from '@/components/ui/SvgIcon';

import type { DiffTreeNode } from './NestedDiff.types';

import { DiffHighlight } from './DiffHighlight';
import { getMixedBadgeVariant } from './NestedDiff.model';

// =============================================================================
// Icons
// =============================================================================

function ChevronIcon({ expanded }: { expanded: boolean }): React.ReactElement {
  return (
    <SvgIcon
      size="control"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
      />
    </SvgIcon>
  );
}

function BranchIcon(): React.ReactElement {
  return (
    <SvgIcon
      size="inline"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className="text-text-theme-muted h-3.5 w-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
      />
    </SvgIcon>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface TreeNodeProps {
  node: DiffTreeNode;
  depth: number;
  defaultExpanded: boolean;
}

function TreeNode({
  node,
  depth,
  defaultExpanded,
}: TreeNodeProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.size > 0;
  const isLeaf = node.entry !== undefined;

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Indentation based on depth
  const indentStyle = { paddingLeft: `${depth * 16}px` };

  // If it's a pure leaf node (no children, has entry)
  if (isLeaf && !hasChildren && node.entry) {
    const entry = node.entry;
    return (
      <div
        className="hover:bg-surface-raised/30 flex items-center gap-2 py-1.5 transition-colors"
        style={indentStyle}
      >
        <span className="w-3.5" /> {/* Spacer for alignment */}
        <span className="text-text-theme-secondary font-mono text-xs">
          {node.name}:
        </span>
        <div className="flex items-center gap-2">
          {entry.changeType === 'modified' && entry.before !== undefined && (
            <>
              <DiffHighlight value={entry.before} changeType="removed" />
              <span className="text-text-theme-muted">→</span>
            </>
          )}
          <DiffHighlight
            value={entry.changeType === 'removed' ? entry.before : entry.after}
            changeType={entry.changeType}
          />
        </div>
      </div>
    );
  }

  // Branch node with children
  return (
    <div className="select-none">
      {/* Branch header */}
      <button
        onClick={toggleExpand}
        className={`hover:bg-surface-raised/30 flex w-full items-center gap-2 py-1.5 text-left transition-colors`}
        style={indentStyle}
      >
        <ChevronIcon expanded={expanded} />
        <BranchIcon />
        <span className="text-text-theme-primary font-mono text-sm font-medium">
          {node.name}
        </span>
        <Badge variant={getMixedBadgeVariant(node.changeTypes)} size="sm">
          {node.changeCount} {node.changeCount === 1 ? 'change' : 'changes'}
        </Badge>
      </button>

      {/* Children */}
      {expanded && (
        <div>
          {Array.from(node.children.values()).map((child) => (
            <TreeNode
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { ChevronIcon, TreeNode };
