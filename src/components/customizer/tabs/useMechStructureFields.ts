import type { UnitStore } from '@/stores/useUnitStore';

import { useUnitStore } from '@/stores/useUnitStore';

export function useMechStructureFields(): Pick<
  UnitStore,
  | 'engineType'
  | 'engineRating'
  | 'gyroType'
  | 'internalStructureType'
  | 'cockpitType'
> {
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);

  return {
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
  };
}
