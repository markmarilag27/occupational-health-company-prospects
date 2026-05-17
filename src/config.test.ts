import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";

describe("loadConfig progress settings", () => {
	test("uses default progress intervals", () => {
		const config = loadConfig({});
		expect(config.CH_PROGRESS_EVERY_ROWS).toBe(50_000);
		expect(config.TC_PROGRESS_EVERY_ROWS).toBe(10_000);
	});

	test("accepts custom progress intervals from env", () => {
		const config = loadConfig({
			CH_PROGRESS_EVERY_ROWS: "200000",
			TC_PROGRESS_EVERY_ROWS: "25000",
		});
		expect(config.CH_PROGRESS_EVERY_ROWS).toBe(200_000);
		expect(config.TC_PROGRESS_EVERY_ROWS).toBe(25_000);
	});
});
