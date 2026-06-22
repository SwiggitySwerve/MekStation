import Link from 'next/link';

import { GAMEPLAY_UI_FLOWS } from '@/qc/gameplayUiFlowShell';

import { Badge } from '../ui';

const visibilityLabel = {
  player: 'Player',
  gm: 'GM',
  both: 'Both',
} as const;

const visibilityClass = {
  player: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  gm: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  both: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
} as const;

export function GameplayFlowShell(): React.ReactElement {
  return (
    <section
      aria-labelledby="gameplay-flow-shell-heading"
      className="border-border-theme-subtle mb-8 border-y py-5"
      data-testid="gameplay-flow-shell"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            id="gameplay-flow-shell-heading"
            className="text-text-theme-primary text-xl font-semibold"
          >
            Validated Gameplay Flows
          </h2>
          <p className="text-text-theme-secondary mt-1 max-w-3xl text-sm">
            Journey-backed launch and inspection paths for player and GM
            operations.
          </p>
        </div>
        <Badge variant="cyan" size="md" pill>
          {GAMEPLAY_UI_FLOWS.length} journeys
        </Badge>
      </div>

      <div className="border-border-theme-subtle overflow-x-auto border">
        <table className="divide-border-theme-subtle min-w-full divide-y text-left text-sm">
          <thead className="bg-surface-base/40 text-text-theme-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Flow</th>
              <th className="px-4 py-3 font-medium">Route Sequence</th>
              <th className="px-4 py-3 font-medium">QC Command</th>
              <th className="px-4 py-3 font-medium">Inspection</th>
            </tr>
          </thead>
          <tbody className="divide-border-theme-subtle divide-y">
            {GAMEPLAY_UI_FLOWS.map((flow) => (
              <tr
                key={flow.journeyId}
                className="align-top"
                data-testid={`gameplay-flow-row-${flow.journeyId}`}
              >
                <td className="w-64 px-4 py-4">
                  <div className="space-y-2">
                    <div>
                      <div className="text-text-theme-primary font-medium">
                        {flow.displayName}
                      </div>
                      <div className="text-text-theme-muted font-mono text-xs">
                        {flow.journeyId}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="slate" size="sm">
                        {flow.module}
                      </Badge>
                      {flow.roleIntent.map((role) => (
                        <Badge
                          key={role}
                          variant={role === 'gm' ? 'amber' : 'cyan'}
                          size="sm"
                        >
                          {role === 'gm' ? 'GM' : 'Player'}
                        </Badge>
                      ))}
                    </div>
                    <Link
                      className="inline-flex text-sm font-medium !text-cyan-300 hover:!text-cyan-200 hover:underline"
                      href={flow.primaryAction.href}
                      data-testid={`gameplay-flow-action-${flow.journeyId}`}
                    >
                      {flow.primaryAction.label}
                    </Link>
                  </div>
                </td>
                <td className="min-w-[22rem] px-4 py-4">
                  <ol
                    className="flex flex-wrap gap-2"
                    data-testid={`gameplay-flow-checkpoints-${flow.journeyId}`}
                  >
                    {flow.checkpoints.map((checkpoint, index) => (
                      <li
                        key={checkpoint.id}
                        className={`rounded border px-2 py-1 ${visibilityClass[checkpoint.visibility]}`}
                        data-testid={`gameplay-flow-checkpoint-${flow.journeyId}-${checkpoint.id}`}
                      >
                        <span className="font-medium">
                          {index + 1}. {checkpoint.label}
                        </span>
                        <span className="ml-2 text-xs opacity-80">
                          {visibilityLabel[checkpoint.visibility]}
                        </span>
                        <div className="font-mono text-[11px] opacity-75">
                          {checkpoint.href}
                        </div>
                      </li>
                    ))}
                  </ol>
                </td>
                <td className="w-72 px-4 py-4">
                  <code className="text-text-theme-secondary bg-surface-raised rounded px-2 py-1 text-xs break-all">
                    {flow.qcCommand}
                  </code>
                </td>
                <td className="w-80 px-4 py-4">
                  <ul className="text-text-theme-secondary list-disc space-y-1 pl-4 text-sm">
                    {flow.inspectionNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
