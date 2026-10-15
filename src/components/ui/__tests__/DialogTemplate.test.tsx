import { render, screen } from '@testing-library/react';
import React from 'react';

import { DialogTemplate } from '../DialogTemplate';

describe('DialogTemplate', () => {
  it('forwards optional native centered modality without changing dialog naming', () => {
    const show = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'showModal',
    );
    const close = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'close',
    );
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
    try {
      const view = render(
        <DialogTemplate
          topLayer
          isOpen
          onClose={jest.fn()}
          title="Confirm changes"
        >
          <button>Confirm</button>
        </DialogTemplate>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Confirm changes' });
      expect(dialog.tagName).toBe('DIALOG');
      expect(dialog).toHaveAttribute('open');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      view.unmount();
    } finally {
      for (const [key, descriptor] of [
        ['showModal', show],
        ['close', close],
      ] as const) {
        if (descriptor)
          Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
      }
    }
  });
  it('names and describes the actual dialog role from its header', () => {
    render(
      <DialogTemplate
        isOpen
        onClose={jest.fn()}
        title="Save Unit"
        subtitle="Choose a name for this unit."
      >
        <label>
          Unit name
          <input />
        </label>
      </DialogTemplate>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Save Unit' });
    const descriptionId = dialog.getAttribute('aria-describedby');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title-save-unit');
    expect(descriptionId).toBe('dialog-subtitle-save-unit');
    expect(document.getElementById(descriptionId ?? '')).toHaveTextContent(
      'Choose a name for this unit.',
    );
  });
});
