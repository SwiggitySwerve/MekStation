import {
  BIPED_CONFIGURATION,
  LAM_CONFIGURATION,
  QUADVEE_CONFIGURATION,
  configurationRegistry,
  MechConfiguration,
  MechLocation,
  QuadVeeMode,
} from '../MechConfigurationSystem';

const standardLocationIds = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
];

describe('configurationRegistry', () => {
  it('preserves configuration lookup and biped fallback behavior', () => {
    expect(configurationRegistry.getConfiguration(MechConfiguration.LAM)).toBe(
      LAM_CONFIGURATION,
    );
    expect(
      configurationRegistry.getConfiguration('unknown' as MechConfiguration),
    ).toBe(BIPED_CONFIGURATION);
  });

  it('exposes the expected location and mode facade behavior', () => {
    expect(
      configurationRegistry.getValidLocations(MechConfiguration.BIPED),
    ).toEqual(BIPED_CONFIGURATION.locations.map((location) => location.id));
    expect(
      configurationRegistry.getLocationDefinition(
        MechConfiguration.BIPED,
        MechLocation.CENTER_TORSO,
      )?.hasRearArmor,
    ).toBe(true);
    expect(
      configurationRegistry.getQuadVeeModeDefinition(QuadVeeMode.VEHICLE)
        ?.movementType,
    ).toBe('tracked');
    expect(configurationRegistry.getMaxTonnage(MechConfiguration.LAM)).toBe(55);
  });

  it('keeps standard head and torso definitions equivalent but unshared', () => {
    for (const config of [
      BIPED_CONFIGURATION,
      LAM_CONFIGURATION,
      QUADVEE_CONFIGURATION,
    ]) {
      expect(
        config.locations.slice(0, 4).map((location) => location.id),
      ).toEqual(standardLocationIds);
    }

    expect(BIPED_CONFIGURATION.locations[0]).not.toBe(
      LAM_CONFIGURATION.locations[0],
    );
  });
});
