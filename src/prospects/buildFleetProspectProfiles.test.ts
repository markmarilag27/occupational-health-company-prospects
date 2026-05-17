import { describe, expect, test } from "bun:test";

import type { Company } from "../types/company";
import type { MatchedFleetOperator } from "../types/prospect";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { buildFleetProspectProfiles } from "./buildFleetProspectProfiles";
import { FLEET_SUGGESTED_SERVICES } from "./suggestedServices";

const thresholds = {
	SCORE_IMMEDIATE_THRESHOLD: 80,
	SCORE_HIGH_THRESHOLD: 65,
} as const;

function createCompany(overrides: Partial<Company>): Company {
	return {
		companyNumber: "00012345",
		companyName: "Acme Logistics Ltd",
		normalizedCompanyName: "ACME LOGISTICS",
		companyStatus: "active",
		postcode: "SW1A 1AA",
		sicCodes: ["49410 - Freight transport by road"],
		incorporationDate: "2010-01-02",
		registeredAddress: {
			"RegAddress.PostCode": "SW1A 1AA",
		},
		...overrides,
	};
}

function createOperator(
	overrides: Partial<TrafficCommissionerOperator>,
): TrafficCommissionerOperator {
	return {
		sourceRowNumber: 2,
		operatorName: "Acme Logistics Ltd",
		normalizedOperatorName: "ACME LOGISTICS",
		companyNumber: "00012345",
		licenceNumber: "OB1234567",
		licenceType: "Standard International",
		trafficArea: "North West",
		authorisedVehicles: 12,
		authorisedTrailers: 4,
		postcode: "SW1A 1AA",
		status: "active",
		...overrides,
	};
}

function createMatch(overrides: {
	company?: Partial<Company>;
	operator?: Partial<TrafficCommissionerOperator>;
	matchMethod?: MatchedFleetOperator["matchMethod"];
}): MatchedFleetOperator {
	return {
		operator: createOperator(overrides.operator ?? {}),
		company: createCompany(overrides.company ?? {}),
		matchMethod: overrides.matchMethod ?? "company_number",
		matchConfidence: 1,
	};
}

describe("buildFleetProspectProfiles", () => {
	test("profile fields are populated", () => {
		const profiles = buildFleetProspectProfiles([createMatch({})], thresholds);

		expect(profiles).toHaveLength(1);
		const profile = profiles[0];
		expect(profile.companyName).toBe("Acme Logistics Ltd");
		expect(profile.companyNumber).toBe("00012345");
		expect(profile.segment).toBe("Fleet / Transport");
		expect(profile.fleetSize).toBe(12);
		expect(profile.licenceType).toBe("Standard International");
		expect(profile.industrySic).toContain("Freight transport by road");
		expect(profile.whyFound.length).toBeGreaterThan(0);
		expect(profile.whyRelevant.length).toBeGreaterThan(0);
		expect(profile.suggestedServices).toBe(FLEET_SUGGESTED_SERVICES);
	});

	test("duplicate company keeps largest fleet size", () => {
		const profiles = buildFleetProspectProfiles(
			[
				createMatch({ operator: { authorisedVehicles: 10 } }),
				createMatch({ operator: { authorisedVehicles: 60 } }),
			],
			thresholds,
		);

		expect(profiles).toHaveLength(1);
		expect(profiles[0].fleetSize).toBe(60);
	});

	test("optional enrichment fields are blank", () => {
		const profile = buildFleetProspectProfiles(
			[createMatch({})],
			thresholds,
		)[0];

		expect(profile.directors).toBe("");
		expect(profile.websiteGuess).toBe("");
		expect(profile.emailGuesses).toBe("");
		expect(profile.nearestClinic).toBe("");
		expect(profile.distanceToClinic).toBe("");
		expect(profile.aiOutreachHook).toBe("");
		expect(profile.salesRating).toBe("");
		expect(profile.salesComment).toBe("");
		expect(profile.wouldContact).toBe("");
		expect(profile.bestBuyerRole).toBe("");
		expect(profile.missingInformation).toBe("");
		expect(profile.wrongReason).toBe("");
	});

	test("review status is Needs Review", () => {
		const profile = buildFleetProspectProfiles(
			[createMatch({})],
			thresholds,
		)[0];
		expect(profile.reviewStatus).toBe("Needs Review");
	});

	test("URLs are generated deterministically", () => {
		const profile = buildFleetProspectProfiles(
			[createMatch({})],
			thresholds,
		)[0];

		expect(profile.linkedInResearchUrl).toBe(
			"https://www.linkedin.com/search/results/companies/?keywords=Acme%20Logistics%20Ltd",
		);
		expect(profile.hseNoticeSearchUrl).toBe(
			"https://www.google.com/search?q=Acme%20Logistics%20Ltd%20HSE%20notice",
		);
	});
});
