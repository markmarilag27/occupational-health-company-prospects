import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { loadCompaniesHouseCompanies } from "./companiesHouse";

const fixturePath = join(
	import.meta.dir,
	"__fixtures__",
	"companies_house_fixture.csv",
);

describe("loadCompaniesHouseCompanies", () => {
	test("parses valid rows and skips rows missing company number or company name", async () => {
		const result = await loadCompaniesHouseCompanies(fixturePath, "utf8");

		expect(result.companyCount).toBe(2);
		expect(result.companiesByNumber.has("00012345")).toBeTrue();
	});

	test("parses SIC values and registered address fields", async () => {
		const result = await loadCompaniesHouseCompanies(fixturePath, "utf8", {
			includeRegisteredAddress: true,
		});
		const companies = result.companiesByName.get("ACME LOGISTICS") ?? [];
		const companyWithSicAndAddress = companies.find(
			(company) =>
				company.sicCodes.length > 1 &&
				company.registeredAddress["RegAddress.AddressLine1"] ===
					"1 Fleet Street",
		);
		expect(companyWithSicAndAddress).toBeDefined();
		if (!companyWithSicAndAddress) {
			return;
		}

		expect(companyWithSicAndAddress.sicCodes).toEqual([
			"49410 - Freight transport by road",
			"52290 - Other transportation support",
		]);
		expect(
			companyWithSicAndAddress.registeredAddress["RegAddress.AddressLine1"],
		).toBe("1 Fleet Street");
		expect(
			companyWithSicAndAddress.registeredAddress["RegAddress.AddressLine2"],
		).toBeNull();
		expect(
			companyWithSicAndAddress.registeredAddress["RegAddress.PostTown"],
		).toBe("London");
	});

	test("builds company number, name+postcode, and name indexes", async () => {
		const result = await loadCompaniesHouseCompanies(fixturePath, "utf8");

		expect(result.companiesByNumber.get("00012345")?.companyName).toBe(
			"Acme Logistics Limited",
		);

		const byName = result.companiesByName.get("ACME LOGISTICS");
		expect(byName).toBeDefined();
		expect(byName).toHaveLength(2);

		const byNamePostcode = result.companiesByNamePostcode.get(
			"ACME LOGISTICS|SW1A 1AA",
		);
		expect(byNamePostcode).toBeDefined();
		expect(byNamePostcode).toHaveLength(2);
	});
});
