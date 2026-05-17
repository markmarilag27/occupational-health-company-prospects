import { describe, expect, test } from "bun:test";

import type { Company } from "../types/company";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { matchFleetOperatorsToCompanies } from "./matchCompanies";

function createCompany(overrides: Partial<Company>): Company {
	return {
		companyNumber: "00000001",
		companyName: "Default Co Ltd",
		normalizedCompanyName: "DEFAULT CO",
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
		operatorName: "Default Co Ltd",
		normalizedOperatorName: "DEFAULT CO",
		companyNumber: null,
		licenceNumber: null,
		licenceType: null,
		trafficArea: null,
		authorisedVehicles: null,
		authorisedTrailers: null,
		postcode: null,
		status: null,
		...overrides,
	};
}

describe("matchFleetOperatorsToCompanies", () => {
	test("matches by company number with confidence 1.0", () => {
		const company = createCompany({
			companyNumber: "00012345",
			normalizedCompanyName: "ACME LOGISTICS",
		});
		const operator = createOperator({
			companyNumber: "00012345",
			normalizedOperatorName: "NOT USED",
		});

		const result = matchFleetOperatorsToCompanies([operator], {
			companiesByNumber: new Map([["00012345", company]]),
			companiesByNamePostcode: new Map(),
			companiesByName: new Map(),
		});

		expect(result.matched).toHaveLength(1);
		expect(result.matched[0].matchMethod).toBe("company_number");
		expect(result.matched[0].matchConfidence).toBe(1.0);
		expect(result.unmatched).toHaveLength(0);
	});

	test("matches by unique name + postcode with confidence 0.85", () => {
		const company = createCompany({
			companyNumber: "00020000",
			normalizedCompanyName: "ROAD FREIGHT",
			postcode: "EC1A 1BB",
		});
		const operator = createOperator({
			companyNumber: null,
			normalizedOperatorName: "ROAD FREIGHT",
			postcode: "EC1A 1BB",
		});

		const result = matchFleetOperatorsToCompanies([operator], {
			companiesByNumber: new Map(),
			companiesByNamePostcode: new Map([["ROAD FREIGHT|EC1A 1BB", [company]]]),
			companiesByName: new Map(),
		});

		expect(result.matched).toHaveLength(1);
		expect(result.matched[0].matchMethod).toBe("name_postcode");
		expect(result.matched[0].matchConfidence).toBe(0.85);
		expect(result.unmatched).toHaveLength(0);
	});

	test("matches by unique name with confidence 0.65", () => {
		const company = createCompany({
			companyNumber: "00030000",
			normalizedCompanyName: "FLEET SERVICES",
		});
		const operator = createOperator({
			companyNumber: null,
			normalizedOperatorName: "FLEET SERVICES",
			postcode: null,
		});

		const result = matchFleetOperatorsToCompanies([operator], {
			companiesByNumber: new Map(),
			companiesByNamePostcode: new Map(),
			companiesByName: new Map([["FLEET SERVICES", [company]]]),
		});

		expect(result.matched).toHaveLength(1);
		expect(result.matched[0].matchMethod).toBe("unique_name");
		expect(result.matched[0].matchConfidence).toBe(0.65);
		expect(result.unmatched).toHaveLength(0);
	});

	test("does not match ambiguous names", () => {
		const companyA = createCompany({
			companyNumber: "00040001",
			normalizedCompanyName: "AMBIGUOUS CO",
		});
		const companyB = createCompany({
			companyNumber: "00040002",
			normalizedCompanyName: "AMBIGUOUS CO",
		});
		const operator = createOperator({
			companyNumber: null,
			normalizedOperatorName: "AMBIGUOUS CO",
			postcode: null,
		});

		const result = matchFleetOperatorsToCompanies([operator], {
			companiesByNumber: new Map(),
			companiesByNamePostcode: new Map(),
			companiesByName: new Map([["AMBIGUOUS CO", [companyA, companyB]]]),
		});

		expect(result.matched).toHaveLength(0);
		expect(result.unmatched).toEqual([operator]);
	});

	test("returns unmatched operator when no rules match", () => {
		const operator = createOperator({
			companyNumber: "00099999",
			normalizedOperatorName: "NO MATCH CO",
			postcode: "M1 1AA",
		});

		const result = matchFleetOperatorsToCompanies([operator], {
			companiesByNumber: new Map(),
			companiesByNamePostcode: new Map(),
			companiesByName: new Map(),
		});

		expect(result.matched).toHaveLength(0);
		expect(result.unmatched).toEqual([operator]);
	});
});
