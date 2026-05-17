import type { Company } from "./company";
import type { TrafficCommissionerOperator } from "./trafficCommissioner";

export type ProspectPriority = "Immediate" | "High" | "Nurture";

export type MatchedFleetOperator = {
	operator: TrafficCommissionerOperator;
	company: Company;
	matchMethod: "company_number" | "name_postcode" | "unique_name";
	matchConfidence: number;
};

export type CompanyProspectProfile = {
	companyName: string;
	companyNumber: string | null;
	companyStatus: string | null;
	companySummary: string;
	segment: "Fleet / Transport";
	fleetSize: number | null;
	licenceType: string | null;
	postcode: string | null;
	industrySic: string;
	score: number;
	priority: ProspectPriority;
	whyFound: string;
	whyRelevant: string;
	suggestedServices: string;
	directors: string;
	websiteGuess: string;
	emailGuesses: string;
	nearestClinic: string;
	distanceToClinic: string;
	aiOutreachHook: string;
	linkedInResearchUrl: string;
	hseNoticeSearchUrl: string;
	reviewStatus: "Needs Review";
	salesRating: string;
	salesComment: string;
	wouldContact: string;
	bestBuyerRole: string;
	missingInformation: string;
	wrongReason: string;
};
