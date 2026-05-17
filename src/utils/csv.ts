import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";

import { ensureParentDirectory } from "./filesystem";

export type CsvRecord = Record<string, string>;

export type CsvReadOptions = {
	encoding?: BufferEncoding;
};

export type CsvWriteOptions = {
	encoding?: BufferEncoding;
};

function hasNonEmptyValue(record: CsvRecord): boolean {
	return Object.values(record).some((value) => value.trim().length > 0);
}

function createCsvParser() {
	return parse({
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true,
		relax_column_count: true,
		on_record: (record: CsvRecord) => {
			if (!hasNonEmptyValue(record)) {
				return null;
			}
			return record;
		},
	});
}

export async function* iterateCsvRecords<T extends CsvRecord = CsvRecord>(
	filePath: string,
	options: CsvReadOptions = {},
): AsyncIterable<T> {
	const stream = createReadStream(filePath, {
		encoding: options.encoding ?? "utf8",
	});
	const parser = createCsvParser();

	stream.pipe(parser);

	for await (const record of parser) {
		yield record as T;
	}
}

export async function readCsvRecords<T extends CsvRecord = CsvRecord>(
	filePath: string,
	options: CsvReadOptions = {},
): Promise<T[]> {
	const records: T[] = [];

	for await (const record of iterateCsvRecords<T>(filePath, options)) {
		records.push(record);
	}

	return records;
}

export async function writeCsvRecords<T extends CsvRecord = CsvRecord>(
	filePath: string,
	headers: readonly string[],
	records: readonly T[],
	options: CsvWriteOptions = {},
): Promise<void> {
	await ensureParentDirectory(filePath);

	const rows = records.map((record) =>
		headers.map((header) => record[header] ?? ""),
	);

	const output = stringify(rows, {
		header: true,
		columns: [...headers],
	});

	await writeFile(filePath, output, {
		encoding: options.encoding ?? "utf8",
	});
}
