import { join } from "node:path";

import { logger as defaultLogger } from "../logger";
import type { CompanyProspectProfile } from "../types/prospect";
import { writeCsvRecords } from "../utils/csv";

export const SALES_REVIEW_CSV_HEADERS = [
	"company name",
	"company number",
	"company status",
	"company summary",
	"segment",
	"fleet size",
	"licence type",
	"postcode",
	"industry / SIC",
	"score",
	"priority",
	"why found",
	"why relevant",
	"suggested services",
	"directors",
	"website guess",
	"email guesses",
	"nearest clinic",
	"distance to clinic",
	"AI outreach hook",
	"LinkedIn research URL",
	"HSE notice search URL",
	"review status",
	"sales_rating",
	"sales_comment",
	"would_contact",
	"best_buyer_role",
	"missing_information",
	"wrong_reason",
] as const;

type SalesReviewCsvRecord = Record<
	(typeof SALES_REVIEW_CSV_HEADERS)[number],
	string
>;

type LogLike = {
	info: (obj: Record<string, unknown>, message: string) => void;
};

const OUTPUT_FILENAME = "fleet_prospect_profiles.csv";

function toStringOrEmpty(value: string | number | null): string {
	if (value === null) {
		return "";
	}
	return String(value);
}

export function mapProspectProfileToSalesReviewCsvRow(
	profile: CompanyProspectProfile,
): SalesReviewCsvRecord {
	return {
		"company name": profile.companyName,
		"company number": toStringOrEmpty(profile.companyNumber),
		"company status": toStringOrEmpty(profile.companyStatus),
		"company summary": profile.companySummary,
		segment: profile.segment,
		"fleet size": toStringOrEmpty(profile.fleetSize),
		"licence type": toStringOrEmpty(profile.licenceType),
		postcode: toStringOrEmpty(profile.postcode),
		"industry / SIC": profile.industrySic,
		score: String(profile.score),
		priority: profile.priority,
		"why found": profile.whyFound,
		"why relevant": profile.whyRelevant,
		"suggested services": profile.suggestedServices,
		directors: profile.directors,
		"website guess": profile.websiteGuess,
		"email guesses": profile.emailGuesses,
		"nearest clinic": profile.nearestClinic,
		"distance to clinic": profile.distanceToClinic,
		"AI outreach hook": profile.aiOutreachHook,
		"LinkedIn research URL": profile.linkedInResearchUrl,
		"HSE notice search URL": profile.hseNoticeSearchUrl,
		"review status": profile.reviewStatus,
		sales_rating: profile.salesRating,
		sales_comment: profile.salesComment,
		would_contact: profile.wouldContact,
		best_buyer_role: profile.bestBuyerRole,
		missing_information: profile.missingInformation,
		wrong_reason: profile.wrongReason,
	};
}

export async function exportSalesReviewCsv(
	profiles: CompanyProspectProfile[],
	exportDir: string,
	log: LogLike = defaultLogger,
): Promise<string> {
	const outputPath = join(exportDir, OUTPUT_FILENAME);
	const rows = profiles.map(mapProspectProfileToSalesReviewCsvRow);

	await writeCsvRecords(outputPath, SALES_REVIEW_CSV_HEADERS, rows);

	log.info(
		{
			outputPath,
			rowCount: rows.length,
		},
		"Sales review CSV export complete",
	);

	return outputPath;
}
