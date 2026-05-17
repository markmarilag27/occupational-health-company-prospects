import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Company } from "../types/company";
import type { TrafficCommissionerOperator } from "../types/trafficCommissioner";
import { readCsvRecords } from "../utils/csv";
import {
	exportUnmatchedTrafficCommissionerCsv,
	UNMATCHED_TC_HEADERS,
} from "./unmatchedTrafficCommissionerCsv";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-unmatched-test-"));
	tempRoots.push(root);
	return root;
}

function createOperator(
	overrides: Partial<TrafficCommissionerOperator>,
): TrafficCommissionerOperator {
	return {
		sourceRowNumber: 2,
		operatorName: "No Match Logistics",
		normalizedOperatorName: "NO MATCH LOGISTICS",
		companyNumber: "00099999",
		licenceNumber: "OB0000001",
		licenceType: "Standard National",
		trafficArea: "North West",
		authorisedVehicles: 5,
		authorisedTrailers: 1,
		postcode: "M1 1AA",
		status: "Active",
		...overrides,
	};
}

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

describe("exportUnmatchedTrafficCommissionerCsv", () => {
	test("writes exact header order and output file path", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");

		const outputPath = await exportUnmatchedTrafficCommissionerCsv(
			[createOperator({})],
			{
				companiesByNumber: new Map<string, Company>(),
				companiesByNamePostcode: new Map<string, Company[]>(),
				companiesByName: new Map<string, Company[]>(),
			},
			exportDir,
			{ info: () => {} },
		);

		expect(outputPath).toBe(join(exportDir, "unmatched_tc_operators.csv"));

		const content = await readFile(outputPath, "utf8");
		const firstLine = content.split("\n")[0];
		expect(firstLine).toBe(UNMATCHED_TC_HEADERS.join(","));
	});

	test("maps fields and reason unmatched", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const operator = createOperator({});

		const outputPath = await exportUnmatchedTrafficCommissionerCsv(
			[operator],
			{
				companiesByNumber: new Map<string, Company>([
					["00012345", createCompany({})],
				]),
				companiesByNamePostcode: new Map<string, Company[]>(),
				companiesByName: new Map<string, Company[]>(),
			},
			exportDir,
			{ info: () => {} },
		);

		const rows = await readCsvRecords(outputPath);
		expect(rows).toHaveLength(1);
		expect(rows[0]["operator name"]).toBe("No Match Logistics");
		expect(rows[0]["company number"]).toBe("00099999");
		expect(rows[0]["licence number"]).toBe("OB0000001");
		expect(rows[0].postcode).toBe("M1 1AA");
		expect(rows[0].status).toBe("Active");
		expect(rows[0]["reason unmatched"]).toBe(
			"company number not found in Companies House index",
		);
	});
});
