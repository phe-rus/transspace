CREATE TABLE `admins` (
	`userLinkId` text PRIMARY KEY,
	`grantedBy` text,
	`grantedAt` integer NOT NULL,
	CONSTRAINT `fk_admins_userLinkId_userLink_id_fk` FOREIGN KEY (`userLinkId`) REFERENCES `userLink`(`id`),
	CONSTRAINT `fk_admins_grantedBy_userLink_id_fk` FOREIGN KEY (`grantedBy`) REFERENCES `userLink`(`id`)
);
