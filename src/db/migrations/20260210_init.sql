-- PillTracker initial schema migration
-- toVersion: 20260210

PRAGMA foreign_keys = ON;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS kv (
  key       TEXT PRIMARY KEY NOT NULL,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS medications (
  id                  TEXT PRIMARY KEY NOT NULL,
  name                TEXT NOT NULL,
  dosageAmount        REAL NOT NULL,
  dosageUnit          TEXT DEFAULT 'mg' NOT NULL,
  notes               TEXT,
  enableNotifications INTEGER DEFAULT 1 NOT NULL,
  intervalType        TEXT DEFAULT 'DAILY' NOT NULL,
  scheduleDays        TEXT DEFAULT '[1,2,3,4,5,6,0]' NOT NULL,
  scheduleTimes       TEXT NOT NULL,
  groupId             TEXT,
  createdAt           TEXT NOT NULL,
  updatedAt           TEXT NOT NULL,
  FOREIGN KEY (groupId) REFERENCES groups(id) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS medications_groupId_idx ON medications (groupId);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS intakes (
  id           TEXT PRIMARY KEY NOT NULL,
  medicationId TEXT NOT NULL,
  takenAt      TEXT NOT NULL,
  createdAt    TEXT NOT NULL,
  FOREIGN KEY (medicationId) REFERENCES medications(id) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS intakes_medicationId_idx ON intakes (medicationId);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS intakes_takenAt_idx ON intakes (takenAt);
