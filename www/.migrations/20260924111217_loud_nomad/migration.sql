CREATE TABLE `trustCoSign` (
	`trustSignalId` text NOT NULL,
	`userLinkId` text NOT NULL,
	`createdAt` integer NOT NULL,
	CONSTRAINT `trustCoSign_pk` PRIMARY KEY(`trustSignalId`, `userLinkId`),
	CONSTRAINT `fk_trustCoSign_trustSignalId_trustSignal_id_fk` FOREIGN KEY (`trustSignalId`) REFERENCES `trustSignal`(`id`),
	CONSTRAINT `fk_trustCoSign_userLinkId_userLink_id_fk` FOREIGN KEY (`userLinkId`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustSignal` (
	`id` text PRIMARY KEY,
	`contentType` text NOT NULL,
	`contentId` text NOT NULL,
	`submittedAt` integer NOT NULL,
	`submittedBy` text NOT NULL,
	`communityReviewed` integer DEFAULT false NOT NULL,
	`coSignCount` integer DEFAULT 0 NOT NULL,
	`referencesAvailable` integer DEFAULT false NOT NULL,
	`professionalVerified` integer DEFAULT false NOT NULL,
	`professionalVerifiedBy` text,
	`disputed` integer DEFAULT false NOT NULL,
	`lastReviewedAt` integer,
	CONSTRAINT `fk_trustSignal_submittedBy_userLink_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_trustSignal_professionalVerifiedBy_userLink_id_fk` FOREIGN KEY (`professionalVerifiedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trustSignal_content_idx` ON `trustSignal` (`contentType`,`contentId`);