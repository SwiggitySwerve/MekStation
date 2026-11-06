import aquila from '../../../public/data/units/aerospace/Aquila AQA-1M.json';
import nagasawa from '../../../public/data/units/capital/Nagasawa.json';
import arrowIVCarrier from '../../../public/data/units/vehicles/Arrow IV Carrier.json';

/** Actual committed source labels and maps, shared by detail display proofs. */
export const QUIRK_SUMMARY_UNITS = [
  { label: 'Aquila AQA-1M', family: 'aerospace', unit: aquila },
  { label: 'Nagasawa', family: 'capital', unit: nagasawa },
  { label: 'Arrow IV Carrier', family: 'vehicles', unit: arrowIVCarrier },
] as const;
