CREATE TABLE `guide_series` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `guide` ADD `seriesId` text REFERENCES guide_series(id);--> statement-breakpoint
ALTER TABLE `guide` ADD `seriesOrder` integer;--> statement-breakpoint
ALTER TABLE `guide` ADD `coverImageUrl` text;--> statement-breakpoint
ALTER TABLE `guide` ADD `videoUrl` text;--> statement-breakpoint
CREATE INDEX `guide_seriesId_seriesOrder_idx` ON `guide` (`seriesId`,`seriesOrder`);--> statement-breakpoint
CREATE UNIQUE INDEX `guideSeries_titleLower_idx` ON `guide_series` (lower("title"));