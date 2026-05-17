const PREFIXES = new Set(["SC", "NI", "OC"]);

export function normalizeCompanyNumber(
	input: string | null | undefined,
): string | null {
	if (typeof input !== "string") {
		return null;
	}

	const trimmed = input.trim().toUpperCase();
	if (trimmed.length === 0) {
		return null;
	}

	if (/^\d{1,8}$/.test(trimmed)) {
		return trimmed.padStart(8, "0");
	}

	const prefixedMatch = /^([A-Z]{2})(\d{1,6})$/.exec(trimmed);
	if (!prefixedMatch) {
		return null;
	}

	const prefix = prefixedMatch[1];
	const numericPart = prefixedMatch[2];

	if (!PREFIXES.has(prefix)) {
		return null;
	}

	return `${prefix}${numericPart.padStart(6, "0")}`;
}
