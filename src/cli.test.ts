import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBuildFleetProspects } from "./cli";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-cli-test-"));
	tempRoots.push(root);
	return root;
}

describe("build:fleet-prospects CLI flow", () => {
	test("smoke test with fixture CSV files", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		const rawDir = join(root, "raw");
		const processedDir = join(root, "processed");

		const result = await runBuildFleetProspects({
			NODE_ENV: "test",
			LOG_LEVEL: "info",
			DATA_DIR: root,
			RAW_DIR: rawDir,
			PROCESSED_DIR: processedDir,
			EXPORT_DIR: exportDir,
			CH_BULK_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"companies_house_fixture.csv",
			),
			CH_BULK_ENCODING: "utf8",
			TC_CSV_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"traffic_commissioner_fixture.csv",
			),
			SCORE_IMMEDIATE_THRESHOLD: "80",
			SCORE_HIGH_THRESHOLD: "65",
		});

		expect(result.ok).toBeTrue();
		if (!result.ok) {
			return;
		}

		expect(result.summary.profilesExported).toBeGreaterThan(0);
		expect(result.summary.outputPath).toBe(
			join(exportDir, "fleet_prospect_profiles.csv"),
		);

		const content = await readFile(result.summary.outputPath, "utf8");
		expect(
			content.includes("company name,company number,company status"),
		).toBeTrue();
	});

	test("fails when Companies House CSV is missing", async () => {
		const root = await createTempRoot();
		const result = await runBuildFleetProspects({
			NODE_ENV: "test",
			LOG_LEVEL: "info",
			DATA_DIR: root,
			RAW_DIR: join(root, "raw"),
			PROCESSED_DIR: join(root, "processed"),
			EXPORT_DIR: join(root, "exports"),
			CH_BULK_FILE: join(root, "missing-companies-house.csv"),
			CH_BULK_ENCODING: "utf8",
			TC_CSV_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"traffic_commissioner_fixture.csv",
			),
			SCORE_IMMEDIATE_THRESHOLD: "80",
			SCORE_HIGH_THRESHOLD: "65",
		});

		expect(result.ok).toBeFalse();
		if (!result.ok) {
			expect(result.reason).toContain("Missing Companies House CSV");
		}
	});

	test("fails when Traffic Commissioner CSV is missing", async () => {
		const root = await createTempRoot();
		const result = await runBuildFleetProspects({
			NODE_ENV: "test",
			LOG_LEVEL: "info",
			DATA_DIR: root,
			RAW_DIR: join(root, "raw"),
			PROCESSED_DIR: join(root, "processed"),
			EXPORT_DIR: join(root, "exports"),
			CH_BULK_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"companies_house_fixture.csv",
			),
			CH_BULK_ENCODING: "utf8",
			TC_CSV_FILE: join(root, "missing-traffic.csv"),
			SCORE_IMMEDIATE_THRESHOLD: "80",
			SCORE_HIGH_THRESHOLD: "65",
		});

		expect(result.ok).toBeFalse();
		if (!result.ok) {
			expect(result.reason).toContain("Missing Traffic Commissioner CSV");
		}
	});

	test("fails when no operators match", async () => {
		const root = await createTempRoot();
		const tcFile = join(root, "tc-no-match.csv");
		await writeFile(
			tcFile,
			[
				"Operator Name,Company Registration Number,Licence Number,Licence Type,Traffic Area,Authorised Vehicles,Authorised Trailers,Postcode,Status",
				"Completely Different Operator,99999999,OB1111111,Standard National,North,5,1,ZZ1 1ZZ,Active",
			].join("\n"),
			"utf8",
		);

		const result = await runBuildFleetProspects({
			NODE_ENV: "test",
			LOG_LEVEL: "info",
			DATA_DIR: root,
			RAW_DIR: join(root, "raw"),
			PROCESSED_DIR: join(root, "processed"),
			EXPORT_DIR: join(root, "exports"),
			CH_BULK_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"companies_house_fixture.csv",
			),
			CH_BULK_ENCODING: "utf8",
			TC_CSV_FILE: tcFile,
			SCORE_IMMEDIATE_THRESHOLD: "80",
			SCORE_HIGH_THRESHOLD: "65",
		});

		expect(result.ok).toBeFalse();
		if (!result.ok) {
			expect(result.reason).toContain("No matched fleet operators");
		}
	});

	test("fails when export write fails", async () => {
		const root = await createTempRoot();
		const exportDir = join(root, "exports");
		await mkdir(exportDir, { recursive: true });
		await mkdir(join(exportDir, "fleet_prospect_profiles.csv"), {
			recursive: true,
		});

		const result = await runBuildFleetProspects({
			NODE_ENV: "test",
			LOG_LEVEL: "info",
			DATA_DIR: root,
			RAW_DIR: join(root, "raw"),
			PROCESSED_DIR: join(root, "processed"),
			EXPORT_DIR: exportDir,
			CH_BULK_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"companies_house_fixture.csv",
			),
			CH_BULK_ENCODING: "utf8",
			TC_CSV_FILE: join(
				import.meta.dir,
				"sources",
				"__fixtures__",
				"traffic_commissioner_fixture.csv",
			),
			SCORE_IMMEDIATE_THRESHOLD: "80",
			SCORE_HIGH_THRESHOLD: "65",
		});

		expect(result.ok).toBeFalse();
		if (!result.ok) {
			expect(result.reason).toContain("Failed to write sales review CSV");
		}
	});
});
