CREATE TABLE `moderationAction` (
	`id` text PRIMARY KEY,
	`actorUserLinkId` text NOT NULL,
	`action` text NOT NULL,
	`target` text,
	`createdAt` integer NOT NULL,
	CONSTRAINT `fk_moderationAction_actorUserLinkId_userLink_id_fk` FOREIGN KEY (`actorUserLinkId`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `moderators` (
	`userLinkId` text PRIMARY KEY,
	`grantedBy` text,
	`grantedAt` integer NOT NULL,
	CONSTRAINT `fk_moderators_userLinkId_userLink_id_fk` FOREIGN KEY (`userLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_moderators_grantedBy_userLink_id_fk` FOREIGN KEY (`grantedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `userLink` (
	`id` text PRIMARY KEY,
	`infraUserId` text UNIQUE,
	`storagePrefix` text NOT NULL UNIQUE,
	`createdAt` integer NOT NULL,
	`deletedAt` integer
);
