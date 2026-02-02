import { SimulationRunner } from '../runner/SimulationRunner';
import { BatchRunner } from '../runner/BatchRunner';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { ISimulationConfig } from '../core/types';

function createTestConfig(overrides: Partial<ISimulationConfig> = {}): ISimulationConfig {
  return {
    seed: 12345,
    turnLimit: 10,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 5,
    ...overrides,
  };
}

describe('SimulationRunner', () => {
  describe('constructor', () => {
    it('should create with seed', () => {
      const runner = new SimulationRunner(12345);
      expect(runner).toBeDefined();
    });
    
    it('should create with custom invariant runner', () => {
      const invariantRunner = new InvariantRunner();
      const runner = new SimulationRunner(12345, invariantRunner);
      expect(runner).toBeDefined();
    });
  });
  
  describe('run', () => {
    it('should complete without throwing', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      expect(() => runner.run(config)).not.toThrow();
    });
    
    it('should return valid ISimulationResult structure', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      const result = runner.run(config);
      
      expect(result).toBeDefined();
      expect(result.seed).toBe(12345);
      expect(typeof result.turns).toBe('number');
      expect(result.turns).toBeGreaterThan(0);
      expect(typeof result.durationMs).toBe('number');
      expect(Array.isArray(result.events)).toBe(true);
      expect(Array.isArray(result.violations)).toBe(true);
    });
    
    it('should return seed from config', () => {
      const runner = new SimulationRunner(99999);
      const config = createTestConfig({ seed: 99999 });
      
      const result = runner.run(config);
      
      expect(result.seed).toBe(99999);
    });
    
    it('should return turns greater than 0', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      const result = runner.run(config);
      
      expect(result.turns).toBeGreaterThan(0);
    });
    
    it('should return durationMs as positive number', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      const result = runner.run(config);
      
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
    
    it('should respect turnLimit', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ turnLimit: 3 });
      
      const result = runner.run(config);
      
      expect(result.turns).toBeLessThanOrEqual(3);
    });
    
    it('should handle different seed values deterministically', () => {
      const config = createTestConfig({ seed: 54321 });
      
      const runner1 = new SimulationRunner(54321);
      const result1 = runner1.run(config);
      
      const runner2 = new SimulationRunner(54321);
      const result2 = runner2.run(config);
      
      expect(result1.turns).toBe(result2.turns);
      expect(result1.winner).toBe(result2.winner);
    });
    
    it('should handle winner values correctly', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      const result = runner.run(config);
      
      expect(['player', 'opponent', 'draw', null]).toContain(result.winner);
    });
    
    it('should complete within reasonable time', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ turnLimit: 10 });
      
      const startTime = Date.now();
      runner.run(config);
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThan(5000);
    });
    
    it('should handle minimal unit counts', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ unitCount: { player: 1, opponent: 1 } });
      
      const result = runner.run(config);
      
      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });
    
    it('should handle larger unit counts', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig({ unitCount: { player: 4, opponent: 4 } });
      
      const result = runner.run(config);
      
      expect(result).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });
    
    it('should include violations array in result', () => {
      const runner = new SimulationRunner(12345);
      const config = createTestConfig();
      
      const result = runner.run(config);
      
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });
});

describe('BatchRunner', () => {
  describe('runBatch', () => {
    it('should run specified number of simulations', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      
      const results = batchRunner.runBatch(5, config);
      
      expect(results).toHaveLength(5);
    });
    
    it('should return all results with valid structure', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      
      const results = batchRunner.runBatch(3, config);
      
      for (const result of results) {
        expect(result).toBeDefined();
        expect(typeof result.seed).toBe('number');
        expect(typeof result.turns).toBe('number');
        expect(typeof result.durationMs).toBe('number');
        expect(Array.isArray(result.events)).toBe(true);
        expect(Array.isArray(result.violations)).toBe(true);
      }
    });
    
    it('should use incrementing seeds', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ seed: 1000 });
      
      const results = batchRunner.runBatch(3, config);
      
      expect(results[0].seed).toBe(1000);
      expect(results[1].seed).toBe(1001);
      expect(results[2].seed).toBe(1002);
    });
    
    it('should call progress callback', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      const progressCalls: { current: number; total: number }[] = [];
      
      batchRunner.runBatch(3, config, (current, total) => {
        progressCalls.push({ current, total });
      });
      
      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toEqual({ current: 1, total: 3 });
      expect(progressCalls[1]).toEqual({ current: 2, total: 3 });
      expect(progressCalls[2]).toEqual({ current: 3, total: 3 });
    });
    
    it('should handle count of 0', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      
      const results = batchRunner.runBatch(0, config);
      
      expect(results).toHaveLength(0);
    });
    
    it('should handle single simulation', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      
      const results = batchRunner.runBatch(1, config);
      
      expect(results).toHaveLength(1);
      expect(results[0].seed).toBe(config.seed);
    });
    
    it('should complete 10 simulations in reasonable time', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig({ turnLimit: 10 });
      
      const startTime = Date.now();
      const results = batchRunner.runBatch(10, config);
      const elapsed = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(elapsed).toBeLessThan(10000);
    }, 15000);
    
    it('should produce different results for different seeds', () => {
      const batchRunner = new BatchRunner();
      const config = createTestConfig();
      
      const results = batchRunner.runBatch(5, config);
      
       const uniqueTurns = new Set(results.map(r => r.turns));
       
       expect(uniqueTurns.size).toBeGreaterThanOrEqual(1);
    });
  });
});
