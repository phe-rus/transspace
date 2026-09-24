CREATE TABLE `country` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`countryId` text NOT NULL,
	`city` text NOT NULL,
	`lat` real,
	`lng` real,
	`description` text NOT NULL,
	`estimate` text,
	`isFree` integer DEFAULT false NOT NULL,
	`contact` text,
	`internationalAccess` integer DEFAULT false NOT NULL,
	`structuredDetails` text,
	`status` text NOT NULL,
	`submittedBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_resource_countryId_country_id_fk` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`),
	CONSTRAINT `fk_resource_submittedBy_userLink_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `country_nameLower_idx` ON `country` (lower("name"));--> statement-breakpoint
CREATE INDEX `resource_nameLower_idx` ON `resource` (lower("name"));--> statement-breakpoint
CREATE INDEX `resource_cityLower_idx` ON `resource` (lower("city"));--> statement-breakpoint
CREATE INDEX `resource_createdAt_id_idx` ON `resource` (`createdAt`,`id`);--> statement-breakpoint
CREATE INDEX `resource_status_idx` ON `resource` (`status`);