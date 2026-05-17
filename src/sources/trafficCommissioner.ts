import {
	cleanDisplayCompanyName,
	normalizeCompanyNameForMatch,
} from "../normalizers/companyName";
import { normalizeCompanyNumber } from "../normalizers/companyNumber";
import { safeInteger } from "../normalizers/numbers";
import { normalizePostcode } from "../normalizers/postcode";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { iterateCsvRecords } from "../utils/csv";

type TrafficCommissionerRow = Record<string, string>;

type TrafficCommissionerLoadOptions = {
	onProgress?: (processedRows: number) => void;
	progressEveryRows?: number;
};

const FIELD_ALIASES = {
	operatorName: [
		"operatorname",
		"operator",
		"companyname",
		"company",
		"organisationname",
		"organizationname",
		"name",
	],
	companyNumber: [
		"companyregistrationnumber",
		"companynumber",
		"companyno",
		"registrationnumber",
		"crn",
	],
	licenceNumber: [
		"licencenumber",
		"licensenumber",
		"licenceno",
		"licenseno",
		"operatorlicencenumber",
		"operatorlicensenumber",
	],
	licenceType: [
		"licencetype",
		"licensetype",
		"operatorlicencetype",
		"operatorlicensetype",
	],
	trafficArea: ["trafficarea", "region", "trafficregion", "area"],
	authorisedVehicles: [
		"authorisedvehicles",
		"authorizedvehicles",
		"totalvehicles",
		"vehicles",
	],
	authorisedTrailers: [
		"authorisedtrailers",
		"authorizedtrailers",
		"totaltrailers",
		"trailers",
	],
	postcode: ["postcode", "post code", "postalcode", "zip"],
	status: ["status", "licencestatus", "licensestatus", "operatorstatus"],
} as const;

function normalizeHeaderName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function toNullableTrimmed(value: string | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function buildHeaderIndex(row: TrafficCommissionerRow): Map<string, string> {
	const index = new Map<string, string>();

	for (const key of Object.keys(row)) {
		index.set(normalizeHeaderName(key), key);
	}

	return index;
}

function pickField(
	row: TrafficCommissionerRow,
	headerIndex: Map<string, string>,
	aliases: readonly string[],
): string | undefined {
	for (const alias of aliases) {
		const resolvedKey = headerIndex.get(normalizeHeaderName(alias));
		if (!resolvedKey) {
			continue;
		}
		return row[resolvedKey];
	}

	return undefined;
}

export async function loadTrafficCommissionerOperators(
	filePath: string,
	options: TrafficCommissionerLoadOptions = {},
): Promise<TrafficCommissionerOperator[]> {
	const operators: TrafficCommissionerOperator[] = [];
	let headerIndex: Map<string, string> | null = null;
	let dataRowIndex = 0;
	const progressEveryRows = options.progressEveryRows ?? 10_000;

	for await (const row of iterateCsvRecords<TrafficCommissionerRow>(filePath)) {
		dataRowIndex += 1;
		if (
			options.onProgress &&
			progressEveryRows > 0 &&
			dataRowIndex % progressEveryRows === 0
		) {
			options.onProgress(dataRowIndex);
		}

		if (headerIndex === null) {
			headerIndex = buildHeaderIndex(row);
		}

		const operatorName = cleanDisplayCompanyName(
			pickField(row, headerIndex, FIELD_ALIASES.operatorName),
		);
		const normalizedOperatorName = normalizeCompanyNameForMatch(operatorName);

		if (operatorName.length === 0 || normalizedOperatorName.length === 0) {
			continue;
		}

		const operator: TrafficCommissionerOperator = {
			sourceRowNumber: dataRowIndex + 1,
			operatorName,
			normalizedOperatorName,
			companyNumber: normalizeCompanyNumber(
				pickField(row, headerIndex, FIELD_ALIASES.companyNumber),
			),
			licenceNumber: toNullableTrimmed(
				pickField(row, headerIndex, FIELD_ALIASES.licenceNumber),
			),
			licenceType: toNullableTrimmed(
				pickField(row, headerIndex, FIELD_ALIASES.licenceType),
			),
			trafficArea: toNullableTrimmed(
				pickField(row, headerIndex, FIELD_ALIASES.trafficArea),
			),
			authorisedVehicles: safeInteger(
				pickField(row, headerIndex, FIELD_ALIASES.authorisedVehicles),
			),
			authorisedTrailers: safeInteger(
				pickField(row, headerIndex, FIELD_ALIASES.authorisedTrailers),
			),
			postcode: normalizePostcode(
				pickField(row, headerIndex, FIELD_ALIASES.postcode),
			),
			status: toNullableTrimmed(
				pickField(row, headerIndex, FIELD_ALIASES.status),
			),
		};

		operators.push(operator);
	}

	if (options.onProgress && dataRowIndex % progressEveryRows !== 0) {
		options.onProgress(dataRowIndex);
	}

	return operators;
}
