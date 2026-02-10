-- Convert intakes timestamps to ISO strings
ALTER TABLE `intakes` RENAME TO `intakes_old`;

CREATE TABLE `intakes` (
	`id` TEXT PRIMARY KEY NOT NULL,
	`medicationId` TEXT NOT NULL,
	`takenAt` TEXT NOT NULL,
	`createdAt` TEXT NOT NULL,
	FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `intakes` (id, medicationId, takenAt, createdAt)
SELECT id, medicationId, datetime(takenAt, 'unixepoch'), datetime(createdAt, 'unixepoch')
FROM `intakes_old`;

DROP TABLE `intakes_old`;

CREATE INDEX `intakes_medicationId_idx` ON `intakes` (`medicationId`);
CREATE INDEX `intakes_takenAt_idx` ON `intakes` (`takenAt`);
