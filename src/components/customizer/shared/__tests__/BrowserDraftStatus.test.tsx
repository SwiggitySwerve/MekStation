import { act, fireEvent, render, screen } from '@testing-library/react';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import {
  clearAllVehicleStores,
  createAndRegisterVehicle,
} from '@/stores/vehicleStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { BrowserDraftStatus } from '../BrowserDraftStatus';

describe('BrowserDraftStatus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    clearAllVehicleStores();
    localStorage.clear();
  });

  it.each([
    [UnitType.VEHICLE, 'megamek-vehicle'],
    [UnitType.AEROSPACE, 'megamek-aerospace'],
    [UnitType.BATTLE_ARMOR, 'megamek-battlearmor'],
    [UnitType.INFANTRY, 'megamek-infantry'],
    [UnitType.PROTOMECH, 'megamek-protomech'],
  ])('shows restored and failed drafts for %s', (unitType, prefix) => {
    const unitId = `restored-${prefix}`;
    const key = `${prefix}-${unitId}`;
    localStorage.setItem(key, '{"state":{}}');
    render(<BrowserDraftStatus unitId={unitId} unitType={unitType} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full');
    });
    act(() => {
      expect(() => clientSafeStorage.setItem(key, '{}')).toThrow('full');
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'failed');
    act(() => clientSafeStorage.setItem(key, '{}'));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
  });

  it('switches receipt identity when the same id changes unit family', () => {
    const unitId = 'same-id-different-family';
    const { rerender } = render(
      <BrowserDraftStatus unitId={unitId} unitType={UnitType.VEHICLE} />,
    );
    act(() => clientSafeStorage.setItem(`megamek-vehicle-${unitId}`, '{}'));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
    rerender(
      <BrowserDraftStatus unitId={unitId} unitType={UnitType.INFANTRY} />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'pending');
    act(() => clientSafeStorage.setItem(`megamek-vehicle-${unitId}`, '{}'));
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'pending');
  });

  it('retries a failed vehicle draft through the vehicle store', () => {
    const unitId = '12345678-1234-4234-8234-123456789abc';
    const store = createAndRegisterVehicle({
      id: unitId,
      name: 'Draft vehicle',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    render(<BrowserDraftStatus unitId={unitId} unitType={UnitType.VEHICLE} />);
    const failure = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('full');
      });
    act(() => {
      expect(() => store.setState({ year: 3040 })).toThrow('full');
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'failed');
    failure.mockRestore();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry Browser Draft' }),
    );
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
    expect(
      JSON.parse(localStorage.getItem(`megamek-vehicle-${unitId}`)!).state.year,
    ).toBe(3040);
  });

  it('recognizes a restored draft without writing and updates when switching units', () => {
    localStorage.setItem(
      'megamek-unit-restored',
      '{"state":{"id":"restored"}}',
    );
    const write = jest.spyOn(Storage.prototype, 'setItem');
    const { rerender } = render(<BrowserDraftStatus unitId="restored" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'saved');
    rerender(<BrowserDraftStatus unitId="never-written" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'pending');
    rerender(<BrowserDraftStatus unitId="restored" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in browser',
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('does not claim a saved draft when storage cannot be read', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    render(<BrowserDraftStatus unitId="unreadable" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'pending');
  });

  it('keeps a failed write visible even when an older draft exists', () => {
    localStorage.setItem('megamek-unit-restored-failed', '{"state":{}}');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full');
    });
    expect(() =>
      clientSafeStorage.setItem('megamek-unit-restored-failed', '{}'),
    ).toThrow('full');
    render(<BrowserDraftStatus unitId="restored-failed" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'failed');
  });

  it('reports only successful writes for the active draft', () => {
    const { rerender } = render(<BrowserDraftStatus unitId="visible-first" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off');
    act(() => clientSafeStorage.setItem('megamek-unit-other', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    act(() => clientSafeStorage.setItem('megamek-unit-visible-first', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in browser',
    );
    rerender(<BrowserDraftStatus unitId="visible-second" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No browser draft yet',
    );
    rerender(<BrowserDraftStatus unitId="visible-first" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in browser',
    );
  });

  it('retains the failed state until the draft is successfully written', () => {
    render(<BrowserDraftStatus unitId="visible-failed" />);
    const storage = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('full');
      });
    act(() => {
      expect(() =>
        clientSafeStorage.setItem('megamek-unit-visible-failed', '{}'),
      ).toThrow('full');
    });
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft save failed in browser',
    );
    storage.mockRestore();
    act(() => clientSafeStorage.setItem('megamek-unit-visible-failed', '{}'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft saved in browser',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'off');
  });
});
