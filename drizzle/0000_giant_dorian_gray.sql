CREATE TABLE `level_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`level_id` integer NOT NULL,
	`won` integer NOT NULL,
	`score` integer NOT NULL,
	`stars` integer NOT NULL,
	`cost` integer NOT NULL,
	`ticks` integer NOT NULL,
	`build` text NOT NULL,
	`physics_version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leaderboard_records` (
	`student_id` text NOT NULL,
	`level_id` integer NOT NULL,
	`score` integer NOT NULL,
	`cost` integer NOT NULL,
	`time` real NOT NULL,
	`parts` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`student_id`, `level_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leaderboard_rank` ON `leaderboard_records` (`level_id`,`score`);--> statement-breakpoint
CREATE TABLE `levels` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`season` integer DEFAULT 1 NOT NULL,
	`physics_version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`student_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_progress` (
	`student_id` text NOT NULL,
	`level_id` integer NOT NULL,
	`best_score` integer NOT NULL,
	`stars` integer NOT NULL,
	`cost` integer NOT NULL,
	`time` real NOT NULL,
	`parts` integer NOT NULL,
	`best_build` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`student_id`, `level_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `students` (
	`student_id` text PRIMARY KEY NOT NULL,
	`fullname` text NOT NULL,
	`class_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
