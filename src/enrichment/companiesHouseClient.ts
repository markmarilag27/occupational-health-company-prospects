type OfficerItem = {
	name?: string;
	role?: string;
};

type OfficersResponse = {
	items?: OfficerItem[];
};

function normalizeCompanyNumberForApi(companyNumber: string): string {
	return companyNumber.replace(/^0+/, "") || "0";
}

export async function fetchCompanyDirectors(
	companyNumber: string,
	apiKey: string,
): Promise<string[] | null> {
	const normalizedNumber = normalizeCompanyNumberForApi(companyNumber);
	const auth = Buffer.from(`${apiKey}:`).toString("base64");
	const response = await fetch(
		`https://api.company-information.service.gov.uk/company/${encodeURIComponent(
			normalizedNumber,
		)}/officers`,
		{
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: "application/json",
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as OfficersResponse;
	const directors =
		payload.items
			?.filter((item) => item.role?.toLowerCase() === "director")
			.map((item) => item.name?.trim() ?? "")
			.filter((name) => name.length > 0) ?? [];

	return directors;
}
