/**
 * createSingleton Factory Tests
 *
 * Tests for the generic singleton factory function that generates lazy-initialized
 * singleton instances with optional cleanup callbacks.
 */

import { createSingleton } from '@/services/core/createSingleton';

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  id: string;
  getValue(): string;
}

class ConcreteTestService implements TestService {
  id: string;
  static instanceCount = 0;

  constructor() {
    this.id = `instance-${++ConcreteTestService.instanceCount}`;
  }

  getValue(): string {
    return `Service ${this.id}`;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('createSingleton', () => {
  beforeEach(() => {
    ConcreteTestService.instanceCount = 0;
  });

  // =========================================================================
  // Lazy Initialization
  // =========================================================================

  describe('Lazy Initialization', () => {
    it('should not create instance until first get() call', () => {
      const factory = createSingleton(() => new ConcreteTestService());
      // Instance should not be created yet
      expect(ConcreteTestService.instanceCount).toBe(0);

      factory.get();
      // Now instance should be created
      expect(ConcreteTestService.instanceCount).toBe(1);
    });

    it('should create instance on first get() call', () => {
      const factory = createSingleton(() => new ConcreteTestService());
      const instance = factory.get();

      expect(instance).toBeInstanceOf(ConcreteTestService);
      expect(instance.id).toBe('instance-1');
    });

    it('should return same instance on multiple get() calls', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      const instance1 = factory.get();
      const instance2 = factory.get();
      const instance3 = factory.get();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(ConcreteTestService.instanceCount).toBe(1);
    });
  });

  // =========================================================================
  // Reset Functionality
  // =========================================================================

  describe('Reset Functionality', () => {
    it('should reset singleton instance', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      const instance1 = factory.get();
      expect(instance1.id).toBe('instance-1');

      factory.reset();

      const instance2 = factory.get();
      expect(instance2.id).toBe('instance-2');
      expect(instance1).not.toBe(instance2);
    });

    it('should allow multiple reset cycles', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      const id1 = factory.get().id;
      factory.reset();
      const id2 = factory.get().id;
      factory.reset();
      const id3 = factory.get().id;

      expect(id1).toBe('instance-1');
      expect(id2).toBe('instance-2');
      expect(id3).toBe('instance-3');
    });

    it('should allow get() after reset', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      factory.get();
      factory.reset();
      const instance = factory.get();

      expect(instance).toBeInstanceOf(ConcreteTestService);
    });
  });

  // =========================================================================
  // Cleanup Callback
  // =========================================================================

  describe('Cleanup Callback', () => {
    it('should invoke cleanup callback on reset', () => {
      const cleanup = jest.fn();
      const factory = createSingleton(() => new ConcreteTestService(), cleanup);

      factory.get();
      expect(cleanup).not.toHaveBeenCalled();

      factory.reset();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should pass instance to cleanup callback', () => {
      const cleanup = jest.fn();
      const factory = createSingleton(() => new ConcreteTestService(), cleanup);

      const instance = factory.get();
      factory.reset();

      expect(cleanup).toHaveBeenCalledWith(instance);
    });

    it('should not invoke cleanup if instance was never created', () => {
      const cleanup = jest.fn();
      const factory = createSingleton(() => new ConcreteTestService(), cleanup);

      factory.reset();
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('should invoke cleanup multiple times on multiple resets', () => {
      const cleanup = jest.fn();
      const factory = createSingleton(() => new ConcreteTestService(), cleanup);

      factory.get();
      factory.reset();
      factory.get();
      factory.reset();

      expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup callback that throws error', () => {
      const cleanup = jest.fn(() => {
        throw new Error('Cleanup failed');
      });
      const factory = createSingleton(() => new ConcreteTestService(), cleanup);

      factory.get();
      expect(() => factory.reset()).toThrow('Cleanup failed');
    });
  });

  // =========================================================================
  // Type Safety
  // =========================================================================

  describe('Type Safety', () => {
    it('should preserve generic type T', () => {
      interface CustomService {
        name: string;
        doSomething(): number;
      }

      const customService: CustomService = {
        name: 'test',
        doSomething: () => 42,
      };

      const factory = createSingleton<CustomService>(() => customService);
      const instance = factory.get();

      expect(instance.name).toBe('test');
      expect(instance.doSomething()).toBe(42);
    });

    it('should work with complex types', () => {
      interface ComplexService {
        data: { nested: { value: string } };
        methods: { fn: () => void };
      }

      const service: ComplexService = {
        data: { nested: { value: 'test' } },
        methods: { fn: () => {} },
      };

      const factory = createSingleton<ComplexService>(() => service);
      const instance = factory.get();

      expect(instance.data.nested.value).toBe('test');
      expect(typeof instance.methods.fn).toBe('function');
    });

    it('should work with primitive types', () => {
      const factory = createSingleton<string>(() => 'singleton-string');
      const instance = factory.get();

      expect(instance).toBe('singleton-string');
      expect(typeof instance).toBe('string');
    });
  });

  // =========================================================================
  // Factory Function Behavior
  // =========================================================================

  describe('Factory Function Behavior', () => {
    it('should call factory function only once', () => {
      const factoryFn = jest.fn(() => new ConcreteTestService());
      const factory = createSingleton(factoryFn);

      factory.get();
      factory.get();
      factory.get();

      expect(factoryFn).toHaveBeenCalledTimes(1);
    });

    it('should call factory function again after reset', () => {
      const factoryFn = jest.fn(() => new ConcreteTestService());
      const factory = createSingleton(factoryFn);

      factory.get();
      factory.reset();
      factory.get();

      expect(factoryFn).toHaveBeenCalledTimes(2);
    });

    it('should handle factory function that returns null', () => {
      const factory = createSingleton<ConcreteTestService | null>(() => null);
      const instance = factory.get();

      expect(instance).toBeNull();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid successive get() calls', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      const instances = [
        factory.get(),
        factory.get(),
        factory.get(),
        factory.get(),
        factory.get(),
      ];

      expect(new Set(instances).size).toBe(1);
    });

    it('should handle reset followed immediately by get()', () => {
      const factory = createSingleton(() => new ConcreteTestService());

      const instance1 = factory.get();
      factory.reset();
      const instance2 = factory.get();

      expect(instance1).not.toBe(instance2);
      expect(instance2).toBeInstanceOf(ConcreteTestService);
    });

    it('should work with multiple independent factories', () => {
      const factory1 = createSingleton(() => new ConcreteTestService());
      const factory2 = createSingleton(() => new ConcreteTestService());

      const instance1 = factory1.get();
      const instance2 = factory2.get();

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).toBe('instance-1');
      expect(instance2.id).toBe('instance-2');
    });
  });
});
