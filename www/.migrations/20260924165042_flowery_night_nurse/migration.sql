CREATE TABLE `guide` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`category` text NOT NULL,
	`bodyContent` text NOT NULL,
	`wordCount` integer NOT NULL,
	`relatedResourceIds` text,
	`status` text NOT NULL,
	`submittedBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_guide_submittedBy_userLink_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE INDEX `guide_titleLower_idx` ON `guide` (lower("title"));--> statement-breakpoint
CREATE INDEX `guide_excerptLower_idx` ON `guide` (lower("excerpt"));--> statement-breakpoint
CREATE INDEX `guide_createdAt_id_idx` ON `guide` (`createdAt`,`id`);--> statement-breakpoint
CREATE INDEX `guide_status_idx` ON `guide` (`status`);