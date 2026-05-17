import type {
	CompanyProspectProfile,
	MatchedFleetOperator,
} from "../types/prospect";
import {
	type ProspectScoreThresholds,
	scoreFleetProspect,
} from "./scoreFleetProspect";
import { FLEET_SUGGESTED_SERVICES } from "./suggestedServices";

function toVehicleCount(value: number | null): number {
	return value ?? -1;
}

function pickBestOperatorMatch(
	current: MatchedFleetOperator | undefined,
	candidate: MatchedFleetOperator,
): MatchedFleetOperator {
	if (!current) {
		return candidate;
	}

	return toVehicleCount(candidate.operator.authorisedVehicles) >
		toVehicleCount(current.operator.authorisedVehicles)
		? candidate
		: current;
}

function buildCompanySummary(match: MatchedFleetOperator): string {
	const parts = [
		match.company.companyName,
		match.company.companyStatus
			? `is ${match.company.companyStatus}`
			: "has unknown company status",
		match.operator.licenceType
			? `with ${match.operator.licenceType} Traffic Commissioner licence`
			: "with Traffic Commissioner source signal",
	];
	return `${parts.join(" ")}.`;
}

function buildWhyFound(match: MatchedFleetOperator): string {
	const vehicleText =
		match.operator.authorisedVehicles !== null
			? `${match.operator.authorisedVehicles} authorised vehicles`
			: "authorised vehicle count unavailable";

	return `Traffic Commissioner source signal matched via ${match.matchMethod}; ${vehicleText}.`;
}

function buildWhyRelevant(match: MatchedFleetOperator): string {
	const sicText =
		match.company.sicCodes.length > 0
			? `SIC includes ${match.company.sicCodes[0]}.`
			: "SIC details are limited.";
	return `Fleet / Transport segment profile for occupational health sales review. ${sicText}`;
}

function buildLinkedInResearchUrl(companyName: string): string {
	const q = encodeURIComponent(companyName);
	return `https://www.linkedin.com/search/results/companies/?keywords=${q}`;
}

function buildHseNoticeSearchUrl(companyName: string): string {
	const q = encodeURIComponent(`${companyName} HSE notice`);
	return `https://www.google.com/search?q=${q}`;
}

export function buildFleetProspectProfiles(
	matches: MatchedFleetOperator[],
	thresholds: ProspectScoreThresholds,
): CompanyProspectProfile[] {
	const bestByCompanyNumber = new Map<string, MatchedFleetOperator>();

	for (const match of matches) {
		const key = match.company.companyNumber;
		const current = bestByCompanyNumber.get(key);
		bestByCompanyNumber.set(key, pickBestOperatorMatch(current, match));
	}

	const profiles: CompanyProspectProfile[] = [];

	for (const match of bestByCompanyNumber.values()) {
		const { score, priority } = scoreFleetProspect(match, thresholds);
		const companyName = match.company.companyName;

		profiles.push({
			companyName,
			companyNumber: match.company.companyNumber,
			companyStatus: match.company.companyStatus,
			companySummary: buildCompanySummary(match),
			segment: "Fleet / Transport",
			fleetSize: match.operator.authorisedVehicles,
			licenceType: match.operator.licenceType,
			postcode: match.operator.postcode ?? match.company.postcode,
			industrySic: match.company.sicCodes.join("; "),
			score,
			priority,
			whyFound: buildWhyFound(match),
			whyRelevant: buildWhyRelevant(match),
			suggestedServices: FLEET_SUGGESTED_SERVICES,
			directors: "",
			websiteGuess: "",
			emailGuesses: "",
			nearestClinic: "",
			distanceToClinic: "",
			aiOutreachHook: "",
			linkedInResearchUrl: buildLinkedInResearchUrl(companyName),
			hseNoticeSearchUrl: buildHseNoticeSearchUrl(companyName),
			reviewStatus: "Needs Review",
			salesRating: "",
			salesComment: "",
			wouldContact: "",
			bestBuyerRole: "",
			missingInformation: "",
			wrongReason: "",
		});
	}

	return profiles;
}
