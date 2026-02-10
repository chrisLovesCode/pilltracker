/**
 * Database initialization test
 */
import { describe, it, expect } from 'vitest';
import { isNativePlatform, isDbInitialized } from '../db';

describe('Database Connection', () => {
  it('should report that database is not available in browser', () => {
    // Tests run in browser (jsdom), so DB is not available
    expect(isNativePlatform()).toBe(false);
    expect(isDbInitialized()).toBe(false);
  });
});
