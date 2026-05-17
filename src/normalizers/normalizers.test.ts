import { describe, expect, test } from "bun:test";

import {
	cleanDisplayCompanyName,
	normalizeCompanyNameForMatch,
} from "./companyName";
import { normalizeCompanyNumber } from "./companyNumber";
import { safeInteger, safeNumber } from "./numbers";
import { normalizePostcode } from "./postcode";
import { parseCompaniesHouseSicTexts } from "./sic";

describe("normalizeCompanyNumber", () => {
	test("pads numeric values to 8 digits", () => {
		expect(normalizeCompanyNumber("123")).toBe("00000123");
		expect(normalizeCompanyNumber("00001234")).toBe("00001234");
	});

	test("preserves and pads supported prefixes", () => {
		expect(normalizeCompanyNumber("sc123")).toBe("SC000123");
		expect(normalizeCompanyNumber("NI123456")).toBe("NI123456");
		expect(normalizeCompanyNumber("oc1")).toBe("OC000001");
	});

	test("returns null for blank or invalid input", () => {
		expect(normalizeCompanyNumber("")).toBeNull();
		expect(normalizeCompanyNumber("   ")).toBeNull();
		expect(normalizeCompanyNumber(null)).toBeNull();
		expect(normalizeCompanyNumber("AB123456")).toBeNull();
		expect(normalizeCompanyNumber("SC1234567")).toBeNull();
		expect(normalizeCompanyNumber("123456789")).toBeNull();
	});
});

describe("company name normalizers", () => {
	test("cleans display name whitespace", () => {
		expect(cleanDisplayCompanyName("  Acme   Logistics Ltd  ")).toBe(
			"Acme Logistics Ltd",
		);
		expect(cleanDisplayCompanyName(null)).toBe("");
	});

	test("normalizes for match with uppercase, punctuation removal, and legal suffix removal", () => {
		expect(
			normalizeCompanyNameForMatch('  Acme, "Northern" Logistics Ltd.  '),
		).toBe("ACME NORTHERN LOGISTICS");
		expect(
			normalizeCompanyNameForMatch("Road Haulage PUBLIC LIMITED COMPANY"),
		).toBe("ROAD HAULAGE");
		expect(normalizeCompanyNameForMatch("Fleet Services LLP")).toBe(
			"FLEET SERVICES",
		);
	});
});

describe("normalizePostcode", () => {
	test("uppercases, compacts, and applies simple UK spacing", () => {
		expect(normalizePostcode(" sw1a1aa ")).toBe("SW1A 1AA");
		expect(normalizePostcode("EC1A   1BB")).toBe("EC1A 1BB");
		expect(normalizePostcode("ab1")).toBe("AB1");
	});

	test("returns null for blank input", () => {
		expect(normalizePostcode("")).toBeNull();
		expect(normalizePostcode("   ")).toBeNull();
		expect(normalizePostcode(undefined)).toBeNull();
	});
});

describe("parseCompaniesHouseSicTexts", () => {
	test("returns trimmed non-blank SIC values from fields 1-4", () => {
		expect(
			parseCompaniesHouseSicTexts({
				"SICCode.SicText_1": " 49410 - Freight transport by road ",
				"SICCode.SicText_2": " ",
				"SICCode.SicText_3": "52290 - Other transportation support",
				"SICCode.SicText_4": null,
			}),
		).toEqual([
			"49410 - Freight transport by road",
			"52290 - Other transportation support",
		]);
	});
});

describe("number helpers", () => {
	test("safeNumber parses valid numeric input and rejects invalid values", () => {
		expect(safeNumber("123.45")).toBe(123.45);
		expect(safeNumber("1,234.50")).toBe(1234.5);
		expect(safeNumber(99)).toBe(99);
		expect(safeNumber("")).toBeNull();
		expect(safeNumber("abc")).toBeNull();
		expect(safeNumber(Number.NaN)).toBeNull();
		expect(safeNumber(Number.POSITIVE_INFINITY)).toBeNull();
	});

	test("safeInteger accepts integers only", () => {
		expect(safeInteger("42")).toBe(42);
		expect(safeInteger("1,200")).toBe(1200);
		expect(safeInteger(7)).toBe(7);
		expect(safeInteger("42.5")).toBeNull();
		expect(safeInteger("x")).toBeNull();
	});
});
