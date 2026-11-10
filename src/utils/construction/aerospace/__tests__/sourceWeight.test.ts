import { cockpitTons, heatSinkExtraTons } from '../sourceWeight';

describe('source mass helpers', () => {
  it('retains standard and unknown cockpit defaults', () => {
    expect(cockpitTons('Standard')).toBe(3);
    expect(cockpitTons('UnknownCockpit')).toBe(3);
  });

  it('retains the existing cockpit masses', () => {
    expect(cockpitTons('Small')).toBe(2);
    expect(cockpitTons('Primitive')).toBe(5);
    expect(cockpitTons('Command Console')).toBe(6);
  });

  it('retains the ten free heat sinks', () => {
    expect(heatSinkExtraTons(5)).toBe(0);
    expect(heatSinkExtraTons(10)).toBe(0);
  });

  it('retains one ton per additional heat sink', () => {
    expect(heatSinkExtraTons(11)).toBe(1);
    expect(heatSinkExtraTons(20)).toBe(10);
  });
});
