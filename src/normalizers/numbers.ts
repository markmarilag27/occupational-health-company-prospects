function normalizeNumericInput(
	input: string | number | null | undefined,
): string | null {
	if (typeof input === "number") {
		if (!Number.isFinite(input)) {
			return null;
		}
		return String(input);
	}

	if (typeof input !== "string") {
		return null;
	}

	const trimmed = input.trim();
	if (trimmed.length === 0) {
		return null;
	}

	return trimmed.replace(/,/g, "");
}

export function safeNumber(
	input: string | number | null | undefined,
): number | null {
	const normalized = normalizeNumericInput(input);
	if (normalized === null) {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

export function safeInteger(
	input: string | number | null | undefined,
): number | null {
	const parsed = safeNumber(input);
	if (parsed === null || !Number.isInteger(parsed)) {
		return null;
	}

	return parsed;
}
