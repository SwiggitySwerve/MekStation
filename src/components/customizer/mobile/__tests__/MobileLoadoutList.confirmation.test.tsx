import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import { EquipmentCategory } from '@/types/equipment';

import type { MobileEquipmentItem } from '../MobileEquipmentRow';

import { CustomizerConfirmationProvider } from '../../dialogs/CustomizerConfirmationProvider';
import { MobileLoadoutList } from '../MobileLoadoutList';
const one: MobileEquipmentItem = {
  instanceId: 'one',
  name: 'Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  weight: 1,
  criticalSlots: 1,
  isAllocated: false,
  isRemovable: true,
  isOmniPodMounted: true,
};
const props: React.ComponentProps<typeof MobileLoadoutList> = {
  equipment: [one],
  stats: {
    weightUsed: 1,
    weightMax: 50,
    slotsUsed: 1,
    slotsMax: 78,
    heatGenerated: 1,
    heatDissipation: 10,
    battleValue: 1,
    equipmentCount: 1,
    unassignedCount: 1,
  },
  onRemoveEquipment: jest.fn(),
  onRemoveAllEquipment: jest.fn(),
  onSelectEquipment: jest.fn(),
  onClose: jest.fn(),
};
const scope = { unitId: 'unit-a', unitType: 'BattleMech' };
function viewOf(current = props, visible = true) {
  return (
    <CustomizerConfirmationProvider scope={scope}>
      {visible && <MobileLoadoutList {...current} />}
    </CustomizerConfirmationProvider>
  );
}
const show = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const close = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterAll(() => {
  for (const [name, value] of [
    ['showModal', show],
    ['close', close],
  ] as const) {
    if (value) Object.defineProperty(HTMLDialogElement.prototype, name, value);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  try {
    expect(window.confirm).not.toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
  }
});
function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
  return screen.getByRole('dialog', { name: 'Clear equipment loadout?' });
}
describe('Mobile bulk removal confirmation', () => {
  it('Cancel preserves equipment, selection and pending focus', () => {
    const view = render(viewOf());
    const child = open();
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    fireEvent.click(within(child).getByRole('button', { name: 'Cancel' }));
    const row = view.container.ownerDocument.querySelector<HTMLButtonElement>(
      '[data-equipment-select="one"]',
    );
    if (!row) throw new Error('Equipment selection button absent');
    row.focus();
    view.rerender(viewOf({ ...props, equipment: [{ ...one }] }));
    expect(document.activeElement).toBe(row);
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
    expect(props.onSelectEquipment).not.toHaveBeenCalled();
  });
  it('isolates child Escape and pointer events from the parent and document', () => {
    render(viewOf());
    const child = open();
    const key = jest.fn();
    const pointer = jest.fn();
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', pointer);
    try {
      fireEvent.keyDown(child, { key: 'Escape' });
      fireEvent.pointerDown(child);
      fireEvent(
        child,
        new Event('cancel', { bubbles: true, cancelable: true }),
      );
      expect(key).not.toHaveBeenCalled();
      expect(pointer).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
      expect(
        screen.getByRole('dialog', { name: 'Equipment Loadout' }),
      ).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');
    } finally {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', pointer);
    }
  });
  it.each(['replacement', 'removable', 'pod', 'omni'] as const)(
    'refuses changed %s policy after requesting',
    (change) => {
      const initial = [
        one,
        { ...one, instanceId: 'two', isOmniPodMounted: false },
      ];
      const initialProps = { ...props, equipment: initial, isOmni: true };
      const view = render(viewOf(initialProps));
      const child = open();
      let equipment = initial.map((item) => ({ ...item }));
      if (change === 'replacement')
        equipment[0] = { ...one, instanceId: 'different' };
      if (change === 'removable')
        equipment = equipment.map((item) => ({
          ...item,
          isRemovable: !item.isRemovable,
        }));
      if (change === 'pod')
        equipment = equipment.map((item) => ({
          ...item,
          isOmniPodMounted: !item.isOmniPodMounted,
        }));
      view.rerender(
        viewOf({ ...initialProps, equipment, isOmni: change !== 'omni' }),
      );
      fireEvent.click(
        within(child).getByRole('button', { name: 'Clear equipment' }),
      );
      expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
      expect(props.onSelectEquipment).not.toHaveBeenCalled();
    },
  );
  it('accepts semantic reorder and invokes the current bulk callback once', () => {
    const initial = [one, { ...one, instanceId: 'two' }];
    const view = render(viewOf({ ...props, equipment: initial }));
    const child = open();
    const latest = jest.fn();
    view.rerender(
      viewOf({
        ...props,
        equipment: [...initial]
          .reverse()
          .map((item) => ({ ...item, name: 'Renamed' })),
        onRemoveAllEquipment: latest,
      }),
    );
    const approve = within(child).getByRole('button', {
      name: 'Clear equipment',
    });
    act(() => {
      approve.click();
      approve.click();
    });
    expect(latest).toHaveBeenCalledTimes(1);
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
    expect(props.onSelectEquipment).not.toHaveBeenCalled();
  });
  it('refuses swapped removable flags when the eligible count stays the same', () => {
    const initial = [one, { ...one, instanceId: 'other', isRemovable: false }];
    const view = render(viewOf({ ...props, equipment: initial }));
    const child = open();
    view.rerender(
      viewOf({
        ...props,
        equipment: initial.map((item) => ({
          ...item,
          isRemovable: !item.isRemovable,
        })),
      }),
    );
    fireEvent.click(
      within(child).getByRole('button', { name: 'Clear equipment' }),
    );
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
  });
  it('refuses a raw optional pod flag change even when eligibility is unchanged', () => {
    const view = render(
      viewOf({
        ...props,
        equipment: [{ ...one, isOmniPodMounted: undefined }],
      }),
    );
    const child = open();
    view.rerender(viewOf({ ...props, equipment: [one] }));
    fireEvent.click(
      within(child).getByRole('button', { name: 'Clear equipment' }),
    );
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
  });
  it.each([
    { ...one, isRemovable: false },
    { ...one, isOmniPodMounted: false },
  ])('does not offer clear for ineligible equipment', (item) => {
    render(viewOf({ ...props, equipment: [item], isOmni: true }));
    expect(
      screen.queryByRole('button', { name: 'Clear All' }),
    ).not.toBeInTheDocument();
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
  });
  it('disposes a request when the same-unit mobile parent disappears', () => {
    const view = render(viewOf());
    open();
    view.rerender(viewOf(props, false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(viewOf());
    expect(
      screen.queryByRole('dialog', { name: 'Clear equipment loadout?' }),
    ).not.toBeInTheDocument();
    expect(props.onRemoveAllEquipment).not.toHaveBeenCalled();
  });
});
