import React from 'react';

interface ICardProps {
  readonly title: string;
  readonly testid: string;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
  /** Honest origin text — solo FIFO is not the shared log. */
  readonly headerNote?: string;
  readonly headerNoteTestId?: string;
}

export function DashboardCard({
  title,
  testid,
  children,
  footer,
  headerNote,
  headerNoteTestId,
}: ICardProps): React.ReactElement {
  return (
    <section
      data-testid={testid}
      className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/60 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        {title}
      </h3>
      {headerNote ? (
        <p
          data-testid={headerNoteTestId}
          className="-mt-2 mb-3 text-xs text-slate-400"
        >
          {headerNote}
        </p>
      ) : null}
      <div className="flex-1">{children}</div>
      {footer ? (
        <div className="mt-3 border-t border-slate-700 pt-3">{footer}</div>
      ) : null}
    </section>
  );
}
