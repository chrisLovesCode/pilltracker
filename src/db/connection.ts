/**
 * Direct SQLite Connection for Capacitor
 * Native iOS/Android only - no ORM
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import schemaSql from './schema.sql?raw';

// NOTE: capacitor-community/sqlite expects the database name WITHOUT ".db"
// (it manages the file extension internally).
const DB_NAME = 'pilltracker';
// Alpha: schema changes are allowed to reset the DB completely.
// Bump this number whenever `schema.sql` changes.
const SCHEMA_VERSION = 20260210;

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
        1,
        false
      );
    }

    await db.open();
    console.log('[DB] ✅ SQLite connection opened');

    // Alpha schema management: ensure schema matches and reset if needed.
    await ensureSchema();

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

async function ensureSchema(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const currentVersion = await getUserVersion(db);
  if (currentVersion !== SCHEMA_VERSION) {
    console.warn(`[DB] Schema version mismatch (have=${currentVersion}, want=${SCHEMA_VERSION}). Resetting DB (alpha).`);
    await resetDatabase();

    // Re-open fresh DB after delete.
    if (!sqliteConnection) {
      sqliteConnection = new SQLiteConnection(CapacitorSQLite);
    }
    db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await db.open();
    console.log('[DB] ✅ SQLite connection opened (after reset)');
  }

  // Apply baseline schema (idempotent thanks to IF NOT EXISTS).
  const statements = splitSqlStatements(schemaSql);
  for (const statement of statements) {
    if (statement.trim()) {
      await db.execute(statement);
    }
  }

  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

async function getUserVersion(conn: SQLiteDBConnection): Promise<number> {
  try {
    const res = await conn.query('PRAGMA user_version;');
    const v = (res.values?.[0] as any)?.user_version;
    return typeof v === 'number' ? v : 0;
  } catch {
    return 0;
  }
}

async function resetDatabase(): Promise<void> {
  // Best-effort cleanup: close connections then delete DB file.
  try {
    if (db) await db.close();
  } catch {
    // ignore
  }
  try {
    if (sqliteConnection) await sqliteConnection.closeConnection(DB_NAME, false);
  } catch {
    // ignore
  }
  db = null;
  isInitialized = false;

  try {
    await CapacitorSQLite.deleteDatabase({ database: DB_NAME, readonly: false });
  } catch (e) {
    // ignore "does not exist" and similar errors
    console.warn('[DB] deleteDatabase failed (ignored):', e);
  }
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
