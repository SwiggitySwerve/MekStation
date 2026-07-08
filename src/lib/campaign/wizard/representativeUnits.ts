import { WeightClass } from '@/types/enums/WeightClass';

export interface IWizardRepresentativeUnit {
  readonly weightClass: WeightClass;
  readonly unitRef: string;
  readonly unitName: string;
}

export const WIZARD_REPRESENTATIVE_UNITS: readonly IWizardRepresentativeUnit[] =
  Object.freeze([
    {
      weightClass: WeightClass.LIGHT,
      unitRef: 'locust-lct-1v',
      unitName: 'Locust LCT-1V',
    },
    {
      weightClass: WeightClass.MEDIUM,
      unitRef: 'hunchback-hbk-4g',
      unitName: 'Hunchback HBK-4G',
    },
    {
      weightClass: WeightClass.HEAVY,
      unitRef: 'marauder-mad-3r',
      unitName: 'Marauder MAD-3R',
    },
    {
      weightClass: WeightClass.ASSAULT,
      unitRef: 'atlas-as7-d',
      unitName: 'Atlas AS7-D',
    },
  ]);
