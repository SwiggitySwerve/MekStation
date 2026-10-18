/**
 * NestedDiff Component
 * Expandable tree view for nested object diffs with collapsible sections.
 * Shows path breadcrumbs and change count badges.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */
import React, { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/Badge';
import { IDiffEntry } from '@/hooks/audit';

import { DiffHighlight } from './DiffHighlight';
import { ChevronIcon } from './NestedDiff.tree';

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

export { GroupedView };
