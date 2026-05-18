import { Command } from "commander";
import { ZodError } from "zod";

import { loadConfig } from "./config";
import { enrichFleetProspects } from "./enrichment/enrichFleetProspects";
import { exportSalesReviewCsv } from "./export/salesReviewCsv";
import { exportUnmatchedTrafficCommissionerCsv } from "./export/unmatchedTrafficCommissionerCsv";
import { logger } from "./logger";
import { matchFleetOperatorsToCompanies } from "./matching/matchCompanies";
import { buildFleetProspectProfiles } from "./prospects/buildFleetProspectProfiles";
import { loadCompaniesHouseForOperatorCandidates } from "./sources/companiesHouse";
import { loadTrafficCommissionerOperators } from "./sources/trafficCommissioner";
import {
	ensureDirectoriesExist,
	ensureParentDirectory,
	inputFileExists,
} from "./utils/filesystem";

function toBooleanPresence(value: string | undefined): boolean {
	return Boolean(value);
}

async function runDoctor(): Promise<void> {
	try {
		const config = loadConfig();

		await ensureDirectoriesExist([
			config.DATA_DIR,
			config.RAW_DIR,
			config.PROCESSED_DIR,
			config.EXPORT_DIR,
		]);

		await Promise.all([
			ensureParentDirectory(config.CH_BULK_FILE),
			ensureParentDirectory(config.TC_CSV_FILE),
		]);

		console.log("doctor: ok");
		console.log(`NODE_ENV: ${config.NODE_ENV}`);
		console.log(`LOG_LEVEL: ${config.LOG_LEVEL}`);
		console.log(`DATA_DIR: ${config.DATA_DIR}`);
		console.log(`RAW_DIR: ${config.RAW_DIR}`);
		console.log(`PROCESSED_DIR: ${config.PROCESSED_DIR}`);
		console.log(`EXPORT_DIR: ${config.EXPORT_DIR}`);
		console.log(`CH_BULK_FILE: ${config.CH_BULK_FILE}`);
		console.log(`TC_CSV_FILE: ${config.TC_CSV_FILE}`);
		console.log(
			`SCORE_IMMEDIATE_THRESHOLD: ${config.SCORE_IMMEDIATE_THRESHOLD}`,
		);
		console.log(`SCORE_HIGH_THRESHOLD: ${config.SCORE_HIGH_THRESHOLD}`);
		console.log(`CH_PROGRESS_EVERY_ROWS: ${config.CH_PROGRESS_EVERY_ROWS}`);
		console.log(`TC_PROGRESS_EVERY_ROWS: ${config.TC_PROGRESS_EVERY_ROWS}`);
		console.log(
			`OPENAI_API_KEY present: ${toBooleanPresence(config.OPENAI_API_KEY)}`,
		);
		console.log(
			`COMPANIES_HOUSE_API_KEY present: ${toBooleanPresence(
				config.COMPANIES_HOUSE_API_KEY,
			)}`,
		);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error("doctor: config validation failed");
			for (const issue of error.issues) {
				const path = issue.path.join(".") || "(root)";
				console.error(`- ${path}: ${issue.message}`);
			}
			process.exitCode = 1;
			return;
		}

		const message = error instanceof Error ? error.message : String(error);
		console.error(`doctor: failed: ${message}`);
		process.exitCode = 1;
	}
}

type BuildSummary = {
	companiesLoaded: number;
	operatorsLoaded: number;
	matchedCount: number;
	unmatchedCount: number;
	profilesExported: number;
	outputPath: string;
	unmatchedOutputPath: string | null;
};

type BuildResult =
	| { ok: true; summary: BuildSummary }
	| { ok: false; reason: string };

type BuildProgress =
	| { stage: "start"; message: string }
	| { stage: "directories"; message: string }
	| { stage: "input-check"; message: string }
	| { stage: "load-companies-house"; message: string; processedRows?: number }
	| {
			stage: "load-traffic-commissioner";
			message: string;
			processedRows?: number;
	  }
	| { stage: "matching"; message: string }
	| { stage: "build-profiles"; message: string }
	| { stage: "export-sales-review"; message: string }
	| { stage: "export-unmatched"; message: string }
	| { stage: "complete"; message: string };

type BuildOptions = {
	onProgress?: (progress: BuildProgress) => void;
	exportLimit?: number;
};

function formatMemoryUsageForProgress(): string {
	const usage = process.memoryUsage();
	const rssMb = Math.round(usage.rss / (1024 * 1024));
	const heapUsedMb = Math.round(usage.heapUsed / (1024 * 1024));
	return `rss=${rssMb}MB heapUsed=${heapUsedMb}MB`;
}

