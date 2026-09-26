CREATE TABLE `supportClaim` (
	`id` text PRIMARY KEY,
	`supportPostId` text NOT NULL,
	`helperUserLinkId` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`createdAt` integer NOT NULL,
	`assignedAt` integer,
	`assignedBy` text,
	CONSTRAINT `fk_supportClaim_supportPostId_supportPost_id_fk` FOREIGN KEY (`supportPostId`) REFERENCES `supportPost`(`id`),
	CONSTRAINT `fk_supportClaim_helperUserLinkId_userLink_id_fk` FOREIGN KEY (`helperUserLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_supportClaim_assignedBy_userLink_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportPost` (
	`id` text PRIMARY KEY,
	`type` text NOT NULL,
	`direction` text NOT NULL,
	`isUrgent` integer DEFAULT false NOT NULL,
	`title` text NOT NULL,
	`visibilityTier` text NOT NULL,
	`status` text NOT NULL,
	`authorUserLinkId` text NOT NULL,
	`structuredDetails` text NOT NULL,
	`moderatedBy` text,
	`moderatedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_supportPost_authorUserLinkId_userLink_id_fk` FOREIGN KEY (`authorUserLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_supportPost_moderatedBy_userLink_id_fk` FOREIGN KEY (`moderatedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportUpdate` (
	`id` text PRIMARY KEY,
	`supportPostId` text NOT NULL,
	`authorUserLinkId` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer,
	`body` text,
	`createdAt` integer NOT NULL,
	CONSTRAINT `fk_supportUpdate_supportPostId_supportPost_id_fk` FOREIGN KEY (`supportPostId`) REFERENCES `supportPost`(`id`),
	CONSTRAINT `fk_supportUpdate_authorUserLinkId_userLink_id_fk` FOREIGN KEY (`authorUserLinkId`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
ALTER TABLE `profile` ADD `ageRange` text;--> statement-breakpoint
CREATE UNIQUE INDEX `supportClaim_post_helper_idx` ON `supportClaim` (`supportPostId`,`helperUserLinkId`);--> statement-breakpoint
CREATE UNIQUE INDEX `supportClaim_assigned_idx` ON `supportClaim` (`supportPostId`) WHERE "supportClaim"."status" = 'assigned';--> statement-breakpoint
CREATE INDEX `supportPost_status_type_idx` ON `supportPost` (`status`,`type`);--> statement-breakpoint
CREATE INDEX `supportPost_createdAt_id_idx` ON `supportPost` (`createdAt`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `supportPost_openFinancial_idx` ON `supportPost` (`authorUserLinkId`) WHERE "supportPost"."type" = 'request_financial' and "supportPost"."status" in ('pending', 'published', 'paused');--> statement-breakpoint
CREATE INDEX `supportUpdate_post_createdAt_idx` ON `supportUpdate` (`supportPostId`,`createdAt`);