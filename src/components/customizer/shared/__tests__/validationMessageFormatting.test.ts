import { formatValidationMessage } from '../validationMessageFormatting';

it.each([
  [
    'Unit exceeds maximum tonnage by 7.0 tons (107.0/100 tons)',
    'Unit exceeds maximum tonnage by 7.0 t (107.0 / 100.0 t).',
  ],
  ['Remove 7 tons of equipment', 'Remove 7.0 t of equipment.'],
  [
    'Total weight (107t) exceeds tonnage (100t)',
    'Total weight (107.0 t) exceeds tonnage (100.0 t).',
  ],
  ['Only 0.25 tons remaining', 'Only 0.3 t remaining.'],
  ['No critical slots available.', 'No critical slots available.'],
])('formats customizer validation copy: %s', (message, expected) => {
  expect(formatValidationMessage(message)).toBe(expected);
});
