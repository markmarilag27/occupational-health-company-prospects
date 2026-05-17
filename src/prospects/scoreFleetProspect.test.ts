import { describe, expect, test } from "bun:test";

import type { Company } from "../types/company";
import type { MatchedFleetOperator } from "../types/prospect";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { scoreFleetProspect } from "./scoreFleetProspect";

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
		sicCodes: [],
		incorporationDate: null,
		registeredAddress: {},
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
		authorisedVehicles: null,
		authorisedTrailers: null,
		postcode: "SW1A 1AA",
		status: "active",
		...overrides,
	};
}

function createMatched(overrides: {
	company?: Partial<Company>;
	operator?: Partial<TrafficCommissionerOperator>;
}): MatchedFleetOperator {
	return {
		operator: createOperator(overrides.operator ?? {}),
		company: createCompany(overrides.company ?? {}),
		matchMethod: "company_number",
		matchConfidence: 1,
	};
}

describe("scoreFleetProspect", () => {
	test("active small fleet", () => {
		const matched = createMatched({
			operator: { authorisedVehicles: 5, status: "active" },
		});
		const result = scoreFleetProspect(matched, thresholds);

		expect(result.score).toBe(65);
		expect(result.priority).toBe("High");
	});

	test("adds +10 for 10+ vehicles", () => {
		const matched = createMatched({
			operator: { authorisedVehicles: 10, status: "active" },
		});
		const result = scoreFleetProspect(matched, thresholds);

		expect(result.score).toBe(75);
		expect(result.priority).toBe("High");
	});

	test("adds +20 for 50+ vehicles", () => {
		const matched = createMatched({
			operator: { authorisedVehicles: 50, status: "active" },
		});
		const result = scoreFleetProspect(matched, thresholds);

		expect(result.score).toBe(85);
		expect(result.priority).toBe("Immediate");
	});

	test("adds SIC bonus for transport/logistics SIC text", () => {
		const matched = createMatched({
			operator: { authorisedVehicles: 5, status: "active" },
			company: { sicCodes: ["49410 - Freight transport by road"] },
		});
		const result = scoreFleetProspect(matched, thresholds);

		expect(result.score).toBe(70);
		expect(result.priority).toBe("High");
	});

	test("inactive company status returns 0", () => {
		const matched = createMatched({
			operator: { authorisedVehicles: 50, status: "active" },
			company: { companyStatus: "dissolved" },
		});
		const result = scoreFleetProspect(matched, thresholds);

		expect(result.score).toBe(0);
		expect(result.priority).toBe("Nurture");
	});

	test("caps score at 100", () => {
		const customThresholds = {
			SCORE_IMMEDIATE_THRESHOLD: 95,
			SCORE_HIGH_THRESHOLD: 70,
		};
		const matched = createMatched({
			operator: { authorisedVehicles: 999, status: "active" },
			company: {
				sicCodes: [
					"49410 - Freight transport by road",
					"52290 - Other transportation support activities",
				],
			},
		});
		const result = scoreFleetProspect(matched, customThresholds);

		expect(result.score).toBeLessThanOrEqual(100);
		expect(result.score).toBe(90);
		expect(result.priority).toBe("High");
	});

	test("priority thresholds are applied correctly", () => {
		const customThresholds = {
			SCORE_IMMEDIATE_THRESHOLD: 90,
			SCORE_HIGH_THRESHOLD: 70,
		};

		const immediate = scoreFleetProspect(
			createMatched({
				operator: { authorisedVehicles: 50, status: "active" },
				company: { sicCodes: ["Freight transport"] },
			}),
			customThresholds,
		);
		expect(immediate.score).toBe(90);
		expect(immediate.priority).toBe("Immediate");

		const high = scoreFleetProspect(
			createMatched({
				operator: { authorisedVehicles: 10, status: "active" },
			}),
			customThresholds,
		);
		expect(high.score).toBe(75);
		expect(high.priority).toBe("High");

		const nurture = scoreFleetProspect(
			createMatched({
				operator: { status: "suspended", authorisedVehicles: 0 },
			}),
			customThresholds,
		);
		expect(nurture.score).toBe(0);
		expect(nurture.priority).toBe("Nurture");
	});
});
