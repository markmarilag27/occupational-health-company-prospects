import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readCsvRecords } from "../src/utils/csv";
import { combineRegionalTcCsvs } from "./combine-tc-csvs";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-combine-tc-test-"));
	tempRoots.push(root);
	return root;
}

describe("combineRegionalTcCsvs", () => {
	test("combines CSV files, preserves union of columns, and adds source_region_file", async () => {
		const root = await createTempRoot();
		const regionsDir = join(root, "regions");
		const outputFile = join(root, "traffic_commissioner", "tc_operators.csv");

		await Bun.write(
			join(regionsDir, "north.csv"),
			"Operator Name,Licence Number,Postcode\nAcme Logistics,OB123,SW1A 1AA\n",
		);
		await Bun.write(
			join(regionsDir, "south.csv"),
			`Operator Name,Status,"Extra Notes"\n"Road Freight Co",Active,"line one\nline two"\n`,
		);

		const logs: string[] = [];
		const warnings: string[] = [];
		const result = await combineRegionalTcCsvs({
			regionsDir,
			outputFile,
			log: {
				log: (message: string) => logs.push(message),
				warn: (message: string) => warnings.push(message),
			},
		});

		expect(result.totalRows).toBe(2);
		expect(result.headers).toEqual([
			"Operator Name",
			"Licence Number",
			"Postcode",
			"Status",
			"Extra Notes",
			"source_region_file",
		]);
		expect(warnings).toHaveLength(0);
		expect(logs.some((line) => line.includes("Loaded north.csv"))).toBeTrue();
		expect(logs.some((line) => line.includes("Loaded south.csv"))).toBeTrue();

		const rows = await readCsvRecords(outputFile);
		expect(rows).toHaveLength(2);
		expect(rows[0].source_region_file).toBe("north.csv");
		expect(rows[1].source_region_file).toBe("south.csv");
		expect(rows[1]["Extra Notes"]).toBe("line one\nline two");
	});

	test("skips empty files with warning and handles BOM", async () => {
		const root = await createTempRoot();
		const regionsDir = join(root, "regions");
		const outputFile = join(root, "traffic_commissioner", "tc_operators.csv");

		await Bun.write(join(regionsDir, "empty.csv"), "");
		const bomContent = `\uFEFFOperator Name,Company Registration Number\n"Fleet Ops",12345\n`;
		await writeFile(join(regionsDir, "bom.csv"), bomContent, "utf8");

		const warnings: string[] = [];
		const result = await combineRegionalTcCsvs({
			regionsDir,
			outputFile,
			log: {
				log: () => {},
				warn: (message: string) => warnings.push(message),
			},
		});

		expect(result.totalRows).toBe(1);
		expect(result.filesSkippedEmpty).toBe(1);
		expect(
			warnings.some((line) => line.includes("Skipping empty CSV file")),
		).toBeTrue();

		const rows = await readCsvRecords(outputFile);
		expect(rows).toHaveLength(1);
		expect(rows[0]["Operator Name"]).toBe("Fleet Ops");
		expect(rows[0]["Company Registration Number"]).toBe("12345");
	});
});
