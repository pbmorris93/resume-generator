// Test setup file for Vitest
import { beforeEach, afterAll } from 'vitest';
import { browserPool } from '../src/utils/browser-pool.js';

// Set test environment
process.env.NODE_ENV = 'test';

beforeEach(() => {
  // Clean up any test artifacts before each test
  // Reset any global state if needed
});

// Global teardown for browser pool
afterAll(async () => {
  await browserPool.shutdown();
});