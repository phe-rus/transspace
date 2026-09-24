CREATE TABLE `appLock` (
	`userLinkId` text PRIMARY KEY,
	`pinHash` text,
	`duressPinHash` text,
	`failedAttempts` integer DEFAULT 0 NOT NULL,
	`lockedUntil` integer,
	CONSTRAINT `fk_appLock_userLinkId_userLink_id_fk` FOREIGN KEY (`userLinkId`) REFERENCES `userLink`(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`isDecoy` integer DEFAULT false NOT NULL,
	`unlockedUntil` integer,
	CONSTRAINT `fk_session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text,
	`email` text,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY,
	`userLinkId` text NOT NULL UNIQUE,
	`displayName` text,
	`avatarSlug` text,
	`bio` text,
	`pronouns` text,
	`topics` text,
	`deletedAt` integer,
	CONSTRAINT `fk_profile_userLinkId_userLink_id_fk` FOREIGN KEY (`userLinkId`) REFERENCES `userLink`(`id`)
);
