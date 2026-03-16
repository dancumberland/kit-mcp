/**
 * Response formatters — convert raw Kit API JSON into agent-friendly text.
 * Every tool response goes through a formatter. No raw JSON ever reaches the agent.
 */

import type {
	KitAccount,
	KitBroadcast,
	KitBroadcastClick,
	KitBroadcastStats,
	KitBroadcastStatsSummary,
	KitCreatorProfile,
	KitCustomField,
	KitEmailStats,
	KitEmailTemplate,
	KitFilteredSubscriber,
	KitForm,
	KitGrowthStats,
	KitPagination,
	KitPurchase,
	KitSegment,
	KitSequence,
	KitSubscriber,
	KitSubscriberStats,
	KitTag,
	KitUser,
	KitWebhook,
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

// --- Subscribers ---

export function formatSubscriberSummary(subscriber: KitSubscriber, tags: KitTag[]): string {
	const lines: string[] = [
		`Subscriber: ${subscriber.first_name ?? "(no name)"} (${subscriber.email_address})`,
		`ID: ${subscriber.id} | State: ${subscriber.state} | Created: ${formatDate(subscriber.created_at)}`,
	];

	if (tags.length > 0) {
		lines.push(`Tags: ${tags.map((t) => t.name).join(", ")}`);
	}

	const fieldEntries = Object.entries(subscriber.fields).filter(([, v]) => v !== null && v !== "");
	if (fieldEntries.length > 0) {
		lines.push(`Custom fields: ${fieldEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`);
	}

	return lines.join("\n");
}

export function formatSubscriberList(
	subscribers: KitSubscriber[],
	pagination: KitPagination,
): string {
	if (subscribers.length === 0) {
		return "No subscribers found.";
	}

	const lines: string[] = [`Subscribers (${subscribers.length} shown):`];

	for (const sub of subscribers) {
		const name = sub.first_name ?? "(no name)";
		lines.push(`  ${name} <${sub.email_address}> — ${sub.state} (ID: ${sub.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatFilteredSubscriberList(
	subscribers: KitFilteredSubscriber[],
	pagination: KitPagination & { total_count: number },
): string {
	if (subscribers.length === 0) {
		return "No subscribers matched the engagement filter.";
	}

	const lines: string[] = [
		`Engagement filter results: ${subscribers.length} shown of ${fmt(pagination.total_count)} total`,
	];

	for (const sub of subscribers) {
		const name = sub.first_name ?? "(no name)";
		const tags = sub.tag_names.length > 0 ? ` [${sub.tag_names.join(", ")}]` : "";
		lines.push(`  ${name} <${sub.email_address}>${tags} (ID: ${sub.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

// --- Tags ---

export function formatTagList(tags: KitTag[], pagination: KitPagination): string {
	if (tags.length === 0) {
		return "No tags found.";
	}

	const lines: string[] = [`Tags (${tags.length} shown):`];

	for (const tag of tags) {
		lines.push(`  ${tag.name} (ID: ${tag.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatTagDetail(tag: KitTag, verb: string): string {
	return `Tag ${verb}: "${tag.name}" (ID: ${tag.id})`;
}

// --- Broadcasts ---

export function formatBroadcastList(broadcasts: KitBroadcast[], pagination: KitPagination): string {
	if (broadcasts.length === 0) {
		return "No broadcasts found.";
	}

	const lines: string[] = [`Broadcasts (${broadcasts.length} shown):`];

	for (const bc of broadcasts) {
		const subject = bc.subject ?? "(no subject)";
		const status = getBroadcastStatus(bc);
		lines.push(`  "${subject}" — ${status} (ID: ${bc.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatBroadcastDetail(broadcast: KitBroadcast): string {
	const lines: string[] = [
		`Broadcast: "${broadcast.subject ?? "(no subject)"}"`,
		`ID: ${broadcast.id} | Status: ${getBroadcastStatus(broadcast)}`,
		`Created: ${formatDate(broadcast.created_at)}`,
	];

	if (broadcast.send_at) {
		lines.push(`Scheduled: ${formatDate(broadcast.send_at)}`);
	}
	if (broadcast.published_at) {
		lines.push(`Published: ${formatDate(broadcast.published_at)}`);
	}
	if (broadcast.preview_text) {
		lines.push(`Preview: ${broadcast.preview_text}`);
	}
	if (broadcast.email_template) {
		lines.push(`Template: ${broadcast.email_template.name} (ID: ${broadcast.email_template.id})`);
	}

	return lines.join("\n");
}

export function formatBroadcastStats(broadcast: {
	id: number;
	subject: string;
	stats: KitBroadcastStats;
}): string {
	const s = broadcast.stats;
	const lines: string[] = [
		`Broadcast: "${broadcast.subject}"`,
		`Status: ${s.status} | Recipients: ${fmt(s.recipients)}`,
		"",
		"Performance:",
		`  Open rate: ${s.open_rate.toFixed(1)}% (${fmt(s.emails_opened)} opened)`,
		`  Click rate: ${s.click_rate.toFixed(1)}%`,
		`  Unsubscribes: ${fmt(s.unsubscribes)} (${s.unsubscribe_rate.toFixed(1)}%)`,
	];

	if (s.show_total_clicks) {
		lines.push(`  Total clicks: ${fmt(s.total_clicks)}`);
	}

	if (s.open_tracking_disabled) {
		lines.push("  Note: Open tracking was disabled for this broadcast");
	}
	if (s.click_tracking_disabled) {
		lines.push("  Note: Click tracking was disabled for this broadcast");
	}

	return lines.join("\n");
}

export function formatBroadcastsStatsList(
	broadcasts: KitBroadcastStatsSummary[],
	pagination: KitPagination,
): string {
	if (broadcasts.length === 0) {
		return "No broadcast stats found.";
	}

	const lines: string[] = [`Broadcast Stats (${broadcasts.length} shown):`];

	for (const bc of broadcasts) {
		const s = bc.stats;
		lines.push(
			`  ID: ${bc.id} | ${s.status} | ${fmt(s.recipients)} recipients | Open: ${s.open_rate.toFixed(1)}% | Click: ${s.click_rate.toFixed(1)}% | Unsubs: ${fmt(s.unsubscribes)}`,
		);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	lines.push("\nTip: use 'list' action to get broadcast subjects and details.");

	return lines.join("\n");
}

export function formatBroadcastClicks(broadcast: {
	id: number;
	clicks: KitBroadcastClick[];
}): string {
	if (broadcast.clicks.length === 0) {
		return `Broadcast ${broadcast.id}: No click data available.`;
	}

	const sorted = [...broadcast.clicks].sort((a, b) => b.unique_clicks - a.unique_clicks);

	const lines: string[] = [`Broadcast ${broadcast.id} — Click Analytics (${sorted.length} links):`];

	for (const click of sorted) {
		const deliveryPct = (click.click_to_delivery_rate * 100).toFixed(1);
		const openPct = (click.click_to_open_rate * 100).toFixed(1);
		lines.push(`  ${fmt(click.unique_clicks)} clicks — ${click.url}`);
		lines.push(`    Delivery rate: ${deliveryPct}% | Open rate: ${openPct}%`);
	}

	return lines.join("\n");
}

// --- Forms ---

export function formatFormList(forms: KitForm[], pagination: KitPagination): string {
	if (forms.length === 0) {
		return "No forms found.";
	}

	const lines: string[] = [`Forms (${forms.length} shown):`];

	for (const form of forms) {
		const archived = form.archived ? " [archived]" : "";
		lines.push(`  ${form.name} — ${form.type}${archived} (ID: ${form.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

// --- Subscriber Stats ---

export function formatSubscriberStats(
	subscriber: KitSubscriber,
	stats: KitSubscriberStats,
): string {
	const lines: string[] = [
		`Subscriber: ${subscriber.first_name ?? "(no name)"} (${subscriber.email_address})`,
		`ID: ${subscriber.id} | State: ${subscriber.state}`,
		"",
		"Engagement Stats:",
		`  Emails sent: ${fmt(stats.sent)} | Opened: ${fmt(stats.opened)} | Clicked: ${fmt(stats.clicked)} | Bounced: ${fmt(stats.bounced)}`,
	];

	if (stats.sent > 0) {
		lines.push(
			`  Open rate: ${stats.open_rate.toFixed(1)}% | Click rate: ${stats.click_rate.toFixed(1)}%`,
		);
	}

	if (stats.last_opened) {
		lines.push(`  Last opened: ${formatDate(stats.last_opened)}`);
	}
	if (stats.last_clicked) {
		lines.push(`  Last clicked: ${formatDate(stats.last_clicked)}`);
	}
	if (stats.sends_since_last_open > 0) {
		lines.push(`  Sends since last open: ${stats.sends_since_last_open}`);
	}

	return lines.join("\n");
}

// --- Sequences ---

export function formatSequenceList(sequences: KitSequence[], pagination: KitPagination): string {
	if (sequences.length === 0) {
		return "No sequences found.";
	}

	const lines: string[] = [`Sequences (${sequences.length} shown):`];

	for (const seq of sequences) {
		const status = seq.hold ? "[paused]" : "[active]";
		const repeat = seq.repeat ? " (repeating)" : "";
		lines.push(`  ${seq.name} ${status}${repeat} (ID: ${seq.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

// --- Custom Fields ---

export function formatCustomFieldList(fields: KitCustomField[], pagination: KitPagination): string {
	if (fields.length === 0) {
		return "No custom fields found.";
	}

	const lines: string[] = [`Custom Fields (${fields.length} shown):`];

	for (const field of fields) {
		lines.push(`  ${field.label} (key: ${field.key}, ID: ${field.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatCustomFieldDetail(field: KitCustomField, verb: string): string {
	return `Custom field ${verb}: "${field.label}" (key: ${field.key}, ID: ${field.id})`;
}

// --- Purchases ---

export function formatPurchaseList(purchases: KitPurchase[], pagination: KitPagination): string {
	if (purchases.length === 0) {
		return "No purchases found.";
	}

	const lines: string[] = [`Purchases (${purchases.length} shown):`];

	for (const p of purchases) {
		const products = p.products.map((pr) => pr.name).join(", ");
		lines.push(
			`  ${p.email_address} — ${p.currency} ${p.total.toFixed(2)} — ${products} (ID: ${p.id})`,
		);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatPurchaseDetail(purchase: KitPurchase): string {
	const lines: string[] = [
		`Purchase (ID: ${purchase.id})`,
		`Email: ${purchase.email_address} | Status: ${purchase.status}`,
		`Transaction: ${purchase.transaction_id} | Date: ${formatDate(purchase.transaction_time)}`,
		`Currency: ${purchase.currency} | Total: ${purchase.total.toFixed(2)}`,
	];

	if (purchase.subtotal !== purchase.total) {
		lines.push(
			`Subtotal: ${purchase.subtotal.toFixed(2)} | Discount: ${purchase.discount.toFixed(2)} | Tax: ${purchase.tax.toFixed(2)}`,
		);
	}

	if (purchase.products.length > 0) {
		lines.push("");
		lines.push("Products:");
		for (const p of purchase.products) {
			lines.push(`  ${p.name} — ${p.quantity}x ${p.unit_price.toFixed(2)} (SKU: ${p.sku})`);
		}
	}

	return lines.join("\n");
}

// --- Segments ---

export function formatSegmentList(segments: KitSegment[], pagination: KitPagination): string {
	if (segments.length === 0) {
		return "No segments found.";
	}

	const lines: string[] = [`Segments (${segments.length} shown):`];

	for (const seg of segments) {
		lines.push(`  ${seg.name} (ID: ${seg.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

// --- Webhooks ---

export function formatWebhookList(webhooks: KitWebhook[], pagination: KitPagination): string {
	if (webhooks.length === 0) {
		return "No webhooks found.";
	}

	const lines: string[] = [`Webhooks (${webhooks.length} shown):`];

	for (const wh of webhooks) {
		lines.push(`  ${wh.event.name} → ${wh.target_url} (ID: ${wh.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

export function formatWebhookDetail(webhook: KitWebhook, verb: string): string {
	return `Webhook ${verb}: ${webhook.event.name} → ${webhook.target_url} (ID: ${webhook.id})`;
}

// --- Email Templates ---

export function formatEmailTemplateList(
	templates: KitEmailTemplate[],
	pagination: KitPagination,
): string {
	if (templates.length === 0) {
		return "No email templates found.";
	}

	const lines: string[] = [`Email Templates (${templates.length} shown):`];

	for (const t of templates) {
		lines.push(`  ${t.name} (ID: ${t.id})`);
	}

	if (pagination.has_next_page && pagination.end_cursor) {
		lines.push(`\nNext page: use cursor "${pagination.end_cursor}"`);
	}

	return lines.join("\n");
}

// --- Subscriber Comparison ---

export function formatSubscriberComparison(
	results: { subscriber: KitSubscriber; stats: KitSubscriberStats }[],
	failures: { id: number; error: string }[],
	apiCalls: number,
): string {
	if (results.length === 0) {
		const lines = ["No subscriber stats could be loaded."];
		if (failures.length > 0) {
			lines.push(`Failed IDs: ${failures.map((f) => `${f.id} (${f.error})`).join(", ")}`);
		}
		lines.push(`API calls: ${apiCalls} requests used.`);
		return lines.join("\n");
	}

	const sorted = [...results].sort((a, b) => b.stats.open_rate - a.stats.open_rate);
	const totalRequested = results.length + failures.length;

	const lines: string[] = [
		`Subscriber Comparison (${results.length} of ${totalRequested} loaded, sorted by open rate):`,
		"",
	];

	for (const [i, entry] of sorted.entries()) {
		const { subscriber: sub, stats } = entry;
		const name = sub.first_name ?? "(no name)";
		const lastOpen = stats.last_opened ? formatDate(stats.last_opened) : "never";
		lines.push(
			`  ${i + 1}. ${name} <${sub.email_address}> — Open: ${stats.open_rate.toFixed(1)}% | Click: ${stats.click_rate.toFixed(1)}% | Sent: ${fmt(stats.sent)} | Last open: ${lastOpen} (ID: ${sub.id})`,
		);
	}

	if (failures.length > 0) {
		lines.push(`\nNot found (skipped): IDs ${failures.map((f) => f.id).join(", ")}`);
	}

	lines.push(`API calls: ${apiCalls} requests used.`);

	return lines.join("\n");
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

/** Format ISO date to readable short format */
function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toISOString().split("T")[0] as string;
}

function getBroadcastStatus(broadcast: KitBroadcast): string {
	if (broadcast.published_at) return "sent";
	if (broadcast.send_at) return "scheduled";
	return "draft";
}
