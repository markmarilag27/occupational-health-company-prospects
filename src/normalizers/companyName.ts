const LEGAL_SUFFIXES = [
	"LIMITED",
	"LTD",
	"PUBLIC LIMITED COMPANY",
	"PLC",
	"LLP",
] as const;

function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function stripPunctuationNoise(value: string): string {
	return value.replace(/[^A-Z0-9\s]/g, " ");
}

function removeLegalSuffixNoise(value: string): string {
	const suffixPattern = new RegExp(
		`\\b(?:${LEGAL_SUFFIXES.map((suffix) => suffix.replace(/\s+/g, "\\s+")).join("|")})\\b`,
		"g",
	);
	return value.replace(suffixPattern, " ");
}

export function cleanDisplayCompanyName(
	input: string | null | undefined,
): string {
	if (typeof input !== "string") {
		return "";
	}

	return collapseWhitespace(input);
}

export function normalizeCompanyNameForMatch(
	input: string | null | undefined,
): string {
	if (typeof input !== "string") {
		return "";
	}

	let normalized = collapseWhitespace(input).toUpperCase();
	normalized = stripPunctuationNoise(normalized);
	normalized = removeLegalSuffixNoise(normalized);
	normalized = collapseWhitespace(normalized);

	return normalized;
}
