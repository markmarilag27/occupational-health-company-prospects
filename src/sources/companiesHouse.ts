import {
	cleanDisplayCompanyName,
	normalizeCompanyNameForMatch,
} from "../normalizers/companyName";
import { normalizeCompanyNumber } from "../normalizers/companyNumber";
import { normalizePostcode } from "../normalizers/postcode";
import { parseCompaniesHouseSicTexts } from "../normalizers/sic";
import type { Company } from "../types/company";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { iterateCsvRecords } from "../utils/csv";

type CompaniesHouseRow = Record<string, string>;

type CompaniesHouseIndex = {
	companyCount: number;
	companiesByNumber: Map<string, Company>;
	companiesByNamePostcode: Map<string, Company[]>;
	companiesByName: Map<string, Company[]>;
};

type CompaniesHouseLoadOptions = {
	onProgress?: (processedRows: number) => void;
	progressEveryRows?: number;
	includeRegisteredAddress?: boolean;
};

type CompaniesHouseCandidateFilters = {
	companyNumbers: Set<string>;
	normalizedNames: Set<string>;
	namePostcodeKeys: Set<string>;
};

function toNullableTrimmed(value: string | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function buildNamePostcodeKey(
	normalizedName: string,
	postcode: string | null,
): string | null {
	if (normalizedName.length === 0 || postcode === null) {
		return null;
	}
	return `${normalizedName}|${postcode}`;
}

function pushToMapArray<K, V>(map: Map<K, V[]>, key: K, value: V): void {
	const existing = map.get(key);
	if (existing) {
		existing.push(value);
		return;
	}
	map.set(key, [value]);
}

function collectRegisteredAddress(
	row: CompaniesHouseRow,
): Record<string, string | null> {
	const registeredAddress: Record<string, string | null> = {};

	for (const [key, value] of Object.entries(row)) {
		if (!key.startsWith("RegAddress.")) {
			continue;
		}
		registeredAddress[key] = toNullableTrimmed(value);
	}

	return registeredAddress;
}

export async function loadCompaniesHouseCompanies(
	filePath: string,
	encoding: BufferEncoding,
	options: CompaniesHouseLoadOptions = {},
): Promise<CompaniesHouseIndex> {
	let companyCount = 0;
	const companiesByNumber = new Map<string, Company>();
	const companiesByNamePostcode = new Map<string, Company[]>();
	const companiesByName = new Map<string, Company[]>();
	const progressEveryRows = options.progressEveryRows ?? 50_000;
	const includeRegisteredAddress = options.includeRegisteredAddress ?? false;
	let processedRows = 0;

	for await (const row of iterateCsvRecords<CompaniesHouseRow>(filePath, {
		encoding,
	})) {
		processedRows += 1;
		if (
			options.onProgress &&
			progressEveryRows > 0 &&
			processedRows % progressEveryRows === 0
		) {
			options.onProgress(processedRows);
		}

		const companyName = cleanDisplayCompanyName(row.CompanyName);
		const normalizedCompanyName = normalizeCompanyNameForMatch(row.CompanyName);
		const normalizedCompanyNumber = normalizeCompanyNumber(row.CompanyNumber);

		if (
			companyName.length === 0 ||
			normalizedCompanyName.length === 0 ||
			normalizedCompanyNumber === null
		) {
			continue;
		}

		const company: Company = {
			companyNumber: normalizedCompanyNumber,
			companyName,
			normalizedCompanyName,
			companyStatus: toNullableTrimmed(row.CompanyStatus),
			postcode: normalizePostcode(row["RegAddress.PostCode"]),
			sicCodes: parseCompaniesHouseSicTexts(row),
			incorporationDate: toNullableTrimmed(row.IncorporationDate),
			registeredAddress: includeRegisteredAddress
				? collectRegisteredAddress(row)
				: {},
		};

		companyCount += 1;

		companiesByNumber.set(company.companyNumber, company);

		pushToMapArray(companiesByName, company.normalizedCompanyName, company);

		const namePostcodeKey = buildNamePostcodeKey(
			company.normalizedCompanyName,
			company.postcode,
		);
		if (namePostcodeKey !== null) {
			pushToMapArray(companiesByNamePostcode, namePostcodeKey, company);
		}
	}

	if (options.onProgress && processedRows % progressEveryRows !== 0) {
		options.onProgress(processedRows);
	}

	return {
		companyCount,
		companiesByNumber,
		companiesByNamePostcode,
		companiesByName,
	};
}

function buildCompanyFromRow(
	row: CompaniesHouseRow,
	includeRegisteredAddress: boolean,
): Company | null {
	const companyName = cleanDisplayCompanyName(row.CompanyName);
	const normalizedCompanyName = normalizeCompanyNameForMatch(row.CompanyName);
	const normalizedCompanyNumber = normalizeCompanyNumber(row.CompanyNumber);

	if (
		companyName.length === 0 ||
		normalizedCompanyName.length === 0 ||
		normalizedCompanyNumber === null
	) {
		return null;
	}

	return {
		companyNumber: normalizedCompanyNumber,
		companyName,
		normalizedCompanyName,
		companyStatus: toNullableTrimmed(row.CompanyStatus),
		postcode: normalizePostcode(row["RegAddress.PostCode"]),
		sicCodes: parseCompaniesHouseSicTexts(row),
		incorporationDate: toNullableTrimmed(row.IncorporationDate),
		registeredAddress: includeRegisteredAddress
			? collectRegisteredAddress(row)
			: {},
	};
}

function buildCandidateFilters(
	operators: TrafficCommissionerOperator[],
): CompaniesHouseCandidateFilters {
	const companyNumbers = new Set<string>();
	const normalizedNames = new Set<string>();
	const namePostcodeKeys = new Set<string>();

	for (const operator of operators) {
		if (operator.companyNumber) {
			companyNumbers.add(operator.companyNumber);
		}

		if (operator.normalizedOperatorName.length > 0) {
			normalizedNames.add(operator.normalizedOperatorName);
			const key = buildNamePostcodeKey(
				operator.normalizedOperatorName,
				operator.postcode,
			);
			if (key) {
				namePostcodeKeys.add(key);
			}
		}
	}

	return {
		companyNumbers,
		normalizedNames,
		namePostcodeKeys,
	};
}

export async function loadCompaniesHouseForOperatorCandidates(
	filePath: string,
	encoding: BufferEncoding,
	operators: TrafficCommissionerOperator[],
	options: CompaniesHouseLoadOptions = {},
): Promise<CompaniesHouseIndex> {
	const companiesByNumber = new Map<string, Company>();
	const companiesByNamePostcode = new Map<string, Company[]>();
	const companiesByName = new Map<string, Company[]>();
	const progressEveryRows = options.progressEveryRows ?? 50_000;
	const includeRegisteredAddress = options.includeRegisteredAddress ?? false;
	let processedRows = 0;
	let companyCount = 0;
	const candidateFilters = buildCandidateFilters(operators);

	for await (const row of iterateCsvRecords<CompaniesHouseRow>(filePath, {
		encoding,
	})) {
		processedRows += 1;
		if (
			options.onProgress &&
			progressEveryRows > 0 &&
			processedRows % progressEveryRows === 0
		) {
			options.onProgress(processedRows);
		}

		const company = buildCompanyFromRow(row, includeRegisteredAddress);
		if (!company) {
			continue;
		}

		companyCount += 1;

		const namePostcodeKey = buildNamePostcodeKey(
			company.normalizedCompanyName,
			company.postcode,
		);
		const keepByNumber = candidateFilters.companyNumbers.has(
			company.companyNumber,
		);
		const keepByName = candidateFilters.normalizedNames.has(
			company.normalizedCompanyName,
		);
		const keepByNamePostcode =
			namePostcodeKey !== null &&
			candidateFilters.namePostcodeKeys.has(namePostcodeKey);

		if (keepByNumber) {
			companiesByNumber.set(company.companyNumber, company);
		}

		if (keepByName) {
			pushToMapArray(companiesByName, company.normalizedCompanyName, company);
		}

		if (keepByNamePostcode && namePostcodeKey !== null) {
			pushToMapArray(companiesByNamePostcode, namePostcodeKey, company);
		}
	}

	if (options.onProgress && processedRows % progressEveryRows !== 0) {
		options.onProgress(processedRows);
	}

	return {
		companyCount,
		companiesByNumber,
		companiesByNamePostcode,
		companiesByName,
	};
}
