import {
	cleanDisplayCompanyName,
	normalizeCompanyNameForMatch,
} from "../normalizers/companyName";
import { normalizeCompanyNumber } from "../normalizers/companyNumber";
import { normalizePostcode } from "../normalizers/postcode";
import { parseCompaniesHouseSicTexts } from "../normalizers/sic";
import type { Company } from "../types/company";
import { iterateCsvRecords } from "../utils/csv";

type CompaniesHouseRow = Record<string, string>;

type CompaniesHouseIndex = {
	companies: Company[];
	companiesByNumber: Map<string, Company>;
	companiesByNamePostcode: Map<string, Company[]>;
	companiesByName: Map<string, Company[]>;
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
): Promise<CompaniesHouseIndex> {
	const companies: Company[] = [];
	const companiesByNumber = new Map<string, Company>();
	const companiesByNamePostcode = new Map<string, Company[]>();
	const companiesByName = new Map<string, Company[]>();

	for await (const row of iterateCsvRecords<CompaniesHouseRow>(filePath, {
		encoding,
	})) {
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
			registeredAddress: collectRegisteredAddress(row),
		};

		companies.push(company);

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

	return {
		companies,
		companiesByNumber,
		companiesByNamePostcode,
		companiesByName,
	};
}
