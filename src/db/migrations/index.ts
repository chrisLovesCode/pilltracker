import migration20260210Init from './20260210_init.sql?raw';

export type RawDbMigration = {
  toVersion: number;
  name: string;
  sql: string;
};

export const RAW_MIGRATIONS: RawDbMigration[] = [
  {
    toVersion: 20260210,
    name: 'init',
    sql: migration20260210Init,
  },
];

export const DB_VERSION = RAW_MIGRATIONS[RAW_MIGRATIONS.length - 1]?.toVersion ?? 1;
