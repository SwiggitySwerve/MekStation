import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { vehicleMotiveErrors } from '../motiveCompatibility';

// Hector Road Train Tractor (mm-data HB HM), a wheeled LargeSupportTank with
// ISInfraredImager in front: pinned Java reports
// "Satellite Imager (Infrared Imager) is incompatible with Wheeled"
// (TestSupportVehicle.java:1171-1174; TestTank.legalForMotiveType:522-526).
const imager = [{ equipmentId: 'ISInfraredImager' }];

describe('vehicle motive compatibility (TestTank.legalForMotiveType)', () => {
  it('reports the Hector imager on a wheeled support vehicle in Java wording', () => {
    expect(vehicleMotiveErrors(imager, GroundMotionType.WHEELED, true)).toEqual(
      ['Satellite Imager (Infrared Imager) is incompatible with Wheeled'],
    );
  });

  it('adds the combat-vehicle period and Java mode names (TestTank.java:376-382)', () => {
    expect(vehicleMotiveErrors(imager, GroundMotionType.MAGLEV, false)).toEqual(
      ['Satellite Imager (Infrared Imager) is incompatible with MagLev.'],
    );
  });

  it('accepts the imager on a VTOL and unrestricted or unknown items anywhere', () => {
    expect(vehicleMotiveErrors(imager, GroundMotionType.VTOL, false)).toEqual(
      [],
    );
    expect(
      vehicleMotiveErrors(
        [{ equipmentId: 'Medium Laser' }, { equipmentId: 'Not A Real Item' }],
        GroundMotionType.WHEELED,
        true,
      ),
    ).toEqual([]);
  });
});
