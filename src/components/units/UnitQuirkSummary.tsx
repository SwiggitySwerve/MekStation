import { Badge, Card, CardSection } from '@/components/ui';

interface IUnitQuirkSummaryProps {
  readonly quirks?: readonly string[];
  readonly badgeVariant?: 'purple' | 'violet';
  readonly className?: string;
}

/** Read-only source quirks; display does not imply implemented game effects. */
export function UnitQuirkSummary({
  quirks,
  badgeVariant = 'purple',
  className,
}: IUnitQuirkSummaryProps): React.ReactElement | null {
  if (!quirks || quirks.length === 0) return null;

  return (
    <Card variant="dark" className={className}>
      <CardSection title="Quirks" />
      <div className="flex flex-wrap gap-2">
        {quirks.map((quirk, index) => (
          <Badge key={index} variant={badgeVariant}>
            {quirk}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
