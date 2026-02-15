import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

export function mapTechBase(tb: TechBase): 'IS' | 'Clan' | 'Mixed' {
  switch (tb) {
    case TechBase.CLAN:
      return 'Clan';
    case TechBase.INNER_SPHERE:
    default:
      return 'IS';
  }
}

export function mapWeightClass(
  wc: WeightClass,
): 'Light' | 'Medium' | 'Heavy' | 'Assault' {
  switch (wc) {
    case WeightClass.LIGHT:
      return 'Light';
    case WeightClass.MEDIUM:
      return 'Medium';
    case WeightClass.HEAVY:
      return 'Heavy';
    case WeightClass.ASSAULT:
      return 'Assault';
    default:
      return wc === WeightClass.ULTRALIGHT ? 'Light' : 'Assault';
  }
}
