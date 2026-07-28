CREATE TABLE `climate_snapshots` (
	`id` integer PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`observed_at` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`temperature_c` real NOT NULL,
	`relative_humidity_percent` real NOT NULL,
	`apparent_temperature_c` real NOT NULL,
	`precipitation_mm` real NOT NULL,
	`weather_code` integer NOT NULL,
	`is_synthetic` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `climate_snapshots` (
	`id`, `source_name`, `source_url`, `observed_at`, `retrieved_at`,
	`temperature_c`, `relative_humidity_percent`, `apparent_temperature_c`,
	`precipitation_mm`, `weather_code`, `is_synthetic`
) VALUES (
	1,
	'Open-Meteo Weather Forecast API',
	'https://api.open-meteo.com/v1/forecast?latitude=-0.9002&longitude=-89.6127&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&timezone=auto',
	'2026-07-28T23:15:00Z',
	'2026-07-28T23:23:14.140Z',
	26.4,
	75,
	29.1,
	0,
	1,
	0
);
