import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readCsvRecords, writeCsvRecords } from "./csv";

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempRoots
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function createTempRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "oh-prospects-csv-test-"));
	tempRoots.push(root);
	return root;
}

describe("csv utils", () => {
	test("writes exact header order", async () => {
		const root = await createTempRoot();
		const filePath = join(root, "ordered.csv");
		const headers = ["b", "a", "c"] as const;

		await writeCsvRecords(filePath, headers, [{ a: "1", b: "2", c: "3" }]);

		const written = await readFile(filePath, "utf8");
		const firstLine = written.split("\n")[0];
		expect(firstLine).toBe("b,a,c");
	});

	test("reads records back after writing", async () => {
		const root = await createTempRoot();
		const filePath = join(root, "roundtrip.csv");
		const headers = ["company name", "score"] as const;
		const rows = [
			{ "company name": "Acme Logistics Ltd", score: "65" },
			{ "company name": "Road Freight Co", score: "85" },
		];

		await writeCsvRecords(filePath, headers, rows);
		const readBack = await readCsvRecords(filePath);

		expect(readBack).toEqual(rows);
	});

	test("creates parent directory before writing", async () => {
		const root = await createTempRoot();
		const filePath = join(root, "nested", "deeper", "output.csv");

		await writeCsvRecords(filePath, ["name"], [{ name: "Fleet Co" }]);

		const content = await readFile(filePath, "utf8");
		expect(content.startsWith("name\n")).toBeTrue();
	});

	test("handles commas, quotes, and newlines in values", async () => {
		const root = await createTempRoot();
		const filePath = join(root, "escaped.csv");
		const headers = ["company name", "why relevant"] as const;
		const rows = [
			{
				"company name": 'Acme, "Northern" Logistics',
				"why relevant": "Line one\nLine two, with comma",
			},
		];

		await writeCsvRecords(filePath, headers, rows);
		const readBack = await readCsvRecords(filePath);

		expect(readBack).toEqual(rows);
	});
});
