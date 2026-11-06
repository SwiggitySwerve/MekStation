import type { IUnitContract } from '@/types/contracts';

import { Badge, Card, CardSection } from '@/components/ui';

interface IUnitQuirkSummaryProps {
  readonly quirks?: readonly string[];
  readonly weaponQuirks?: IUnitContract['weaponQuirks'];
  readonly badgeVariant?: 'purple' | 'violet';
  readonly className?: string;
}

function QuirkBadges({
  quirks,
  badgeVariant,
  badgeClassName,
}: {
  readonly quirks: readonly string[];
  readonly badgeVariant: IUnitQuirkSummaryProps['badgeVariant'];
  readonly badgeClassName?: string;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {quirks.map((quirk, index) => (
        <Badge key={index} variant={badgeVariant} className={badgeClassName}>
          {quirk}
        </Badge>
      ))}
    </div>
  );
}

/** Read-only source quirks; display does not imply implemented game effects. */
export function UnitQuirkSummary({
  quirks,
  weaponQuirks,
  badgeVariant = 'purple',
  className,
}: IUnitQuirkSummaryProps): React.ReactElement | null {
  const weaponRows = Object.entries(weaponQuirks ?? {}).filter(
    ([, ids]) => ids.length > 0,
  );
  const hasUnitQuirks = quirks != null && quirks.length > 0;
  if (!hasUnitQuirks && weaponRows.length === 0) return null;

  return (
    <Card variant="dark" className={className}>
      <CardSection title="Quirks" />
      {hasUnitQuirks && (
        <QuirkBadges quirks={quirks} badgeVariant={badgeVariant} />
      )}
      {weaponRows.length > 0 && (
        <div className={hasUnitQuirks ? 'mt-4 min-w-0' : 'min-w-0'}>
          <h4 className="text-text-theme-primary text-sm font-semibold">
            Weapon quirks
          </h4>
          <p className="text-text-theme-secondary mb-3 text-xs">
            Listed by source location:slot:name.
          </p>
          <ul aria-label="Weapon quirks" className="min-w-0 space-y-3">
            {weaponRows.map(([locator, ids]) => (
              <li key={locator} className="min-w-0">
                <p className="text-text-theme-secondary mb-1 font-mono text-xs [overflow-wrap:anywhere]">
                  {locator}
                </p>
                <QuirkBadges
                  quirks={ids}
                  badgeVariant={badgeVariant}
                  badgeClassName="max-w-full whitespace-normal! [overflow-wrap:anywhere]"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
