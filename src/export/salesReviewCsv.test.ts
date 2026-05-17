import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CompanyProspectProfile } from "../types/prospect";
import { readCsvRecords } from "../utils/csv";
import {
	exportSalesReviewCsv,
	mapProspectProfileToSalesReviewCsvRow,
	SALES_REVIEW_CSV_HEADERS,
} from "./salesReviewCsv";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-export-test-"));
	tempRoots.push(root);
	return root;
}

function createProfile(
	overrides: Partial<CompanyProspectProfile> = {},
): CompanyProspectProfile {
	return {
		companyName: "Acme Logistics Ltd",
		companyNumber: "00012345",
		companyStatus: "active",
		companySummary:
			"Acme Logistics Ltd is active with Traffic Commissioner source signal.",
		segment: "Fleet / Transport",
		fleetSize: 12,
		licenceType: "Standard International",
		postcode: "SW1A 1AA",
		industrySic: "49410 - Freight transport by road",
		score: 75,
		priority: "High",
		whyFound: "Traffic Commissioner source signal matched via company_number.",
		whyRelevant:
			"Fleet / Transport segment profile for occupational health sales review.",
		suggestedServices:
			"D4 Medicals; Driver Medicals; Drug & Alcohol Testing; Safety-Critical Medicals",
		directors: "",
		websiteGuess: "",
		emailGuesses: "",
		nearestClinic: "",
		distanceToClinic: "",
		aiOutreachHook: "",
		linkedInResearchUrl:
			"https://www.linkedin.com/search/results/companies/?keywords=Acme%20Logistics%20Ltd",
		hseNoticeSearchUrl:
			"https://www.google.com/search?q=Acme%20Logistics%20Ltd%20HSE%20notice",
		reviewStatus: "Needs Review",
		salesRating: "",
		salesComment: "",
		wouldContact: "",
		bestBuyerRole: "",
		missingInformation: "",
		wrongReason: "",
		...overrides,
	};
}

describe("sales review CSV export", () => {
	test("uses exact header order", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const outputPath = await exportSalesReviewCsv(
			[createProfile()],
			exportDir,
			{
				info: () => {},
			},
		);

		const content = await readFile(outputPath, "utf8");
		const headerLine = content.split("\n")[0];
		expect(headerLine).toBe(SALES_REVIEW_CSV_HEADERS.join(","));
	});

	test("writes to EXPORT_DIR/fleet_prospect_profiles.csv", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const outputPath = await exportSalesReviewCsv(
			[createProfile()],
			exportDir,
			{
				info: () => {},
			},
		);

		expect(outputPath).toBe(join(exportDir, "fleet_prospect_profiles.csv"));
	});

	test("maps profile fields correctly", () => {
		const row = mapProspectProfileToSalesReviewCsvRow(createProfile());

		expect(row["company name"]).toBe("Acme Logistics Ltd");
		expect(row["company number"]).toBe("00012345");
		expect(row["company status"]).toBe("active");
		expect(row["fleet size"]).toBe("12");
		expect(row["industry / SIC"]).toBe("49410 - Freight transport by road");
		expect(row.score).toBe("75");
		expect(row.priority).toBe("High");
		expect(row["review status"]).toBe("Needs Review");
	});

	test("blank fields remain blank in output", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");

		const profile = createProfile({
			directors: "",
			websiteGuess: "",
			emailGuesses: "",
			nearestClinic: "",
			distanceToClinic: "",
			aiOutreachHook: "",
			salesRating: "",
			salesComment: "",
			wouldContact: "",
			bestBuyerRole: "",
			missingInformation: "",
			wrongReason: "",
		});

		const outputPath = await exportSalesReviewCsv([profile], exportDir, {
			info: () => {},
		});

		const rows = await readCsvRecords(outputPath);
		expect(rows).toHaveLength(1);
		const row = rows[0];

		expect(row.directors).toBe("");
		expect(row["website guess"]).toBe("");
		expect(row["email guesses"]).toBe("");
		expect(row["nearest clinic"]).toBe("");
		expect(row["distance to clinic"]).toBe("");
		expect(row["AI outreach hook"]).toBe("");
		expect(row.sales_rating).toBe("");
		expect(row.sales_comment).toBe("");
		expect(row.would_contact).toBe("");
		expect(row.best_buyer_role).toBe("");
		expect(row.missing_information).toBe("");
		expect(row.wrong_reason).toBe("");
	});
});
