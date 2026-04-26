/**
 * Jest setup for the `a11y` project.
 *
 * Layers axe-core matchers on top of the shared `jest.setup.js` so a11y
 * tests can call `expect(results).toHaveNoViolations()` directly.
 *
 * Loaded from `jest.config.js` only for the `a11y` project — unit tests
 * remain unchanged.
 */
import 'jest-axe/extend-expect';
