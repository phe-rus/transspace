CREATE TABLE `supportPostRead` (
	`moderatorUserLinkId` text NOT NULL,
	`supportPostId` text NOT NULL,
	`readAt` integer NOT NULL,
	CONSTRAINT `supportPostRead_pk` PRIMARY KEY(`moderatorUserLinkId`, `supportPostId`),
	CONSTRAINT `fk_supportPostRead_moderatorUserLinkId_userLink_id_fk` FOREIGN KEY (`moderatorUserLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_supportPostRead_supportPostId_supportPost_id_fk` FOREIGN KEY (`supportPostId`) REFERENCES `supportPost`(`id`)
);
--> statement-breakpoint
CREATE INDEX `supportPostRead_post_idx` ON `supportPostRead` (`supportPostId`);