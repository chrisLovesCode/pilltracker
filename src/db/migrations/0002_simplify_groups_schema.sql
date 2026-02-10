-- Simplify groups table schema
ALTER TABLE `groups` RENAME TO `groups_old`;

CREATE TABLE `groups` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`name` TEXT NOT NULL,
	`description` TEXT,
	`createdAt` TEXT NOT NULL,
	`updatedAt` TEXT NOT NULL
);

INSERT INTO `groups` (id, name, description, createdAt, updatedAt)
SELECT id, name, notes, datetime(createdAt, 'unixepoch'), datetime(updatedAt, 'unixepoch')
FROM `groups_old`;

DROP TABLE `groups_old`;
