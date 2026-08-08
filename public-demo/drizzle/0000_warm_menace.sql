CREATE TABLE `demo_observations` (
	`id` integer PRIMARY KEY NOT NULL,
	`record_title` text NOT NULL,
	`category` text NOT NULL,
	`review_status` text NOT NULL,
	`data_provenance` text NOT NULL,
	`hazard` integer NOT NULL,
	`exposure` integer NOT NULL,
	`vulnerability` integer NOT NULL,
	`risk_score` integer NOT NULL,
	`risk_level` text NOT NULL,
	`observed_at` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`public_location_mode` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `demo_observations` (
	`id`, `record_title`, `category`, `review_status`, `data_provenance`,
	`hazard`, `exposure`, `vulnerability`, `risk_score`, `risk_level`,
	`observed_at`, `latitude`, `longitude`, `public_location_mode`
) VALUES
	(101, 'Controlled water route observation', 'water', 'pending', 'controlled_test', 2, 3, 2, 7, 'moderate', '2026-07-21T15:00:00Z', -0.900, -89.613, 'approximate'),
	(102, 'Controlled heat exposure review', 'heat', 'validated', 'controlled_test', 4, 4, 3, 11, 'critical', '2026-07-22T17:15:00Z', -0.906, -89.609, 'approximate'),
	(103, 'Controlled waste handling observation', 'waste', 'observed', 'controlled_test', 3, 3, 2, 8, 'moderate', '2026-07-23T14:30:00Z', -0.895, -89.617, 'approximate'),
	(104, 'Synthetic environmental marker', 'environmental_pollution', 'rejected', 'synthetic_demo', 2, 1, 2, 5, 'low', '2026-07-24T19:00:00Z', NULL, NULL, 'hidden'),
	(105, 'Public climate context reference', 'heat', 'validated', 'public_real', 2, 2, 2, 6, 'moderate', '2026-07-25T16:45:00Z', -0.901, -89.612, 'aggregate'),
	(106, 'Controlled heat route follow-up', 'heat', 'pending', 'controlled_test', 3, 3, 3, 9, 'high', '2026-07-26T18:20:00Z', -0.897, -89.606, 'approximate');
