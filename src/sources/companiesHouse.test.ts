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

		expect(result.companies).toHaveLength(2);

		const companyNumbers = result.companies.map(
			(company) => company.companyNumber,
		);
		expect(companyNumbers).toEqual(["00012345", "00012345"]);
	});

	test("parses SIC values and registered address fields", async () => {
		const result = await loadCompaniesHouseCompanies(fixturePath, "utf8");
		const firstCompany = result.companies[0];

		expect(firstCompany.sicCodes).toEqual([
			"49410 - Freight transport by road",
			"52290 - Other transportation support",
		]);
		expect(firstCompany.registeredAddress["RegAddress.AddressLine1"]).toBe(
			"1 Fleet Street",
		);
		expect(
			firstCompany.registeredAddress["RegAddress.AddressLine2"],
		).toBeNull();
		expect(firstCompany.registeredAddress["RegAddress.PostTown"]).toBe(
			"London",
		);
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
