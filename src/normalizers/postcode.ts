function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function normalizePostcode(
	input: string | null | undefined,
): string | null {
	if (typeof input !== "string") {
		return null;
	}

	const collapsed = collapseWhitespace(input).toUpperCase();
	if (collapsed.length === 0) {
		return null;
	}

	const compact = collapsed.replace(/\s+/g, "");
	if (compact.length <= 3) {
		return compact;
	}

	const outward = compact.slice(0, -3);
	const inward = compact.slice(-3);

	return `${outward} ${inward}`;
}
