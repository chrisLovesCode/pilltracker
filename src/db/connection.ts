/**
 * Direct SQLite Connection for Capacitor
 * Native iOS/Android only - no ORM
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'pilltracker.db';

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

    // Run migrations
    await runMigrations();

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

/**
 * Run SQL migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  console.log('[Migrations] Starting...');

  // Create migrations tracking table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )
  `);

  // Load migration files
  const migrations = import.meta.glob<string>('/src/db/migrations/*.sql', {
    query: '?raw',
    import: 'default',
  });

  const migrationFiles = Object.keys(migrations).sort();
  console.log(`[Migrations] Found ${migrationFiles.length} migration file(s)`);

  for (const path of migrationFiles) {
    const name = path.split('/').pop()!.replace('.sql', '');
    
    // Check if already applied
    const result = await db.query(`
      SELECT name 
      FROM __migrations 
      WHERE name = ?
    `, [name]);
    
    if (result.values && result.values.length > 0) {
      continue; // Already applied
    }

    console.log(`[Migrations] Applying ${name}...`);
    
    const sql = await migrations[path]();

    // Migration files can contain `--> statement-breakpoint` markers.
    // These are NOT valid SQL and must never be sent to SQLite.
    const statements = splitSqlStatements(sql);

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
        } catch (error: any) {
          // If a previous app version crashed mid-migration, some CREATE statements may have
          // succeeded without the migration being recorded. To recover on next launch, ignore
          // "already exists" errors for idempotent CREATE TABLE/INDEX statements.
          const msg = (error?.message ?? String(error)) as string;
          if (isAlreadyExistsError(msg) && isIdempotentCreate(statement)) {
            console.warn('[Migrations] ⚠️ Ignoring already-exists error for statement:', statement);
            continue;
          }
          throw error;
        }
      }
    }

    // Record migration
    const appliedAt = new Date().toISOString();
    await db.run(`
      INSERT INTO __migrations (name, applied_at) 
      VALUES (?, ?)
    `, [name, appliedAt]);

    console.log(`[Migrations] ✅ Applied ${name}`);
  }

  console.log('[Migrations] ✅ All migrations complete');
}

function isAlreadyExistsError(message: string): boolean {
  return /already exists/i.test(message);
}

function isIdempotentCreate(statement: string): boolean {
  const s = statement.trim().toUpperCase();
  return s.startsWith('CREATE TABLE') || s.startsWith('CREATE INDEX') || s.startsWith('CREATE UNIQUE INDEX');
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
