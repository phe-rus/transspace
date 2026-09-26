ALTER TABLE `guide` ADD `threadType` text;--> statement-breakpoint
ALTER TABLE `guide` ADD `lastActivityAt` integer;--> statement-breakpoint
ALTER TABLE `userLink` ADD `joinedCommunities` text;--> statement-breakpoint
CREATE INDEX `guide_thread_idx` ON `guide` (`kind`,`category`,`status`,`lastActivityAt`);