export async function runBuildFleetProspects(
	env: NodeJS.ProcessEnv = process.env,
	options: BuildOptions = {},
): Promise<BuildResult> {
	const reportProgress = (progress: BuildProgress): void => {
		options.onProgress?.(progress);
	};

	reportProgress({
		stage: "start",
		message: "Starting Fleet / Transport prospect profile build",
	});

	const config = loadConfig(env);

	reportProgress({
		stage: "directories",
		message: "Ensuring data directories exist",
	});

	await ensureDirectoriesExist([
		config.DATA_DIR,
		config.RAW_DIR,
		config.PROCESSED_DIR,
		config.EXPORT_DIR,
	]);

	reportProgress({
		stage: "input-check",
		message: "Checking required CSV inputs",
	});

	const hasCompaniesHouseCsv = await inputFileExists(config.CH_BULK_FILE);
	if (!hasCompaniesHouseCsv) {
		return {
			ok: false,
			reason: `Missing Companies House CSV: ${config.CH_BULK_FILE}`,
		};
	}

	const hasTrafficCommissionerCsv = await inputFileExists(config.TC_CSV_FILE);
	if (!hasTrafficCommissionerCsv) {
		return {
			ok: false,
			reason: `Missing Traffic Commissioner CSV: ${config.TC_CSV_FILE}`,
		};
	}

	reportProgress({
		stage: "load-traffic-commissioner",
		message: "Loading Traffic Commissioner CSV",
	});

	const operators = await loadTrafficCommissionerOperators(config.TC_CSV_FILE, {
		progressEveryRows: config.TC_PROGRESS_EVERY_ROWS,
		onProgress: (processedRows) =>
			reportProgress({
				stage: "load-traffic-commissioner",
				message: `Loading Traffic Commissioner CSV (${processedRows} rows processed, ${formatMemoryUsageForProgress()})`,
				processedRows,
			}),
	});
	reportProgress({
		stage: "load-companies-house",
		message: "Loading Companies House CSV",
	});

	const companyIndexes = await loadCompaniesHouseForOperatorCandidates(
		config.CH_BULK_FILE,
		config.CH_BULK_ENCODING as BufferEncoding,
		operators,
		{
			progressEveryRows: config.CH_PROGRESS_EVERY_ROWS,
			onProgress: (processedRows) =>
				reportProgress({
					stage: "load-companies-house",
					message: `Loading Companies House CSV (${processedRows} rows processed, ${formatMemoryUsageForProgress()})`,
					processedRows,
				}),
		},
	);

	reportProgress({
		stage: "matching",
		message:
			"Matching Traffic Commissioner operators to Companies House companies",
	});

	const { matched, unmatched } = matchFleetOperatorsToCompanies(
		operators,
		companyIndexes,
	);

	if (matched.length === 0) {
		return {
			ok: false,
			reason:
				"No matched fleet operators were found between Traffic Commissioner and Companies House data",
		};
	}

	reportProgress({
		stage: "build-profiles",
		message: "Building Fleet / Transport prospect profiles",
	});

	const profiles = buildFleetProspectProfiles(matched, {
		SCORE_IMMEDIATE_THRESHOLD: config.SCORE_IMMEDIATE_THRESHOLD,
		SCORE_HIGH_THRESHOLD: config.SCORE_HIGH_THRESHOLD,
	});
	const exportLimit =
		typeof options.exportLimit === "number" &&
		Number.isFinite(options.exportLimit)
			? Math.max(0, Math.floor(options.exportLimit))
			: Number.POSITIVE_INFINITY;
	const profilesToExport = profiles.slice(0, exportLimit);

	reportProgress({
		stage: "export-sales-review",
		message: "Exporting sales review CSV",
	});

	let outputPath: string;
	try {
		outputPath = await exportSalesReviewCsv(
			profilesToExport,
			config.EXPORT_DIR,
			logger,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			ok: false,
			reason: `Failed to write sales review CSV: ${message}`,
		};
	}

	let unmatchedOutputPath: string | null = null;
	if (unmatched.length > 0) {
		reportProgress({
			stage: "export-unmatched",
			message: "Exporting unmatched Traffic Commissioner rows",
		});

		try {
			unmatchedOutputPath = await exportUnmatchedTrafficCommissionerCsv(
				unmatched,
				companyIndexes,
				config.EXPORT_DIR,
				logger,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				ok: false,
				reason: `Failed to write unmatched Traffic Commissioner export: ${message}`,
			};
		}
	}

	reportProgress({
		stage: "complete",
		message: "Build complete",
	});

	return {
		ok: true,
		summary: {
			companiesLoaded: companyIndexes.companyCount,
			operatorsLoaded: operators.length,
			matchedCount: matched.length,
			unmatchedCount: unmatched.length,
			profilesExported: profilesToExport.length,
			outputPath,
			unmatchedOutputPath,
		},
	};
}

