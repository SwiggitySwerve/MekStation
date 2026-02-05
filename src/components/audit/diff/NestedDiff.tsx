/**
 * NestedDiff Component
 * Expandable tree view for nested object diffs with collapsible sections.
 * Shows path breadcrumbs and change count badges.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import { Badge } from '@/components/ui/Badge';
import { IDiffEntry, DiffChangeType } from '@/hooks/audit';

import { DiffHighlight } from './DiffHighlight';

// =============================================================================
// Types
// =============================================================================

export interface NestedDiffProps {
  /** Array of diff entries to display */
  entries: IDiffEntry[];
  /** Whether to group entries by top-level path */
  groupByPath?: boolean;
  /** Whether sections are expanded by default */
  defaultExpanded?: boolean;
  /** Optional additional className */
  className?: string;
}

interface DiffTreeNode {
  /** The path segment name */
  name: string;
  /** Full path to this node */
  fullPath: string;
  /** Child nodes */
  children: Map<string, DiffTreeNode>;
  /** Leaf entry if this node is a value */
  entry?: IDiffEntry;
  /** Count of changes in this subtree */
  changeCount: number;
  /** Types of changes in this subtree */
  changeTypes: Set<DiffChangeType>;
}

// =============================================================================
// Icons
// =============================================================================

function ChevronIcon({ expanded }: { expanded: boolean }): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function BranchIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="text-text-theme-muted h-3.5 w-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
      />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a tree structure from flat diff entries.
 */
function buildDiffTree(entries: IDiffEntry[]): DiffTreeNode {
  const root: DiffTreeNode = {
    name: 'root',
    fullPath: '',
    children: new Map(),
    changeCount: 0,
    changeTypes: new Set(),
  };

  for (const entry of entries) {
    if (entry.changeType === 'unchanged') continue;

    // Split path into segments
    const segments = entry.path.split(/[.[\]]+/).filter(Boolean);
    let current = root;

    // Build tree path
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const fullPath = segments.slice(0, i + 1).join('.');

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          fullPath,
          children: new Map(),
          changeCount: 0,
          changeTypes: new Set(),
        });
      }

      current = current.children.get(segment)!;
    }

    // Set entry at leaf
    current.entry = entry;

    // Propagate change counts up the tree
    const pathSegments = entry.path.split(/[.[\]]+/).filter(Boolean);
    let walkCurrent = root;

    for (const segment of pathSegments) {
      walkCurrent.changeCount++;
      walkCurrent.changeTypes.add(entry.changeType);
      walkCurrent = walkCurrent.children.get(segment)!;
    }
    walkCurrent.changeCount++;
    walkCurrent.changeTypes.add(entry.changeType);
  }

  return root;
}

/**
 * Group entries by their top-level path segment.
 */
function groupByTopLevel(entries: IDiffEntry[]): Map<string, IDiffEntry[]> {
  const groups = new Map<string, IDiffEntry[]>();

  for (const entry of entries) {
    if (entry.changeType === 'unchanged') continue;

    const topLevel = entry.path.split(/[.[\]]/)[0] || 'root';
    if (!groups.has(topLevel)) {
      groups.set(topLevel, []);
    }
    groups.get(topLevel)!.push(entry);
  }

  return groups;
}

/**
 * Get badge variant for change type.
 */
function getChangeTypeBadgeVariant(
  changeType: DiffChangeType,
): 'emerald' | 'red' | 'amber' | 'slate' {
  switch (changeType) {
    case 'added':
      return 'emerald';
    case 'removed':
      return 'red';
    case 'modified':
      return 'amber';
    default:
      return 'slate';
  }
}

/**
 * Get summary badge variant for mixed changes.
 */
function getMixedBadgeVariant(
  types: Set<DiffChangeType>,
): 'emerald' | 'red' | 'amber' | 'violet' {
  if (types.size > 1) return 'violet';
  const type = Array.from(types)[0];
  return getChangeTypeBadgeVariant(type) as
    | 'emerald'
    | 'red'
    | 'amber'
    | 'violet';
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

interface GroupedViewProps {
  groups: Map<string, IDiffEntry[]>;
  defaultExpanded: boolean;
}

function GroupedView({
  groups,
  defaultExpanded,
}: GroupedViewProps): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from(groups.entries()).map(([groupName, entries]) => (
        <GroupSection
          key={groupName}
          name={groupName}
          entries={entries}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

interface GroupSectionProps {
  name: string;
  entries: IDiffEntry[];
  defaultExpanded: boolean;
}

function GroupSection({
  name,
  entries,
  defaultExpanded,
}: GroupSectionProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const summary = useMemo(() => {
    const counts = { added: 0, removed: 0, modified: 0 };
    for (const entry of entries) {
      if (entry.changeType in counts) {
        counts[entry.changeType as keyof typeof counts]++;
      }
    }
    return counts;
  }, [entries]);

  return (
    <div className="border-border-theme-subtle/50 overflow-hidden rounded-lg border">
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className={`bg-surface-raised/50 hover:bg-surface-raised/70 flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors`}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon expanded={expanded} />
          <span className="text-text-theme-primary font-mono text-sm font-semibold">
            {name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {summary.added > 0 && (
            <Badge variant="emerald" size="sm">
              +{summary.added}
            </Badge>
          )}
          {summary.removed > 0 && (
            <Badge variant="red" size="sm">
              -{summary.removed}
            </Badge>
          )}
          {summary.modified > 0 && (
            <Badge variant="amber" size="sm">
              ~{summary.modified}
            </Badge>
          )}
        </div>
      </button>

      {/* Entries */}
      {expanded && (
        <div className="divide-border-theme-subtle/30 divide-y">
          {entries.map((entry) => (
            <EntryRow key={entry.path} entry={entry} groupName={name} />
          ))}
        </div>
      )}
    </div>
  );
}

interface EntryRowProps {
  entry: IDiffEntry;
  groupName: string;
}

function EntryRow({ entry, groupName }: EntryRowProps): React.ReactElement {
  // Get relative path (remove group prefix)
  const relativePath = entry.path.startsWith(groupName)
    ? entry.path.slice(groupName.length).replace(/^[.[\]]/, '')
    : entry.path;

  return (
    <div className="hover:bg-surface-base/30 flex items-center justify-between gap-3 px-3 py-2 transition-colors">
      {/* Path breadcrumb */}
      <div className="flex min-w-0 items-center gap-1.5">
        <code className="text-text-theme-muted truncate font-mono text-xs">
          {relativePath || '(root)'}
        </code>
      </div>

      {/* Values */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {entry.changeType === 'modified' && entry.before !== undefined && (
          <>
            <DiffHighlight value={entry.before} changeType="removed" />
            <span className="text-text-theme-muted text-sm">→</span>
          </>
        )}
        {entry.changeType === 'removed' ? (
          <DiffHighlight value={entry.before} changeType="removed" />
        ) : (
          <DiffHighlight value={entry.after} changeType={entry.changeType} />
        )}
      </div>
    </div>
  );
}

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="mb-3 h-12 w-12 opacity-50"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
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

export default NestedDiff;
