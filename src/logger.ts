import pino from "pino";

import type { AppConfig } from "./config";

const REDACT_PATHS = [
	"req.headers.authorization",
	"req.headers.cookie",
	"headers.authorization",
	"headers.cookie",
	"authorization",
	"cookie",
	"apiKey",
	"api_key",
	"openaiApiKey",
	"companiesHouseApiKey",
	"OPENAI_API_KEY",
	"COMPANIES_HOUSE_API_KEY",
];

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL">) {
	return pino({
		level: config.LOG_LEVEL,
		redact: {
			paths: REDACT_PATHS,
			censor: "[REDACTED]",
		},
	});
}

export const logger = createLogger({
	LOG_LEVEL: process.env.LOG_LEVEL?.trim() || "info",
});
