-- PillTracker SQLite schema (alpha)
-- This file is applied as a baseline schema. In alpha we don't support
-- migrating existing production data; schema changes bump SCHEMA_VERSION
-- and trigger a full reset.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS kv (
  key       TEXT PRIMARY KEY NOT NULL,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  id        TEXT PRIMARY KEY NOT NULL,
  name      TEXT NOT NULL,
  -- "description" is optional notes/description for a group
  description TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medications (
  id                 TEXT PRIMARY KEY NOT NULL,
  name               TEXT NOT NULL,
  dosageAmount       REAL NOT NULL,
  dosageUnit         TEXT DEFAULT 'mg' NOT NULL,
  notes              TEXT,
  enableNotifications INTEGER DEFAULT 1 NOT NULL,
  intervalType       TEXT DEFAULT 'DAILY' NOT NULL,
  scheduleDays       TEXT DEFAULT '[1,2,3,4,5,6,0]' NOT NULL,
  scheduleTimes      TEXT NOT NULL,
  groupId            TEXT,
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL,
  FOREIGN KEY (groupId) REFERENCES groups(id) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS medications_groupId_idx ON medications (groupId);

CREATE TABLE IF NOT EXISTS intakes (
  id           TEXT PRIMARY KEY NOT NULL,
  medicationId TEXT NOT NULL,
  takenAt      TEXT NOT NULL,
  createdAt    TEXT NOT NULL,
  FOREIGN KEY (medicationId) REFERENCES medications(id) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS intakes_medicationId_idx ON intakes (medicationId);
CREATE INDEX IF NOT EXISTS intakes_takenAt_idx ON intakes (takenAt);

