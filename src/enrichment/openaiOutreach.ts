type OpenAiResponse = {
	output?: Array<{
		content?: Array<{
			type?: string;
			text?: string;
		}>;
	}>;
};

function compact(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export async function generateAiOutreachHook(
	row: Record<string, string>,
	openAiApiKey: string,
): Promise<string | null> {
	const context = {
		companyName: row["company name"] ?? "",
		companyStatus: row["company status"] ?? "",
		segment: row.segment ?? "",
		fleetSize: row["fleet size"] ?? "",
		licenceType: row["licence type"] ?? "",
		industrySic: row["industry / SIC"] ?? "",
		whyFound: row["why found"] ?? "",
		whyRelevant: row["why relevant"] ?? "",
		suggestedServices: row["suggested services"] ?? "",
	};

	const prompt = [
		"You are assisting occupational health sales review.",
		"Write one concise outreach hook (max 32 words).",
		"Use only supplied data. Do not invent facts.",
		"Do not say the company is a qualified lead.",
		"Do not imply sales qualification has happened.",
		`Data: ${JSON.stringify(context)}`,
	].join("\n");

	const response = await fetch("https://api.openai.com/v1/responses", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${openAiApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "gpt-4.1-mini",
			input: prompt,
			temperature: 0.2,
			max_output_tokens: 90,
		}),
	});

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as OpenAiResponse;
	const text =
		payload.output
			?.flatMap((item) => item.content ?? [])
			.find((chunk) => chunk.type === "output_text" && chunk.text)?.text ?? "";

	const cleaned = compact(text);
	return cleaned.length > 0 ? cleaned : null;
}
