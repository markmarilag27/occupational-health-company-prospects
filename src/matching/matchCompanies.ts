import type { Company } from "../types/company";
import type { MatchedFleetOperator } from "../types/prospect";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";

export type CompanyIndexes = {
	companiesByNumber: Map<string, Company>;
	companiesByNamePostcode: Map<string, Company[]>;
	companiesByName: Map<string, Company[]>;
};

function buildNamePostcodeKey(
	normalizedName: string,
	postcode: string | null,
): string | null {
	if (normalizedName.length === 0 || postcode === null) {
		return null;
	}
	return `${normalizedName}|${postcode}`;
}

export function getUnmatchedReason(
	operator: TrafficCommissionerOperator,
	companyIndexes: CompanyIndexes,
): string {
	if (operator.companyNumber) {
		const byCompanyNumber = companyIndexes.companiesByNumber.get(
			operator.companyNumber,
		);
		if (byCompanyNumber) {
			return "matched";
		}
		return "company number not found in Companies House index";
	}

	const namePostcodeKey = buildNamePostcodeKey(
		operator.normalizedOperatorName,
		operator.postcode,
	);
	if (namePostcodeKey) {
		const byNamePostcode =
			companyIndexes.companiesByNamePostcode.get(namePostcodeKey) ?? [];
		if (byNamePostcode.length === 1) {
			return "matched";
		}
		if (byNamePostcode.length > 1) {
			return "ambiguous: multiple companies matched by name and postcode";
		}
	}

	const byName =
		companyIndexes.companiesByName.get(operator.normalizedOperatorName) ?? [];
	if (byName.length === 1) {
		return "matched";
	}
	if (byName.length > 1) {
		return "ambiguous: multiple companies matched by name";
	}

	return "no company match on company number, name+postcode, or unique name";
}

export function matchFleetOperatorsToCompanies(
	operators: TrafficCommissionerOperator[],
	companyIndexes: CompanyIndexes,
): {
	matched: MatchedFleetOperator[];
	unmatched: TrafficCommissionerOperator[];
} {
	const matched: MatchedFleetOperator[] = [];
	const unmatched: TrafficCommissionerOperator[] = [];

	for (const operator of operators) {
		if (operator.companyNumber) {
			const companyByNumber = companyIndexes.companiesByNumber.get(
				operator.companyNumber,
			);
			if (companyByNumber) {
				matched.push({
					operator,
					company: companyByNumber,
					matchMethod: "company_number",
					matchConfidence: 1.0,
				});
				continue;
			}
		}

		const namePostcodeKey = buildNamePostcodeKey(
			operator.normalizedOperatorName,
			operator.postcode,
		);
		if (namePostcodeKey) {
			const byNamePostcode =
				companyIndexes.companiesByNamePostcode.get(namePostcodeKey) ?? [];
			if (byNamePostcode.length === 1) {
				matched.push({
					operator,
					company: byNamePostcode[0],
					matchMethod: "name_postcode",
					matchConfidence: 0.85,
				});
				continue;
			}
		}

		const byName =
			companyIndexes.companiesByName.get(operator.normalizedOperatorName) ?? [];
		if (byName.length === 1) {
			matched.push({
				operator,
				company: byName[0],
				matchMethod: "unique_name",
				matchConfidence: 0.65,
			});
			continue;
		}

		unmatched.push(operator);
	}

	return { matched, unmatched };
}
