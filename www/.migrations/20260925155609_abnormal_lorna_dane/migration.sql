ALTER TABLE `admins` ADD `role` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `moderators` ADD `countryCode` text;--> statement-breakpoint
ALTER TABLE `supportPost` ADD `requestorCountryCode` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `bannedAt` integer;--> statement-breakpoint
ALTER TABLE `userLink` ADD `bannedBy` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `banReason` text;--> statement-breakpoint
CREATE INDEX `supportPost_countryCode_idx` ON `supportPost` (`requestorCountryCode`);--> statement-breakpoint
UPDATE `admins` SET `role` = 'super_admin' WHERE `grantedBy` IS NULL;