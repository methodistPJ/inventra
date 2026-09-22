CREATE TABLE `weekly_records` (
	`week` text NOT NULL,
	`student_id` text NOT NULL,
	`level_id` integer NOT NULL,
	`cost` integer NOT NULL,
	`parts` integer NOT NULL,
	`time` real NOT NULL,
	PRIMARY KEY(`week`, `student_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE no action
);
