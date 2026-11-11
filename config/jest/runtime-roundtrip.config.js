// Dedicated Jest config for the runtime round-trip capture (scripts/runtime-roundtrip/capture.jest.js).
// Same environment as the load capture's config (jsdom, SWC, the `@/` alias); only the selected
// file differs, and it sits outside the `unit` and `a11y` projects like the load capture.
const base = require('./runtime-path-bv.config.js');

module.exports = {
  ...base,
  roots: ['<rootDir>/scripts/runtime-roundtrip'],
  testMatch: ['<rootDir>/scripts/runtime-roundtrip/capture.jest.js'],
};