async function runBuildFleetProspectsCommand(options: {
	limit?: string;
}): Promise<void> {
	try {
		const exportLimit = options.limit ? Number(options.limit) : undefined;
		const result = await runBuildFleetProspects(process.env, {
			exportLimit,
			onProgress: (progress) => {
				console.log(`build:fleet-prospects: ${progress.message}`);
			},
		});
		if (!result.ok) {
			console.error(`build:fleet-prospects: failed: ${result.reason}`);
			process.exitCode = 1;
			return;
		}

		console.log("build:fleet-prospects: ok");
		console.log(`Companies loaded: ${result.summary.companiesLoaded}`);
		console.log(
			`Traffic Commissioner operators loaded: ${result.summary.operatorsLoaded}`,
		);
		console.log(`Matched operators: ${result.summary.matchedCount}`);
		console.log(`Unmatched operators: ${result.summary.unmatchedCount}`);
		console.log(
			`Prospect profiles exported: ${result.summary.profilesExported}`,
		);
		console.log(`Output: ${result.summary.outputPath}`);
		if (result.summary.unmatchedOutputPath) {
			console.log(`Unmatched output: ${result.summary.unmatchedOutputPath}`);
		}
	} catch (error) {
		if (error instanceof ZodError) {
			console.error("build:fleet-prospects: config validation failed");
			for (const issue of error.issues) {
				const path = issue.path.join(".") || "(root)";
				console.error(`- ${path}: ${issue.message}`);
			}
			process.exitCode = 1;
			return;
		}

		const message = error instanceof Error ? error.message : String(error);
		console.error(`build:fleet-prospects: failed: ${message}`);
		process.exitCode = 1;
	}
}

async function runEnrichFleetProspectsCommand(options: {
	ai?: boolean;
	limit?: string;
}): Promise<void> {
	try {
		const config = loadConfig(process.env);
		const limit = options.limit
			? Number(options.limit)
			: Number.POSITIVE_INFINITY;

		if (!config.COMPANIES_HOUSE_API_KEY) {
			console.log("COMPANIES_HOUSE_API_KEY present: false");
		} else {
			console.log("COMPANIES_HOUSE_API_KEY present: true");
		}

		if (!config.OPENAI_API_KEY) {
			console.log("OPENAI_API_KEY present: false");
		} else {
			console.log("OPENAI_API_KEY present: true");
		}

		const summary = await enrichFleetProspects({
			exportDir: config.EXPORT_DIR,
			companiesHouseApiKey: config.COMPANIES_HOUSE_API_KEY,
			openAiApiKey: config.OPENAI_API_KEY,
			enableAi: Boolean(options.ai),
			limit,
			log: logger,
		});

		console.log("enrich:fleet-prospects: ok");
		console.log(`Rows processed: ${summary.rowsProcessed}`);
		console.log(`Directors updated: ${summary.directorsUpdated}`);
		console.log(`AI outreach hooks updated: ${summary.aiHooksUpdated}`);
		console.log(`Output: ${summary.outputPath}`);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error("enrich:fleet-prospects: config validation failed");
			for (const issue of error.issues) {
				const path = issue.path.join(".") || "(root)";
				console.error(`- ${path}: ${issue.message}`);
			}
			process.exitCode = 1;
			return;
		}

		const message = error instanceof Error ? error.message : String(error);
		console.error(`enrich:fleet-prospects: failed: ${message}`);
		process.exitCode = 1;
	}
}

const program = new Command();

program.name("cli");
program.description("Occupational health company prospect profile CLI");

program
	.command("doctor")
	.description("Validate config and ensure required data directories exist")
	.action(runDoctor);

program
	.command("build:fleet-prospects")
	.description(
		"Build Fleet / Transport company prospect profiles and export sales review CSV",
	)
	.option("--limit <number>", "Limit rows to export in sales review CSV")
	.action(runBuildFleetProspectsCommand);

program
	.command("enrich:fleet-prospects")
	.description(
		"Optionally enrich existing Fleet / Transport prospect profiles with directors and AI outreach hooks",
	)
	.option("--ai", "Enable AI outreach hook enrichment")
	.option("--limit <number>", "Limit rows to enrich", "50")
	.action(runEnrichFleetProspectsCommand);

if (import.meta.main) {
	void program.parseAsync(process.argv);
}
