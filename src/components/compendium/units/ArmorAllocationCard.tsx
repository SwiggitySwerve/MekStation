import { Card, CardSection } from '@/components/ui';
import { type IArmorConfig, isArmorFrontRear } from '@/types/pages';

export function ArmorAllocationCard({
  armor,
}: {
  readonly armor?: IArmorConfig;
}): React.ReactElement | null {
  if (!armor?.allocation) return null;

  return (
    <Card variant="dark" className="mb-6">
      <CardSection title="Armor Allocation" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Object.entries(armor.allocation).map(([location, value]) => (
          <div
            key={location}
            className="bg-surface-raised/30 rounded-lg p-3 text-center"
          >
            <div className="text-text-theme-secondary mb-1 text-xs uppercase">
              {location.replace(/_/g, ' ')}
            </div>
            <div className="text-text-theme-primary font-mono">
              {typeof value === 'number' ? (
                value
              ) : isArmorFrontRear(value) ? (
                <>
                  {value.front}
                  {value.rear > 0 && (
                    <span className="text-text-theme-muted text-sm">
                      {' '}
                      / {value.rear}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
