export type TrafficCommissionerOperator = {
	sourceRowNumber: number;
	operatorName: string;
	normalizedOperatorName: string;
	companyNumber: string | null;
	licenceNumber: string | null;
	licenceType: string | null;
	trafficArea: string | null;
	authorisedVehicles: number | null;
	authorisedTrailers: number | null;
	postcode: string | null;
	status: string | null;
};
