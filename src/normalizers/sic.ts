type CompaniesHouseSicFields = {
	"SICCode.SicText_1"?: string | null;
	"SICCode.SicText_2"?: string | null;
	"SICCode.SicText_3"?: string | null;
	"SICCode.SicText_4"?: string | null;
};

const SIC_KEYS = [
	"SICCode.SicText_1",
	"SICCode.SicText_2",
	"SICCode.SicText_3",
	"SICCode.SicText_4",
] as const;

export function parseCompaniesHouseSicTexts(
	fields: CompaniesHouseSicFields,
): string[] {
	return SIC_KEYS.map((key) => fields[key]?.trim() ?? "").filter(
		(value) => value.length > 0,
	);
}
