CREATE TABLE `message` (
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`contentType` text,
	`contentId` text,
	`toUserLinkId` text,
	`authorUserLinkId` text NOT NULL,
	`parentId` text,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`readAt` integer,
	`createdAt` integer NOT NULL,
	CONSTRAINT `fk_message_toUserLinkId_userLink_id_fk` FOREIGN KEY (`toUserLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_message_authorUserLinkId_userLink_id_fk` FOREIGN KEY (`authorUserLinkId`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
ALTER TABLE `userLink` ADD `blockedUserIds` text;--> statement-breakpoint
CREATE INDEX `message_content_idx` ON `message` (`kind`,`contentType`,`contentId`,`createdAt`);