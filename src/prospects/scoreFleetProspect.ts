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
	if (status === null) {
		return false;
	}

	const normalized = status.trim().toLowerCase();
	if (normalized.length === 0) {
		return false;
	}

	// Companies House may include qualifiers such as "active - proposal to strike off".
	return normalized.includes("active") && !normalized.includes("inactive");
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
	const companyStatus = matched.company.companyStatus;
	if (companyStatus !== null && !isActiveStatus(companyStatus)) {
		return {
			score: 0,
			priority: resolvePriority(0, thresholds),
		};
	}

	let score = 65;

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
