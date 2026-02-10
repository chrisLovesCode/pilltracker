/**
 * Database Debug Page
 * Direct SQL test interface
 */
import { useState } from 'react';
import { initDb, isDbInitialized, isNativePlatform, getDatabase } from '../db';

export default function DbDebug() {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');

  if (!isNativePlatform()) {
    return <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ Native Platform Required</h2>
      <p className="text-yellow-700">Database is only available on native iOS/Android platforms.</p>
    </div>;
  }

  const handleAction = async (action: () => Promise<void>) => {
    setStatus('⏳ Processing...');
    setResult('');
    try {
      await action();
    } catch (error: any) {
      setStatus('❌ Error: ' + error.message);
      setResult(error.stack || '');
      console.error('[DbDebug]', error);
    }
  };

  const handleInitDb = async () => {
    await handleAction(async () => {
      if (isDbInitialized()) {
        setStatus('ℹ️ Database already initialized');
        return;
      }
      await initDb();
      setStatus('✅ Database initialized');
    });
  };

  const handleInsertSample = async () => {
    await handleAction(async () => {
      const db = getDatabase();
      
      const groupId = 'grp_' + Date.now();
      const medId = 'med_' + Date.now();
      const now = new Date().toISOString();
      
      await db.run(`
        INSERT INTO groups (
          id, name, description, createdAt, updatedAt
        ) 
        VALUES (?, ?, ?, ?, ?)
      `, [groupId, 'Test Group ' + Date.now(), 'Test description', now, now]);
      
      await db.run(`
        INSERT INTO medications (
          id, name, dosageAmount, dosageUnit, notes, 
          enableNotifications, intervalType, scheduleTimes, 
          groupId, createdAt, updatedAt
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [medId, 'Test Med ' + Date.now(), 10, 'mg', 'Test notes', 1, 'DAILY', JSON.stringify(['08:00', '14:00', '20:00']), groupId, now, now]);
      
      setStatus('✅ Sample data inserted');
      setResult(`Group ID: ${groupId}\nMed ID: ${medId}`);
    });
  };

  const handleListRows = async () => {
    await handleAction(async () => {
      const db = getDatabase();
      
      const groups = await db.query('SELECT * FROM groups LIMIT 10');
      const medications = await db.query('SELECT * FROM medications LIMIT 10');
      
      setStatus('✅ Data retrieved');
      setResult(
        'Groups (' + (groups.values?.length || 0) + '):\n' + 
        JSON.stringify(groups.values || [], null, 2) + 
        '\n\nMedications (' + (medications.values?.length || 0) + '):\n' + 
        JSON.stringify(medications.values || [], null, 2)
      );
    });
  };

  const handleClearTables = async () => {
    await handleAction(async () => {
      const db = getDatabase();
      
      await db.execute('DELETE FROM intakes');
      await db.execute('DELETE FROM medications');
      await db.execute('DELETE FROM groups');
      await db.execute('DELETE FROM kv');
      
      setStatus('✅ All tables cleared');
    });
  };

  const handleShowMigrations = async () => {
    await handleAction(async () => {
      const db = getDatabase();
      
      const version = await db.query('PRAGMA user_version;');
      const tables = await db.query(
        "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
      );

      setStatus('✅ DB info retrieved');
      setResult(
        'user_version:\n' +
          JSON.stringify(version.values || [], null, 2) +
          '\n\nTables:\n' +
          JSON.stringify(tables.values || [], null, 2)
      );
    });
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🛠️ Database Debug</h1>
      
      <div className="space-y-2">
        <button onClick={handleInitDb} className="px-4 py-2 bg-blue-500 text-white rounded mr-2" aria-label="db-init">Initialize DB</button>
        <button onClick={handleInsertSample} className="px-4 py-2 bg-green-500 text-white rounded mr-2" aria-label="db-insert-sample">Insert Sample</button>
        <button onClick={handleListRows} className="px-4 py-2 bg-purple-500 text-white rounded mr-2" aria-label="db-list-rows">List Rows</button>
        <button onClick={handleClearTables} className="px-4 py-2 bg-red-500 text-white rounded mr-2" aria-label="db-clear-tables">Clear Tables</button>
        <button onClick={handleShowMigrations} className="px-4 py-2 bg-gray-500 text-white rounded" aria-label="db-show-migrations">DB Info</button>
      </div>

      {status && (
        <div className="p-4 bg-gray-100 rounded">
          <strong>Status:</strong> {status}
        </div>
      )}

      {result && (
        <div className="p-4 bg-gray-50 rounded">
          <pre className="text-xs overflow-auto max-h-96">{result}</pre>
        </div>
      )}
    </div>
  );
}
