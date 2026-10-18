import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

import { CreateMatchForm } from '../CreateMatchForm';

describe('CreateMatchForm accessibility', () => {
  it.each(['preset', 'custom'])(
    'has no axe violations with a %s roster',
    async (mode) => {
      const { container } = render(<CreateMatchForm onSubmit={jest.fn()} />);
      if (mode === 'custom') {
        fireEvent.click(screen.getByLabelText('Custom'));
      }

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
