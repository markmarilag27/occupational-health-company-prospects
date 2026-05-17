import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

type CsvRow = Record<string, string>;

export type CombineTcCsvsOptions = {
	regionsDir?: string;
	outputFile?: string;
	log?: Pick<Console, "log" | "warn">;
};

export type CombineTcCsvsResult = {
	outputFile: string;
	totalRows: number;
	filesProcessed: number;
	filesSkippedEmpty: number;
	headers: string[];
};

const DEFAULT_REGIONS_DIR = "data/raw/traffic_commissioner/regions";
const DEFAULT_OUTPUT_FILE = "data/raw/traffic_commissioner/tc_operators.csv";
const SOURCE_REGION_COLUMN = "source_region_file";

function parseCsvContent(content: string): CsvRow[] {
	return parse(content, {
		columns: true,
		bom: true,
		skip_empty_lines: true,
		relax_column_count: true,
	}) as CsvRow[];
}

function toOrderedRow(headers: string[], row: CsvRow): string[] {
	return headers.map((header) => row[header] ?? "");
}

async function ensureParentDirectory(filePath: string): Promise<void> {
	const separatorIndex = filePath.lastIndexOf("/");
	if (separatorIndex <= 0) {
		return;
	}

	const parent = filePath.slice(0, separatorIndex);
	await mkdir(parent, { recursive: true });
}

export async function combineRegionalTcCsvs(
	options: CombineTcCsvsOptions = {},
): Promise<CombineTcCsvsResult> {
	const regionsDir = options.regionsDir ?? DEFAULT_REGIONS_DIR;
	const outputFile = options.outputFile ?? DEFAULT_OUTPUT_FILE;
	const log = options.log ?? console;

	const entries = await readdir(regionsDir, { withFileTypes: true });
	const csvFiles = entries
		.filter(
			(entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"),
		)
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));

	const headerOrder: string[] = [];
	const allRows: CsvRow[] = [];
	let filesSkippedEmpty = 0;

	for (const fileName of csvFiles) {
		const filePath = join(regionsDir, fileName);
		const fileStat = await stat(filePath);

		if (fileStat.size === 0) {
			filesSkippedEmpty += 1;
			log.warn(`Skipping empty CSV file: ${fileName}`);
			continue;
		}

		const content = await readFile(filePath, "utf8");
		const rows = parseCsvContent(content);
		if (rows.length === 0) {
			filesSkippedEmpty += 1;
			log.warn(`Skipping CSV file with no data rows: ${fileName}`);
			continue;
		}

		let fileRowCount = 0;
		for (const row of rows) {
			for (const key of Object.keys(row)) {
				if (!headerOrder.includes(key)) {
					headerOrder.push(key);
				}
			}

			allRows.push({
				...row,
				[SOURCE_REGION_COLUMN]: fileName,
			});
			fileRowCount += 1;
		}

		log.log(`Loaded ${fileName}: ${fileRowCount} row(s)`);
	}

	if (!headerOrder.includes(SOURCE_REGION_COLUMN)) {
		headerOrder.push(SOURCE_REGION_COLUMN);
	}

	await ensureParentDirectory(outputFile);

	const output = stringify(
		allRows.map((row) => toOrderedRow(headerOrder, row)),
		{
			header: true,
			columns: headerOrder,
		},
	);
	await writeFile(outputFile, output, "utf8");

	log.log(`Wrote combined CSV: ${outputFile}`);
	log.log(`Total rows written: ${allRows.length}`);

	return {
		outputFile,
		totalRows: allRows.length,
		filesProcessed: csvFiles.length,
		filesSkippedEmpty,
		headers: headerOrder,
	};
}

if (import.meta.main) {
	void combineRegionalTcCsvs().catch((error) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`combine:tc failed: ${message}`);
		process.exit(1);
	});
}
