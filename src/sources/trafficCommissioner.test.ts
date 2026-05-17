import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { loadTrafficCommissionerOperators } from "./trafficCommissioner";

const fixturePath = join(
	import.meta.dir,
	"__fixtures__",
	"traffic_commissioner_fixture.csv",
);

const altHeaderFixturePath = join(
	import.meta.dir,
	"__fixtures__",
	"traffic_commissioner_alt_headers_fixture.csv",
);

describe("loadTrafficCommissionerOperators", () => {
	test("parses operator name, company number, vehicle/trailer counts, and postcode", async () => {
		const operators = await loadTrafficCommissionerOperators(fixturePath);

		expect(operators).toHaveLength(1);

		const first = operators[0];
		expect(first.operatorName).toBe("Acme Logistics Ltd");
		expect(first.companyNumber).toBe("00012345");
		expect(first.authorisedVehicles).toBe(50);
		expect(first.authorisedTrailers).toBe(10);
		expect(first.postcode).toBe("SW1A 1AA");
	});

	test("skips rows without operator name", async () => {
		const operators = await loadTrafficCommissionerOperators(fixturePath);

		expect(operators).toHaveLength(1);
		expect(operators[0].operatorName).toBe("Acme Logistics Ltd");
	});

	test("supports alternative header names", async () => {
		const operators =
			await loadTrafficCommissionerOperators(altHeaderFixturePath);

		expect(operators).toHaveLength(1);
		expect(operators[0].operatorName).toBe("Road Freight Co");
		expect(operators[0].companyNumber).toBe("NI000123");
		expect(operators[0].licenceNumber).toBe("OB9999999");
		expect(operators[0].licenceType).toBe("Restricted");
		expect(operators[0].trafficArea).toBe("West Midlands");
		expect(operators[0].authorisedVehicles).toBe(1);
		expect(operators[0].authorisedTrailers).toBe(0);
		expect(operators[0].postcode).toBe("EC1A 1BB");
		expect(operators[0].status).toBe("Valid");
	});
});
