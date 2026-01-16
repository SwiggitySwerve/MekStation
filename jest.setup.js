// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Polyfill fetch for Node.js test environment
if (typeof global.fetch === 'undefined') {
  // Mock fetch for tests - return empty arrays for equipment JSON files
  global.fetch = async (url) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    
    // Return empty arrays for equipment JSON files
    if (urlStr.includes('.json')) {
      return {
        ok: true,
        json: async () => [],
      };
    }
    
    throw new Error(`Unmocked fetch: ${urlStr}`);
  };
}

// Import BattleTech custom matchers (auto-registers)
import './src/__tests__/helpers/assertions';

// Set test timeout for database operations
jest.setTimeout(30000);

// Mock Next.js modules that might not be available in test environment
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };
  },
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock ResizeObserver (not available in jsdom)
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock canvas if used in components
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  drawImage: jest.fn(),
  fillStyle: '',
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
}));

// Test environment cleanup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Suppress console warnings during tests (optional)
global.console = {
  ...console,
  // Uncomment to ignore specific warnings
  // warn: jest.fn(),
  // error: jest.fn(),
};
