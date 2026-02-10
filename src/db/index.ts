/**
 * Database Entry Point
 * 
 * Exports database connection and repositories
 */

export { initDb, getDatabase, isDbInitialized, isNativePlatform, closeDb } from './connection';

// Repositories
export * from './repositories/medications';
export * from './repositories/groups';
