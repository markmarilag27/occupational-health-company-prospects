import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SALES_REVIEW_CSV_HEADERS } from "../export/salesReviewCsv";
import { readCsvRecords, writeCsvRecords } from "../utils/csv";
import { enrichFleetProspects } from "./enrichFleetProspects";

const tempRoots: string[] = [];
const originalFetch = globalThis.fetch;

afterEach(async () => {
	globalThis.fetch = originalFetch;
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-enrich-test-"));
	tempRoots.push(root);
	return root;
}

function makeBaseRow(): Record<string, string> {
	const row = Object.fromEntries(
		SALES_REVIEW_CSV_HEADERS.map((header) => [header, ""]),
	) as Record<string, string>;

	row["company name"] = "Acme Logistics Ltd";
	row["company number"] = "00012345";
	row["company status"] = "active";
	row["company summary"] = "Acme Logistics Ltd is active.";
	row.segment = "Fleet / Transport";
	row["fleet size"] = "12";
	row["licence type"] = "Standard International";
	row.postcode = "SW1A 1AA";
	row["industry / SIC"] = "49410 - Freight transport by road";
	row.score = "75";
	row.priority = "High";
	row["why found"] = "Traffic Commissioner source signal";
	row["why relevant"] = "Fleet / Transport segment profile";
	row["suggested services"] =
		"D4 Medicals; Driver Medicals; Drug & Alcohol Testing; Safety-Critical Medicals";
	row["review status"] = "Needs Review";

	return row;
}

describe("enrichFleetProspects", () => {
	test("does not require enrichment keys", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const outputPath = join(exportDir, "fleet_prospect_profiles.csv");
		await writeCsvRecords(outputPath, SALES_REVIEW_CSV_HEADERS, [
			makeBaseRow(),
		]);

		const summary = await enrichFleetProspects({
			exportDir,
			enableAi: true,
			limit: 50,
			log: { info: () => {}, warn: () => {} },
		});

		expect(summary.rowsProcessed).toBe(1);
		expect(summary.directorsUpdated).toBe(0);
		expect(summary.aiHooksUpdated).toBe(0);
	});

	test("updates directors and AI outreach hook when keys are provided", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const outputPath = join(exportDir, "fleet_prospect_profiles.csv");
		await writeCsvRecords(outputPath, SALES_REVIEW_CSV_HEADERS, [
			makeBaseRow(),
		]);

		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("company-information.service.gov.uk")) {
				return new Response(
					JSON.stringify({
						items: [
							{ name: "Jane Director", role: "director" },
							{ name: "Sam Secretary", role: "secretary" },
						],
					}),
					{ status: 200 },
				);
			}
			if (url.includes("api.openai.com")) {
				return new Response(
					JSON.stringify({
						output: [
							{
								content: [
									{
										type: "output_text",
										text: "Fleet medical readiness review.",
									},
								],
							},
						],
					}),
					{ status: 200 },
				);
			}
			return new Response("not found", { status: 404 });
		}) as typeof fetch;

		const summary = await enrichFleetProspects({
			exportDir,
			companiesHouseApiKey: "ch-key",
			openAiApiKey: "openai-key",
			enableAi: true,
			limit: 50,
			log: { info: () => {}, warn: () => {} },
		});

		expect(summary.directorsUpdated).toBe(1);
		expect(summary.aiHooksUpdated).toBe(1);

		const rows = await readCsvRecords(outputPath);
		expect(rows[0].directors).toBe("Jane Director");
		expect(rows[0]["AI outreach hook"]).toBe("Fleet medical readiness review.");
	});

	test("continues when enrichment calls fail", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const outputPath = join(exportDir, "fleet_prospect_profiles.csv");
		await writeCsvRecords(outputPath, SALES_REVIEW_CSV_HEADERS, [
			makeBaseRow(),
		]);

		globalThis.fetch = (async () => {
			throw new Error("network down");
		}) as typeof fetch;

		let warnCount = 0;
		const summary = await enrichFleetProspects({
			exportDir,
			companiesHouseApiKey: "ch-key",
			openAiApiKey: "openai-key",
			enableAi: true,
			limit: 50,
			log: {
				info: () => {},
				warn: () => {
					warnCount += 1;
				},
			},
		});

		expect(summary.directorsUpdated).toBe(0);
		expect(summary.aiHooksUpdated).toBe(0);
		expect(warnCount).toBeGreaterThan(0);

		const content = await readFile(outputPath, "utf8");
		expect(content.includes("Acme Logistics Ltd")).toBeTrue();
	});
});
