import { z } from "zod";

const nonEmptyPath = z.string().trim().min(1, "Path must not be empty");

const optionalApiKey = z.preprocess((value) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const thresholdSchema = z.coerce
	.number()
	.int("Threshold must be an integer")
	.min(0, "Threshold must be >= 0")
	.max(100, "Threshold must be <= 100");

const rawConfigSchema = z.object({
	NODE_ENV: z.string().trim().default("development"),
	LOG_LEVEL: z.string().trim().default("info"),

	DATA_DIR: nonEmptyPath.default("data"),
	RAW_DIR: nonEmptyPath.default("data/raw"),
	PROCESSED_DIR: nonEmptyPath.default("data/processed"),
	EXPORT_DIR: nonEmptyPath.default("data/exports"),

	CH_BULK_FILE: nonEmptyPath.default(
		"data/raw/companies_house/BasicCompanyDataAsOneFile.csv",
	),
	CH_BULK_ENCODING: z.string().trim().default("latin1"),

	TC_CSV_FILE: nonEmptyPath.default(
		"data/raw/traffic_commissioner/tc_operators.csv",
	),
	TC_REGION: z.string().trim().default(""),

	SCORE_IMMEDIATE_THRESHOLD: thresholdSchema.default(80),
	SCORE_HIGH_THRESHOLD: thresholdSchema.default(65),

	COMPANIES_HOUSE_API_KEY: optionalApiKey,
	OPENAI_API_KEY: optionalApiKey,
});

const configSchema = rawConfigSchema.superRefine((value, ctx) => {
	if (value.SCORE_IMMEDIATE_THRESHOLD < value.SCORE_HIGH_THRESHOLD) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["SCORE_IMMEDIATE_THRESHOLD"],
			message:
				"SCORE_IMMEDIATE_THRESHOLD must be greater than or equal to SCORE_HIGH_THRESHOLD",
		});
	}
});

export type AppConfig = z.infer<typeof rawConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
	return configSchema.parse(env);
}
