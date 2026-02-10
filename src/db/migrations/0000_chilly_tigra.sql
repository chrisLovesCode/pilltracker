CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`enableNotifications` integer DEFAULT true NOT NULL,
	`intervalType` text DEFAULT 'DAILY' NOT NULL,
	`scheduleOverride` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE TABLE `intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`medicationId` text NOT NULL,
	`takenAt` integer DEFAULT (unixepoch()) NOT NULL,
	`notes` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `intakes_medicationId_idx` ON `intakes` (`medicationId`);
CREATE INDEX `intakes_takenAt_idx` ON `intakes` (`takenAt`);
CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`dosageAmount` real NOT NULL,
	`dosageUnit` text DEFAULT 'mg' NOT NULL,
	`notes` text,
	`enableNotifications` integer DEFAULT true NOT NULL,
	`intervalType` text DEFAULT 'DAILY' NOT NULL,
	`scheduleTimes` text NOT NULL,
	`groupId` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX `medications_groupId_idx` ON `medications` (`groupId`);
CREATE TABLE `timestamps` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
