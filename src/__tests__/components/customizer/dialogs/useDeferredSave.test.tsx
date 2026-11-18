/**
 * A click that lands between a commit and its passive effects must use that
 * commit's values, never the previous render's.
 */
import { render } from '@testing-library/react';
import React, { useLayoutEffect } from 'react';

import { useDeferredSave } from '@/components/customizer/dialogs/useDeferredSave';

function ClickAfterCommit({
  submit,
  click,
}: {
  submit: () => void;
  click: boolean;
}) {
  const deferredSave = useDeferredSave({
    isOpen: true,
    targetId: 'tab-1',
    isPending: false,
    resetKey: 'same',
    submit,
  });
  // Layout effects run after the commit and before passive effects: the same
  // window as a user click arriving before the effects flush.
  useLayoutEffect(() => {
    if (click) deferredSave.request();
  }, [click, deferredSave]);
  return null;
}

it('submits with the conflict id of the commit the click lands on', () => {
  const save = jest.fn();
  const { rerender } = render(
    <ClickAfterCommit submit={() => save('library-1')} click={false} />,
  );
  rerender(<ClickAfterCommit submit={() => save('library-2')} click />);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith('library-2');
});
