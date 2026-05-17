import { join } from "node:path";

import { SALES_REVIEW_CSV_HEADERS } from "../export/salesReviewCsv";
import { readCsvRecords, writeCsvRecords } from "../utils/csv";
import { fetchCompanyDirectors } from "./companiesHouseClient";
import { generateAiOutreachHook } from "./openaiOutreach";

type EnrichOptions = {
	exportDir: string;
	companiesHouseApiKey?: string;
	openAiApiKey?: string;
	enableAi: boolean;
	limit: number;
	log: {
		info: (obj: Record<string, unknown>, message: string) => void;
		warn: (obj: Record<string, unknown>, message: string) => void;
	};
};

type EnrichSummary = {
	outputPath: string;
	totalRows: number;
	rowsProcessed: number;
	directorsUpdated: number;
	aiHooksUpdated: number;
};

const OUTPUT_FILENAME = "fleet_prospect_profiles.csv";

function normalizeLimit(limit: number): number {
	if (limit === Number.POSITIVE_INFINITY) {
		return Number.POSITIVE_INFINITY;
	}
	return Number.isFinite(limit) && limit >= 0 ? Math.floor(limit) : 0;
}

export async function enrichFleetProspects(
	options: EnrichOptions,
): Promise<EnrichSummary> {
	const outputPath = join(options.exportDir, OUTPUT_FILENAME);
	const rows = await readCsvRecords(outputPath);
	const normalizedLimit = normalizeLimit(options.limit);
	const maxRows =
		normalizedLimit === Number.POSITIVE_INFINITY
			? rows.length
			: Math.min(rows.length, normalizedLimit);

	let directorsUpdated = 0;
	let aiHooksUpdated = 0;

	for (let i = 0; i < maxRows; i += 1) {
		const row = rows[i];
		const companyNumber = (row["company number"] ?? "").trim();

		if (
			options.companiesHouseApiKey &&
			companyNumber.length > 0 &&
			(row.directors ?? "").trim().length === 0
		) {
			try {
				const directors = await fetchCompanyDirectors(
					companyNumber,
					options.companiesHouseApiKey,
				);
				if (directors && directors.length > 0) {
					row.directors = directors.slice(0, 5).join("; ");
					directorsUpdated += 1;
				}
			} catch (error) {
				options.log.warn(
					{
						companyNumber,
						error: error instanceof Error ? error.message : String(error),
					},
					"Companies House enrichment failed for row",
				);
			}
		}

		if (
			options.enableAi &&
			options.openAiApiKey &&
			(row["AI outreach hook"] ?? "").trim().length === 0
		) {
			try {
				const hook = await generateAiOutreachHook(row, options.openAiApiKey);
				if (hook) {
					row["AI outreach hook"] = hook;
					aiHooksUpdated += 1;
				}
			} catch (error) {
				options.log.warn(
					{
						companyNumber,
						error: error instanceof Error ? error.message : String(error),
					},
					"AI outreach enrichment failed for row",
				);
			}
		}
	}

	await writeCsvRecords(outputPath, SALES_REVIEW_CSV_HEADERS, rows);

	options.log.info(
		{
			outputPath,
			totalRows: rows.length,
			rowsProcessed: maxRows,
			directorsUpdated,
			aiHooksUpdated,
		},
		"Fleet prospect enrichment complete",
	);

	return {
		outputPath,
		totalRows: rows.length,
		rowsProcessed: maxRows,
		directorsUpdated,
		aiHooksUpdated,
	};
}
