import type { MatchedFleetOperator, ProspectPriority } from "../types/prospect";

export type ProspectScoreThresholds = {
	SCORE_IMMEDIATE_THRESHOLD: number;
	SCORE_HIGH_THRESHOLD: number;
};

export type FleetProspectScore = {
	score: number;
	priority: ProspectPriority;
};

const SIC_BONUS_KEYWORDS = [
	"freight",
	"transport",
	"haulage",
	"logistics",
	"courier",
	"road",
];

function isActiveStatus(status: string | null): boolean {
	return status?.trim().toLowerCase() === "active";
}

function hasTransportSicBonus(sicCodes: string[]): boolean {
	const sicText = sicCodes.join(" ").toLowerCase();
	return SIC_BONUS_KEYWORDS.some((keyword) => sicText.includes(keyword));
}

function clampScore(value: number): number {
	return Math.max(0, Math.min(100, value));
}

function resolvePriority(
	score: number,
	thresholds: ProspectScoreThresholds,
): ProspectPriority {
	if (score >= thresholds.SCORE_IMMEDIATE_THRESHOLD) {
		return "Immediate";
	}
	if (score >= thresholds.SCORE_HIGH_THRESHOLD) {
		return "High";
	}
	return "Nurture";
}

export function scoreFleetProspect(
	matched: MatchedFleetOperator,
	thresholds: ProspectScoreThresholds,
): FleetProspectScore {
	if (!isActiveStatus(matched.company.companyStatus)) {
		return {
			score: 0,
			priority: resolvePriority(0, thresholds),
		};
	}

	let score = 0;

	if (isActiveStatus(matched.operator.status)) {
		score += 65;
	}

	const vehicles = matched.operator.authorisedVehicles;
	if (vehicles !== null && vehicles >= 50) {
		score += 20;
	} else if (vehicles !== null && vehicles >= 10) {
		score += 10;
	}

	if (hasTransportSicBonus(matched.company.sicCodes)) {
		score += 5;
	}

	const finalScore = clampScore(score);

	return {
		score: finalScore,
		priority: resolvePriority(finalScore, thresholds),
	};
}
