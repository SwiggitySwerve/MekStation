import { formatContractSalvageShare } from '../missionContractDisplay';

describe('formatContractSalvageShare', () => {
  it('displays None only for zero salvage share', () => {
    expect(formatContractSalvageShare(0)).toBe('None');
  });

  it('displays the salvage percentage for non-zero shares', () => {
    expect(formatContractSalvageShare(43)).toBe('43%');
  });
});
