/**
 * Response formatters — convert raw Kit API JSON into agent-friendly text.
 * Every tool response goes through a formatter. No raw JSON ever reaches the agent.
 */

import type {
	KitAccount,
	KitCreatorProfile,
	KitEmailStats,
	KitGrowthStats,
	KitUser,
} from "./types.js";

// --- Connection ---

export function formatConnectionSuccess(
	accountName: string,
	authMethod: string,
	rateLimit: number,
): string {
	return [
		`✓ Connected to Kit account: ${accountName}`,
		`  Auth method: ${authMethod === "api_key" ? "API Key" : "OAuth"}`,
		`  Rate limit: ${rateLimit} requests/minute`,
	].join("\n");
}

// --- Account Overview ---

export function formatAccountOverview(
	user: KitUser,
	account: KitAccount,
	profile: KitCreatorProfile | null,
	emailStats: KitEmailStats | null,
	growthStats: KitGrowthStats | null,
): string {
	const lines: string[] = [
		`Account: ${account.name}`,
		`Plan: ${formatPlanType(account.plan_type)} | Email: ${account.primary_email_address}`,
		`Timezone: ${account.timezone.friendly_name} (${account.timezone.utc_offset})`,
		"",
	];

	if (profile) {
		lines.push("Creator Profile:");
		lines.push(`  Name: ${profile.name}`);
		if (profile.byline) lines.push(`  Byline: ${profile.byline}`);
		if (profile.bio) lines.push(`  Bio: ${profile.bio}`);
		lines.push("");
	}

	if (emailStats) {
		lines.push(`Email Stats (${emailStats.email_stats_mode}):`);
		lines.push(
			`  Sent: ${fmt(emailStats.sent)} | Opens: ${fmt(emailStats.opened)} | Clicks: ${fmt(emailStats.clicked)}`,
		);
		if (emailStats.sent > 0) {
			const openRate = ((emailStats.opened / emailStats.sent) * 100).toFixed(1);
			const clickRate = ((emailStats.clicked / emailStats.sent) * 100).toFixed(1);
			lines.push(`  Open rate: ${openRate}% | Click rate: ${clickRate}%`);
		}
		if (emailStats.open_tracking_enabled === false) {
			lines.push("  Note: Open tracking is disabled");
		}
		lines.push("");
	}

	if (growthStats) {
		lines.push(`Growth (${growthStats.starting} to ${growthStats.ending}):`);
		lines.push(`  Total subscribers: ${fmt(growthStats.subscribers)}`);
		const netSign = growthStats.net_new_subscribers >= 0 ? "+" : "";
		lines.push(
			`  New: +${fmt(growthStats.new_subscribers)} | Cancellations: -${fmt(growthStats.cancellations)} | Net: ${netSign}${fmt(growthStats.net_new_subscribers)}`,
		);
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

// --- Helpers ---

function formatPlanType(planType: string): string {
	return planType
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/** Format number with locale-aware separators */
function fmt(n: number): string {
	return n.toLocaleString("en-US");
}
