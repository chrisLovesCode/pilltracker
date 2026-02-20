/**
 * Direct SQLite Connection for Capacitor
 * Native iOS/Android only - no ORM
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
  capSQLiteVersionUpgrade,
} from '@capacitor-community/sqlite';
import { DB_VERSION, RAW_MIGRATIONS } from './migrations';

// NOTE: capacitor-community/sqlite expects the database name WITHOUT ".db"
// (it manages the file extension internally).
const DB_NAME = 'pilltracker';

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;
let isInitialized = false;

/**
 * Initialize SQLite database
 */
export async function initDb(): Promise<void> {
  if (isInitialized) {
    console.log('[DB] Already initialized');
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    throw new Error('[DB] Database only available on native platforms');
  }

  try {
    console.log('[DB] Initializing SQLite...');

    const pluginAvailable = Capacitor.isPluginAvailable?.('CapacitorSQLite') ?? false;
    console.log('[DB] CapacitorSQLite plugin available:', pluginAvailable);
    if (!pluginAvailable) {
      throw new Error('[DB] CapacitorSQLite plugin not registered (isPluginAvailable=false)');
    }
    // Fail fast with the plugin's own load message (if native init failed on a real device).
    try {
      await CapacitorSQLite.echo({ value: 'db-init' });
      console.log('[DB] ✅ CapacitorSQLite echo ok');
    } catch (e) {
      throw new Error(`[DB] CapacitorSQLite echo failed: ${formatUnknownError(e)}`);
    }

    // Create SQLite connection
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
    await registerUpgradeStatements(sqliteConnection);
    
    // Check if connection exists
    const ret = await sqliteConnection.checkConnectionsConsistency();
    const isConn = (await sqliteConnection.isConnection(DB_NAME, false)).result;

    if (ret.result && isConn) {
      db = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqliteConnection.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        DB_VERSION,
        false
      );
    }

    await db.open();
    console.log(`[DB] ✅ SQLite connection opened (target version ${DB_VERSION})`);

    isInitialized = true;
    console.log('[DB] ✅ Database initialized successfully');
  } catch (error) {
    console.error('[DB] ❌ Initialization failed:', error);
    throw error;
  }
}

/**
 * Get database connection
 */
export function getDatabase(): SQLiteDBConnection {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return isInitialized;
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    if (sqliteConnection) {
      await sqliteConnection.closeConnection(DB_NAME, false);
    }
    db = null;
    sqliteConnection = null;
  }
  isInitialized = false;
  console.log('[DB] Connection closed');
}

async function registerUpgradeStatements(connection: SQLiteConnection): Promise<void> {
  const upgrades = buildUpgradeStatements();
  if (upgrades.length === 0) {
    throw new Error('[DB] No upgrade statements configured');
  }

  await connection.addUpgradeStatement(DB_NAME, upgrades);
  console.log(`[DB] Registered ${upgrades.length} upgrade step(s) up to v${DB_VERSION}`);
}

function buildUpgradeStatements(): capSQLiteVersionUpgrade[] {
  const sorted = [...RAW_MIGRATIONS].sort((a, b) => a.toVersion - b.toVersion);
  let previousVersion = 0;

  const upgrades: capSQLiteVersionUpgrade[] = [];
  for (const migration of sorted) {
    if (migration.toVersion <= previousVersion) {
      throw new Error(
        `[DB] Migration versions must be strictly increasing (got ${migration.toVersion} after ${previousVersion})`,
      );
    }

    const statements = splitMigrationStatements(migration.sql);
    if (statements.length === 0) {
      throw new Error(`[DB] Migration ${migration.name} (v${migration.toVersion}) has no SQL statements`);
    }

    upgrades.push({
      toVersion: migration.toVersion,
      statements,
    });
    previousVersion = migration.toVersion;
  }

  return upgrades;
}

function splitMigrationStatements(sql: string): string[] {
  if (sql.includes('--> statement-breakpoint')) {
    return sql
      .split(/--> statement-breakpoint/g)
      .map(chunk => chunk.trim())
      .filter(Boolean);
  }

  return splitSqlStatements(sql);
}

/**
 * Split a migration file into SQL statements.
 *
 * Needs to be tolerant of:
 * - `--> statement-breakpoint` markers
 * - Line comments (`-- ...`)
 * - Block comments (`/* ... *\/`)
 * - Semicolons inside quoted strings
 */
function splitSqlStatements(sql: string): string[] {
  // Treat breakpoints as statement terminators to keep splitting stable.
  const input = sql.replace(/--> statement-breakpoint/g, ';');

  const out: string[] = [];
  let cur = '';

  let inSingle = false;   // '...'
  let inDouble = false;   // "..."
  let inBacktick = false; // `...`
  let inBracket = false;  // [...]

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const next = i + 1 < input.length ? input[i + 1] : '';

    // Handle comments when not inside any quote.
    if (!inSingle && !inDouble && !inBacktick && !inBracket) {
      // Line comment: -- ....\n
      if (ch === '-' && next === '-') {
        i += 2;
        while (i < input.length && input[i] !== '\n') i++;
        continue;
      }
      // Block comment: /* ... */
      if (ch === '/' && next === '*') {
        i += 2;
        while (i + 1 < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
        i += 2; // skip closing */
        continue;
      }
    }

    // Quote state transitions.
    if (!inDouble && !inBacktick && !inBracket && ch === "'") {
      if (inSingle) {
        // SQLite escapes single quotes by doubling them: ''
        if (next === "'") {
          cur += "''";
          i += 2;
          continue;
        }
        inSingle = false;
        cur += ch;
        i++;
        continue;
      } else {
        inSingle = true;
        cur += ch;
        i++;
        continue;
      }
    }

    if (!inSingle && !inBacktick && !inBracket && ch === '"') {
      inDouble = !inDouble;
      cur += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBracket && ch === '`') {
      inBacktick = !inBacktick;
      cur += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick && ch === '[') {
      inBracket = true;
      cur += ch;
      i++;
      continue;
    }
    if (inBracket && ch === ']') {
      inBracket = false;
      cur += ch;
      i++;
      continue;
    }

    // Statement terminator.
    if (!inSingle && !inDouble && !inBacktick && !inBracket && ch === ';') {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  const tail = cur.trim();
  if (tail) out.push(tail);

  return out;
}

function formatUnknownError(e: unknown): string {
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
