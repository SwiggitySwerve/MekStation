import React from 'react';

interface ViewerSectionProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly count?: number;
  readonly headerAction?: React.ReactNode;
  readonly headingTestId?: string;
  readonly testId: string;
  readonly title: string;
}

export const ViewerSection: React.FC<ViewerSectionProps> = ({
  ariaLabel,
  children,
  className,
  count,
  headerAction,
  headingTestId = 'section-heading',
  testId,
  title,
}) => {
  const heading = (
    <h2
      className={`${headerAction ? '' : 'mb-3 '}text-lg font-semibold text-gray-800 dark:text-gray-200`}
      data-testid={headingTestId}
    >
      {title}
      {count !== undefined && count > 0 ? (
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
          ({count})
        </span>
      ) : null}
    </h2>
  );

  return (
    <section className={className} aria-label={ariaLabel} data-testid={testId}>
      {headerAction ? (
        <div className="mb-4 flex items-center justify-between">
          {heading}
          {headerAction}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
};
