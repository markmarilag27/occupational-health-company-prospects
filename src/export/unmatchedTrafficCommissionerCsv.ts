import { join } from "node:path";
import { logger as defaultLogger } from "../logger";
import type { CompanyIndexes } from "../matching/matchCompanies";
import { getUnmatchedReason } from "../matching/matchCompanies";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { writeCsvRecords } from "../utils/csv";

export const UNMATCHED_TC_HEADERS = [
	"operator name",
	"company number",
	"licence number",
	"postcode",
	"status",
	"reason unmatched",
] as const;

type UnmatchedTcCsvRecord = Record<
	(typeof UNMATCHED_TC_HEADERS)[number],
	string
>;

type LogLike = {
	info: (obj: Record<string, unknown>, message: string) => void;
};

const OUTPUT_FILENAME = "unmatched_tc_operators.csv";

function toStringOrEmpty(value: string | null): string {
	return value ?? "";
}

function mapUnmatchedOperator(
	operator: TrafficCommissionerOperator,
	companyIndexes: CompanyIndexes,
): UnmatchedTcCsvRecord {
	return {
		"operator name": operator.operatorName,
		"company number": toStringOrEmpty(operator.companyNumber),
		"licence number": toStringOrEmpty(operator.licenceNumber),
		postcode: toStringOrEmpty(operator.postcode),
		status: toStringOrEmpty(operator.status),
		"reason unmatched": getUnmatchedReason(operator, companyIndexes),
	};
}

export async function exportUnmatchedTrafficCommissionerCsv(
	unmatched: TrafficCommissionerOperator[],
	companyIndexes: CompanyIndexes,
	exportDir: string,
	log: LogLike = defaultLogger,
): Promise<string> {
	const outputPath = join(exportDir, OUTPUT_FILENAME);
	const rows = unmatched.map((operator) =>
		mapUnmatchedOperator(operator, companyIndexes),
	);

	await writeCsvRecords(outputPath, UNMATCHED_TC_HEADERS, rows);

	log.info(
		{
			outputPath,
			rowCount: rows.length,
		},
		"Unmatched Traffic Commissioner operators export complete",
	);

	return outputPath;
}
