export type Company = {
	companyNumber: string;
	companyName: string;
	normalizedCompanyName: string;
	companyStatus: string | null;
	postcode: string | null;
	sicCodes: string[];
	incorporationDate: string | null;
	registeredAddress: Record<string, string | null>;
};
