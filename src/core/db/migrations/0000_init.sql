CREATE TABLE `decisions` (
	`asset_id` text PRIMARY KEY NOT NULL,
	`decision` text NOT NULL,
	`decided_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `decisions_decided_at_idx` ON `decisions` (`decided_at`);--> statement-breakpoint
CREATE INDEX `decisions_decision_idx` ON `decisions` (`decision`);