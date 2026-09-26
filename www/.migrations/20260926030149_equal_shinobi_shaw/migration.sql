ALTER TABLE `userLink` ADD `displayName` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `avatarSlug` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `pronouns` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `topics` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `ageRange` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `pinHash` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `duressPinHash` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `failedAttempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `userLink` ADD `lockedUntil` integer;--> statement-breakpoint
ALTER TABLE `userLink` ADD `moderatorGrantedAt` integer;--> statement-breakpoint
ALTER TABLE `userLink` ADD `moderatorGrantedBy` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `moderatorCountryCode` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `adminRole` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `adminGrantedBy` text;--> statement-breakpoint
ALTER TABLE `userLink` ADD `adminGrantedAt` integer;--> statement-breakpoint
-- copy first, drop after: every person keeps their profile, PIN state, moderator status and admin role (spec 0008 AC-3)
UPDATE `userLink` SET
  `displayName` = (SELECT p.`displayName` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `avatarSlug` = (SELECT p.`avatarSlug` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `bio` = (SELECT p.`bio` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `pronouns` = (SELECT p.`pronouns` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `topics` = (SELECT p.`topics` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `ageRange` = (SELECT p.`ageRange` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`),
  `deletedAt` = COALESCE(`userLink`.`deletedAt`, (SELECT p.`deletedAt` FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`))
WHERE EXISTS (SELECT 1 FROM `profile` p WHERE p.`userLinkId` = `userLink`.`id`);--> statement-breakpoint
UPDATE `userLink` SET
  `pinHash` = (SELECT a.`pinHash` FROM `appLock` a WHERE a.`userLinkId` = `userLink`.`id`),
  `duressPinHash` = (SELECT a.`duressPinHash` FROM `appLock` a WHERE a.`userLinkId` = `userLink`.`id`),
  `failedAttempts` = (SELECT a.`failedAttempts` FROM `appLock` a WHERE a.`userLinkId` = `userLink`.`id`),
  `lockedUntil` = (SELECT a.`lockedUntil` FROM `appLock` a WHERE a.`userLinkId` = `userLink`.`id`)
WHERE EXISTS (SELECT 1 FROM `appLock` a WHERE a.`userLinkId` = `userLink`.`id`);--> statement-breakpoint
UPDATE `userLink` SET
  `moderatorGrantedAt` = (SELECT m.`grantedAt` FROM `moderators` m WHERE m.`userLinkId` = `userLink`.`id`),
  `moderatorGrantedBy` = (SELECT m.`grantedBy` FROM `moderators` m WHERE m.`userLinkId` = `userLink`.`id`),
  `moderatorCountryCode` = (SELECT m.`countryCode` FROM `moderators` m WHERE m.`userLinkId` = `userLink`.`id`)
WHERE EXISTS (SELECT 1 FROM `moderators` m WHERE m.`userLinkId` = `userLink`.`id`);--> statement-breakpoint
UPDATE `userLink` SET
  `adminRole` = (SELECT a.`role` FROM `admins` a WHERE a.`userLinkId` = `userLink`.`id`),
  `adminGrantedBy` = (SELECT a.`grantedBy` FROM `admins` a WHERE a.`userLinkId` = `userLink`.`id`),
  `adminGrantedAt` = (SELECT a.`grantedAt` FROM `admins` a WHERE a.`userLinkId` = `userLink`.`id`)
WHERE EXISTS (SELECT 1 FROM `admins` a WHERE a.`userLinkId` = `userLink`.`id`);--> statement-breakpoint
DROP TABLE `appLock`;--> statement-breakpoint
DROP TABLE `admins`;--> statement-breakpoint
DROP TABLE `moderators`;--> statement-breakpoint
DROP TABLE `profile`;