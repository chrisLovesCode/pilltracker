-- Convert medications timestamps to ISO strings and adjust types
ALTER TABLE `medications` RENAME TO `medications_old`;

CREATE TABLE `medications` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`name` TEXT NOT NULL,
	`dosageAmount` REAL NOT NULL,
	`dosageUnit` TEXT DEFAULT 'mg' NOT NULL,
	`notes` TEXT,
	`enableNotifications` INTEGER DEFAULT 1 NOT NULL,
	`intervalType` TEXT DEFAULT 'DAILY' NOT NULL,
	`scheduleTimes` TEXT NOT NULL,
	`groupId` TEXT,
	`createdAt` TEXT NOT NULL,
	`updatedAt` TEXT NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `medications` (id, name, dosageAmount, dosageUnit, notes, enableNotifications, intervalType, scheduleTimes, groupId, createdAt, updatedAt)
SELECT id, name, dosageAmount, dosageUnit, notes, enableNotifications, intervalType, scheduleTimes, groupId, datetime(createdAt, 'unixepoch'), datetime(updatedAt, 'unixepoch')
FROM `medications_old`;

DROP TABLE `medications_old`;

CREATE INDEX `medications_groupId_idx` ON `medications` (`groupId`);
