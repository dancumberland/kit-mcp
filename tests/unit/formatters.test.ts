import { describe, expect, it } from "vitest";
import {
	formatAccountOverview,
	formatBroadcastClicks,
	formatBroadcastDetail,
	formatBroadcastList,
	formatBroadcastStats,
	formatBroadcastsStatsList,
	formatConnectionSuccess,
	formatCustomFieldDetail,
	formatCustomFieldList,
	formatEmailTemplateList,
	formatFilteredSubscriberList,
	formatFormList,
	formatPurchaseDetail,
	formatPurchaseList,
	formatSegmentList,
	formatSequenceList,
	formatSubscriberComparison,
	formatSubscriberList,
	formatSubscriberStats,
	formatSubscriberSummary,
	formatTagDetail,
	formatTagList,
	formatWebhookDetail,
	formatWebhookList,
} from "../../src/formatters.js";
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
} from "../../src/types.js";

const mockUser: KitUser = { id: 1, email: "dc@dancumberlandlabs.com" };

const mockAccount: KitAccount = {
	id: 100,
	name: "Dan Cumberland Labs",
	plan_type: "creator_pro",
	primary_email_address: "dc@dancumberlandlabs.com",
	created_at: "2023-01-15T00:00:00Z",
	timezone: {
		name: "US/Eastern",
		friendly_name: "Eastern Time (US & Canada)",
		utc_offset: "-05:00",
	},
};

const mockProfile: KitCreatorProfile = {
	name: "Dan Cumberland",
	byline: "AI implementation consultant",
	bio: "Helping founder-led firms with AI",
	image_url: "https://example.com/avatar.jpg",
	profile_url: "https://example.com/dan",
};

const mockEmailStats: KitEmailStats = {
	sent: 10000,
	opened: 4300,
	clicked: 870,
	email_stats_mode: "last_90",
	open_tracking_enabled: true,
	click_tracking_enabled: true,
	starting: "2025-12-15T00:00:00Z",
	ending: "2026-03-15T00:00:00Z",
};

const mockGrowthStats: KitGrowthStats = {
	subscribers: 12847,
	new_subscribers: 1234,
	cancellations: 89,
	net_new_subscribers: 1145,
	starting: "2025-12-15",
	ending: "2026-03-15",
};

describe("formatConnectionSuccess", () => {
	it("shows account name, auth method, and rate limit", () => {
		const result = formatConnectionSuccess("Dan Cumberland Labs", "api_key", 120);
		expect(result).toContain("✓ Connected to Kit account: Dan Cumberland Labs");
		expect(result).toContain("API Key");
		expect(result).toContain("120 requests/minute");
	});

	it("shows OAuth when oauth auth method", () => {
		const result = formatConnectionSuccess("Test Account", "oauth", 600);
		expect(result).toContain("OAuth");
		expect(result).toContain("600 requests/minute");
	});
});

describe("formatAccountOverview", () => {
	it("includes account name and plan", () => {
		const result = formatAccountOverview(mockUser, mockAccount, null, null, null);
		expect(result).toContain("Account: Dan Cumberland Labs");
		expect(result).toContain("Creator Pro");
		expect(result).toContain("dc@dancumberlandlabs.com");
	});

	it("includes timezone", () => {
		const result = formatAccountOverview(mockUser, mockAccount, null, null, null);
		expect(result).toContain("Eastern Time (US & Canada)");
		expect(result).toContain("-05:00");
	});

	it("includes creator profile when provided", () => {
		const result = formatAccountOverview(mockUser, mockAccount, mockProfile, null, null);
		expect(result).toContain("Creator Profile:");
		expect(result).toContain("Dan Cumberland");
		expect(result).toContain("Helping founder-led firms with AI");
	});

	it("includes email stats with rates when provided", () => {
		const result = formatAccountOverview(mockUser, mockAccount, null, mockEmailStats, null);
		expect(result).toContain("Email Stats (last_90):");
		expect(result).toContain("10,000");
		expect(result).toContain("43.0%"); // open rate
		expect(result).toContain("8.7%"); // click rate
	});

	it("shows open tracking disabled note", () => {
		const stats: KitEmailStats = { ...mockEmailStats, open_tracking_enabled: false };
		const result = formatAccountOverview(mockUser, mockAccount, null, stats, null);
		expect(result).toContain("Open tracking is disabled");
	});

	it("includes growth stats when provided", () => {
		const result = formatAccountOverview(mockUser, mockAccount, null, null, mockGrowthStats);
		expect(result).toContain("Total subscribers: 12,847");
		expect(result).toContain("+1,234");
		expect(result).toContain("-89");
		expect(result).toContain("+1,145");
	});

	it("handles negative net growth", () => {
		const stats: KitGrowthStats = { ...mockGrowthStats, net_new_subscribers: -50 };
		const result = formatAccountOverview(mockUser, mockAccount, null, null, stats);
		expect(result).toContain("-50");
		expect(result).not.toContain("+-50");
	});

	it("renders full overview with all data", () => {
		const result = formatAccountOverview(
			mockUser,
			mockAccount,
			mockProfile,
			mockEmailStats,
			mockGrowthStats,
		);
		expect(result).toContain("Account:");
		expect(result).toContain("Creator Profile:");
		expect(result).toContain("Email Stats");
		expect(result).toContain("Growth");
	});

	it("handles zero sent emails without NaN rates", () => {
		const stats: KitEmailStats = { ...mockEmailStats, sent: 0, opened: 0, clicked: 0 };
		const result = formatAccountOverview(mockUser, mockAccount, null, stats, null);
		expect(result).not.toContain("NaN");
		expect(result).not.toContain("Open rate:");
	});
});

// --- Phase 2 Formatter Tests ---

const basePagination: KitPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

const nextPagePagination: KitPagination = {
	...basePagination,
	has_next_page: true,
	end_cursor: "cursor_abc",
};

describe("formatSubscriberSummary", () => {
	const sub: KitSubscriber = {
		id: 123,
		first_name: "Dan",
		email_address: "dan@example.com",
		state: "active",
		created_at: "2024-01-15T00:00:00Z",
		fields: { role: "executive", company: "Acme" },
	};

	const tags: KitTag[] = [
		{ id: 1, name: "ai-strategy", created_at: "2024-01-01T00:00:00Z" },
		{ id: 2, name: "newsletter", created_at: "2024-01-01T00:00:00Z" },
	];

	it("includes name, email, state, and created date", () => {
		const result = formatSubscriberSummary(sub, []);
		expect(result).toContain("Dan");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("active");
		expect(result).toContain("2024-01-15");
	});

	it("includes tags when provided", () => {
		const result = formatSubscriberSummary(sub, tags);
		expect(result).toContain("Tags: ai-strategy, newsletter");
	});

	it("includes custom fields", () => {
		const result = formatSubscriberSummary(sub, []);
		expect(result).toContain("role=executive");
		expect(result).toContain("company=Acme");
	});

	it("handles null first_name", () => {
		const noName: KitSubscriber = { ...sub, first_name: null };
		const result = formatSubscriberSummary(noName, []);
		expect(result).toContain("(no name)");
	});

	it("omits empty custom fields", () => {
		const noFields: KitSubscriber = { ...sub, fields: { empty: null, blank: "" } };
		const result = formatSubscriberSummary(noFields, []);
		expect(result).not.toContain("Custom fields:");
	});
});

describe("formatSubscriberList", () => {
	it("returns no subscribers message for empty list", () => {
		expect(formatSubscriberList([], basePagination)).toBe("No subscribers found.");
	});

	it("shows pagination cursor when has_next_page", () => {
		const sub: KitSubscriber = {
			id: 1,
			first_name: "Dan",
			email_address: "dan@example.com",
			state: "active",
			created_at: "2024-01-01T00:00:00Z",
			fields: {},
		};
		const result = formatSubscriberList([sub], nextPagePagination);
		expect(result).toContain('cursor "cursor_abc"');
	});
});

describe("formatFilteredSubscriberList", () => {
	const filterPagination = {
		...basePagination,
		total_count: 42,
	};

	it("returns no match message for empty list", () => {
		expect(formatFilteredSubscriberList([], { ...filterPagination, total_count: 0 })).toBe(
			"No subscribers matched the engagement filter.",
		);
	});

	it("shows total count and subscriber details with tags", () => {
		const subs: KitFilteredSubscriber[] = [
			{
				id: "100",
				first_name: "Alice",
				email_address: "alice@example.com",
				created_at: "2024-06-01T00:00:00Z",
				tag_names: ["newsletter", "vip"],
				tag_ids: ["1", "5"],
			},
			{
				id: "200",
				first_name: null,
				email_address: "bob@example.com",
				created_at: "2024-03-15T00:00:00Z",
				tag_names: [],
				tag_ids: [],
			},
		];

		const result = formatFilteredSubscriberList(subs, filterPagination);
		expect(result).toContain("42 total");
		expect(result).toContain("Alice <alice@example.com> [newsletter, vip]");
		expect(result).toContain("(no name) <bob@example.com>");
		expect(result).not.toContain("[]"); // no empty tag brackets
	});

	it("shows pagination cursor when has_next_page", () => {
		const subs: KitFilteredSubscriber[] = [
			{
				id: "1",
				first_name: "Test",
				email_address: "test@example.com",
				created_at: "2024-01-01T00:00:00Z",
				tag_names: [],
				tag_ids: [],
			},
		];
		const result = formatFilteredSubscriberList(subs, {
			...nextPagePagination,
			total_count: 100,
		});
		expect(result).toContain('cursor "cursor_abc"');
	});
});

describe("formatTagList", () => {
	it("returns no tags message for empty list", () => {
		expect(formatTagList([], basePagination)).toBe("No tags found.");
	});

	it("shows tag names and IDs", () => {
		const tags: KitTag[] = [{ id: 1, name: "ai-strategy", created_at: "2024-01-01T00:00:00Z" }];
		const result = formatTagList(tags, basePagination);
		expect(result).toContain("ai-strategy (ID: 1)");
	});
});

describe("formatTagDetail", () => {
	it("formats created tag", () => {
		const tag: KitTag = { id: 5, name: "new-tag", created_at: "2026-03-15T00:00:00Z" };
		expect(formatTagDetail(tag, "created")).toBe('Tag created: "new-tag" (ID: 5)');
	});

	it("formats updated tag", () => {
		const tag: KitTag = { id: 5, name: "renamed", created_at: "2026-03-15T00:00:00Z" };
		expect(formatTagDetail(tag, "updated")).toBe('Tag updated: "renamed" (ID: 5)');
	});
});

describe("formatBroadcastList", () => {
	it("returns no broadcasts message for empty list", () => {
		expect(formatBroadcastList([], basePagination)).toBe("No broadcasts found.");
	});

	it("shows draft/sent/scheduled status", () => {
		const drafts: KitBroadcast[] = [
			{
				id: 1,
				subject: "Draft Email",
				description: null,
				content: null,
				public: false,
				published_at: null,
				send_at: null,
				thumbnail_alt: null,
				thumbnail_url: null,
				preview_text: null,
				created_at: "2026-03-10T00:00:00Z",
				email_template: null,
			},
		];
		const result = formatBroadcastList(drafts, basePagination);
		expect(result).toContain("draft");
		expect(result).toContain("Draft Email");
	});
});

describe("formatBroadcastDetail", () => {
	it("shows broadcast details including template", () => {
		const bc: KitBroadcast = {
			id: 42,
			subject: "Test Broadcast",
			description: null,
			content: "<p>Hello</p>",
			public: false,
			published_at: null,
			send_at: null,
			thumbnail_alt: null,
			thumbnail_url: null,
			preview_text: "Preview here",
			created_at: "2026-03-12T00:00:00Z",
			email_template: { id: 5, name: "Default" },
		};
		const result = formatBroadcastDetail(bc);
		expect(result).toContain("Test Broadcast");
		expect(result).toContain("ID: 42");
		expect(result).toContain("Preview: Preview here");
		expect(result).toContain("Default");
	});
});

describe("formatBroadcastStats", () => {
	const fullStats: KitBroadcastStats = {
		recipients: 11234,
		open_rate: 43.5,
		click_rate: 11.0,
		unsubscribes: 23,
		total_clicks: 1234,
		show_total_clicks: true,
		status: "completed",
		progress: 100,
		emails_opened: 4886,
		unsubscribe_rate: 0.2,
		open_tracking_disabled: false,
		click_tracking_disabled: false,
	};

	it("shows performance metrics including opened count and unsubscribe rate", () => {
		const result = formatBroadcastStats({
			id: 42,
			subject: "March Newsletter",
			stats: fullStats,
		});
		expect(result).toContain("March Newsletter");
		expect(result).toContain("11,234");
		expect(result).toContain("43.5%");
		expect(result).toContain("4,886 opened");
		expect(result).toContain("11.0%");
		expect(result).toContain("0.2%");
		expect(result).toContain("1,234");
		expect(result).not.toContain("tracking was disabled");
	});

	it("hides total clicks when show_total_clicks is false", () => {
		const result = formatBroadcastStats({
			id: 1,
			subject: "Test",
			stats: { ...fullStats, show_total_clicks: false },
		});
		expect(result).not.toContain("Total clicks");
	});

	it("shows tracking disabled notes when applicable", () => {
		const result = formatBroadcastStats({
			id: 1,
			subject: "Test",
			stats: { ...fullStats, open_tracking_disabled: true, click_tracking_disabled: true },
		});
		expect(result).toContain("Open tracking was disabled");
		expect(result).toContain("Click tracking was disabled");
	});
});

describe("formatBroadcastsStatsList", () => {
	const mockStats: KitBroadcastStats = {
		recipients: 5000,
		open_rate: 40.0,
		click_rate: 9.5,
		unsubscribes: 15,
		total_clicks: 475,
		show_total_clicks: true,
		status: "completed",
		progress: 100,
		emails_opened: 2000,
		unsubscribe_rate: 0.3,
		open_tracking_disabled: false,
		click_tracking_disabled: false,
	};

	it("returns no stats message for empty list", () => {
		expect(formatBroadcastsStatsList([], basePagination)).toBe("No broadcast stats found.");
	});

	it("shows stats summary per broadcast with tip", () => {
		const broadcasts: KitBroadcastStatsSummary[] = [
			{ id: 42, stats: mockStats },
			{ id: 43, stats: { ...mockStats, recipients: 8000, open_rate: 51.2 } },
		];
		const result = formatBroadcastsStatsList(broadcasts, basePagination);
		expect(result).toContain("Broadcast Stats (2 shown):");
		expect(result).toContain("ID: 42");
		expect(result).toContain("5,000 recipients");
		expect(result).toContain("Open: 40.0%");
		expect(result).toContain("Click: 9.5%");
		expect(result).toContain("ID: 43");
		expect(result).toContain("51.2%");
		expect(result).toContain("Tip:");
	});

	it("shows pagination cursor when has_next_page", () => {
		const broadcasts: KitBroadcastStatsSummary[] = [{ id: 1, stats: mockStats }];
		const result = formatBroadcastsStatsList(broadcasts, nextPagePagination);
		expect(result).toContain('cursor "cursor_abc"');
	});
});

describe("formatBroadcastClicks", () => {
	it("returns no data message for empty clicks", () => {
		const result = formatBroadcastClicks({ id: 42, clicks: [] });
		expect(result).toContain("No click data available");
	});

	it("sorts links by unique_clicks descending and converts rates", () => {
		const clicks: KitBroadcastClick[] = [
			{
				url: "https://example.com/low",
				unique_clicks: 10,
				click_to_delivery_rate: 0.001,
				click_to_open_rate: 0.002,
			},
			{
				url: "https://example.com/high",
				unique_clicks: 500,
				click_to_delivery_rate: 0.05,
				click_to_open_rate: 0.1,
			},
		];
		const result = formatBroadcastClicks({ id: 42, clicks });
		expect(result).toContain("Click Analytics (2 links):");
		expect(result).toContain("500 clicks");
		expect(result).toContain("https://example.com/high");
		// Verify sorting: high before low
		const highIdx = result.indexOf("https://example.com/high");
		const lowIdx = result.indexOf("https://example.com/low");
		expect(highIdx).toBeLessThan(lowIdx);
		// Rate conversion: 0.05 → 5.0%, 0.1 → 10.0%
		expect(result).toContain("5.0%");
		expect(result).toContain("10.0%");
	});

	it("handles single link", () => {
		const clicks: KitBroadcastClick[] = [
			{
				url: "https://example.com/only",
				unique_clicks: 42,
				click_to_delivery_rate: 0.006,
				click_to_open_rate: 0.012,
			},
		];
		const result = formatBroadcastClicks({ id: 1, clicks });
		expect(result).toContain("1 links");
		expect(result).toContain("42 clicks");
		expect(result).toContain("0.6%");
		expect(result).toContain("1.2%");
	});
});

describe("formatFormList", () => {
	it("returns no forms message for empty list", () => {
		expect(formatFormList([], basePagination)).toBe("No forms found.");
	});

	it("shows form type and archived status", () => {
		const forms: KitForm[] = [
			{
				id: 10,
				name: "Newsletter Signup",
				type: "embed",
				format: "inline",
				embed_js: null,
				embed_url: null,
				archived: false,
				uid: "abc",
				created_at: "2024-01-01T00:00:00Z",
			},
			{
				id: 11,
				name: "Old Form",
				type: "modal",
				format: null,
				embed_js: null,
				embed_url: null,
				archived: true,
				uid: "def",
				created_at: "2024-01-01T00:00:00Z",
			},
		];
		const result = formatFormList(forms, basePagination);
		expect(result).toContain("Newsletter Signup — embed");
		expect(result).toContain("Old Form — modal [archived]");
	});
});

// --- Phase 3 Formatter Tests ---

describe("formatSubscriberStats", () => {
	const sub: KitSubscriber = {
		id: 123,
		first_name: "Dan",
		email_address: "dan@example.com",
		state: "active",
		created_at: "2024-01-15T00:00:00Z",
		fields: {},
	};

	const stats: KitSubscriberStats = {
		sent: 100,
		opened: 47,
		clicked: 12,
		bounced: 2,
		open_rate: 47.0,
		click_rate: 12.0,
		last_sent: "2026-03-10T00:00:00Z",
		last_opened: "2026-03-10T00:00:00Z",
		last_clicked: "2026-03-08T00:00:00Z",
		sends_since_last_open: 0,
		sends_since_last_click: 2,
	};

	it("includes subscriber info and engagement metrics", () => {
		const result = formatSubscriberStats(sub, stats);
		expect(result).toContain("Dan");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("Engagement Stats:");
		expect(result).toContain("47.0%");
		expect(result).toContain("12.0%");
		expect(result).toContain("Last opened: 2026-03-10");
		expect(result).toContain("Last clicked: 2026-03-08");
	});

	it("shows sends_since_last_open when positive", () => {
		const staleStats: KitSubscriberStats = { ...stats, sends_since_last_open: 5 };
		const result = formatSubscriberStats(sub, staleStats);
		expect(result).toContain("Sends since last open: 5");
	});

	it("omits rates when no emails sent", () => {
		const noSends: KitSubscriberStats = {
			...stats,
			sent: 0,
			opened: 0,
			clicked: 0,
			bounced: 0,
		};
		const result = formatSubscriberStats(sub, noSends);
		expect(result).not.toContain("Open rate:");
	});
});

describe("formatSequenceList", () => {
	it("returns no sequences message for empty list", () => {
		expect(formatSequenceList([], basePagination)).toBe("No sequences found.");
	});

	it("shows sequence status and repeat flag", () => {
		const seqs: KitSequence[] = [
			{ id: 1, name: "Welcome", hold: false, repeat: false, created_at: "2024-01-01T00:00:00Z" },
			{ id: 2, name: "Nurture", hold: true, repeat: true, created_at: "2024-01-01T00:00:00Z" },
		];
		const result = formatSequenceList(seqs, basePagination);
		expect(result).toContain("Welcome [active]");
		expect(result).toContain("Nurture [paused] (repeating)");
	});
});

describe("formatCustomFieldList", () => {
	it("returns no fields message for empty list", () => {
		expect(formatCustomFieldList([], basePagination)).toBe("No custom fields found.");
	});

	it("shows field label, key, and ID", () => {
		const fields: KitCustomField[] = [{ id: 1, key: "role", label: "Role" }];
		const result = formatCustomFieldList(fields, basePagination);
		expect(result).toContain("Role (key: role, ID: 1)");
	});
});

describe("formatCustomFieldDetail", () => {
	it("formats created field", () => {
		const field: KitCustomField = { id: 5, key: "company", label: "Company" };
		expect(formatCustomFieldDetail(field, "created")).toBe(
			'Custom field created: "Company" (key: company, ID: 5)',
		);
	});
});

describe("formatPurchaseList", () => {
	it("returns no purchases message for empty list", () => {
		expect(formatPurchaseList([], basePagination)).toBe("No purchases found.");
	});

	it("shows purchase summary", () => {
		const purchases: KitPurchase[] = [
			{
				id: 1,
				transaction_id: "txn_1",
				status: "paid",
				email_address: "dan@example.com",
				currency: "USD",
				transaction_time: "2026-03-10T00:00:00Z",
				subtotal: 97.0,
				discount: 0,
				tax: 0,
				total: 97.0,
				products: [
					{ pid: "p1", lid: 1, name: "AI Course", sku: "AI-101", unit_price: 97.0, quantity: 1 },
				],
			},
		];
		const result = formatPurchaseList(purchases, basePagination);
		expect(result).toContain("dan@example.com");
		expect(result).toContain("USD 97.00");
		expect(result).toContain("AI Course");
	});
});

describe("formatPurchaseDetail", () => {
	it("shows full purchase breakdown", () => {
		const purchase: KitPurchase = {
			id: 1,
			transaction_id: "txn_1",
			status: "paid",
			email_address: "dan@example.com",
			currency: "USD",
			transaction_time: "2026-03-10T00:00:00Z",
			subtotal: 100.0,
			discount: 10.0,
			tax: 7.0,
			total: 97.0,
			products: [
				{ pid: "p1", lid: 1, name: "AI Course", sku: "AI-101", unit_price: 100.0, quantity: 1 },
			],
		};
		const result = formatPurchaseDetail(purchase);
		expect(result).toContain("Purchase (ID: 1)");
		expect(result).toContain("txn_1");
		expect(result).toContain("Subtotal: 100.00");
		expect(result).toContain("Discount: 10.00");
		expect(result).toContain("Tax: 7.00");
		expect(result).toContain("AI Course");
	});
});

describe("formatSegmentList", () => {
	it("returns no segments message for empty list", () => {
		expect(formatSegmentList([], basePagination)).toBe("No segments found.");
	});

	it("shows segment names and IDs", () => {
		const segs: KitSegment[] = [{ id: 1, name: "Active", created_at: "2024-01-01T00:00:00Z" }];
		const result = formatSegmentList(segs, basePagination);
		expect(result).toContain("Active (ID: 1)");
	});
});

describe("formatWebhookList", () => {
	it("returns no webhooks message for empty list", () => {
		expect(formatWebhookList([], basePagination)).toBe("No webhooks found.");
	});

	it("shows event and target URL", () => {
		const webhooks: KitWebhook[] = [
			{
				id: 1,
				target_url: "https://example.com/hook",
				event: { name: "subscriber.subscriber_activate" },
			},
		];
		const result = formatWebhookList(webhooks, basePagination);
		expect(result).toContain("subscriber.subscriber_activate");
		expect(result).toContain("https://example.com/hook");
	});
});

describe("formatWebhookDetail", () => {
	it("formats created webhook", () => {
		const wh: KitWebhook = {
			id: 3,
			target_url: "https://example.com/new",
			event: { name: "subscriber.form_subscribe" },
		};
		expect(formatWebhookDetail(wh, "created")).toBe(
			"Webhook created: subscriber.form_subscribe → https://example.com/new (ID: 3)",
		);
	});
});

describe("formatEmailTemplateList", () => {
	it("returns no templates message for empty list", () => {
		expect(formatEmailTemplateList([], basePagination)).toBe("No email templates found.");
	});

	it("shows template names and IDs", () => {
		const templates: KitEmailTemplate[] = [
			{ id: 1, name: "Default" },
			{ id: 2, name: "Newsletter" },
		];
		const result = formatEmailTemplateList(templates, basePagination);
		expect(result).toContain("Email Templates (2 shown):");
		expect(result).toContain("Default (ID: 1)");
		expect(result).toContain("Newsletter (ID: 2)");
	});
});

describe("formatSubscriberComparison", () => {
	const makeSub = (id: number, name: string, email: string): KitSubscriber => ({
		id,
		first_name: name,
		email_address: email,
		state: "active",
		created_at: "2024-01-01T00:00:00Z",
		fields: {},
	});

	const makeStats = (
		openRate: number,
		clickRate: number,
		sent: number,
		lastOpened: string | null,
	): KitSubscriberStats => ({
		sent,
		opened: Math.round(sent * (openRate / 100)),
		clicked: Math.round(sent * (clickRate / 100)),
		bounced: 0,
		open_rate: openRate,
		click_rate: clickRate,
		last_sent: null,
		last_opened: lastOpened,
		last_clicked: null,
		sends_since_last_open: 0,
		sends_since_last_click: 0,
	});

	it("sorts by open rate descending", () => {
		const results = [
			{
				subscriber: makeSub(1, "Low", "low@example.com"),
				stats: makeStats(20.0, 5.0, 50, "2026-03-01T00:00:00Z"),
			},
			{
				subscriber: makeSub(2, "High", "high@example.com"),
				stats: makeStats(80.0, 20.0, 100, "2026-03-10T00:00:00Z"),
			},
			{
				subscriber: makeSub(3, "Mid", "mid@example.com"),
				stats: makeStats(50.0, 10.0, 75, "2026-03-05T00:00:00Z"),
			},
		];

		const result = formatSubscriberComparison(results, [], 6);
		const highIdx = result.indexOf("High");
		const midIdx = result.indexOf("Mid");
		const lowIdx = result.indexOf("Low");
		expect(highIdx).toBeLessThan(midIdx);
		expect(midIdx).toBeLessThan(lowIdx);
		expect(result).toContain("1. High");
		expect(result).toContain("2. Mid");
		expect(result).toContain("3. Low");
	});

	it("shows failure notes for skipped IDs", () => {
		const results = [
			{
				subscriber: makeSub(1, "Alice", "alice@example.com"),
				stats: makeStats(45.0, 12.0, 80, "2026-03-10T00:00:00Z"),
			},
		];
		const failures = [
			{ id: 999, error: "Not found" },
			{ id: 1001, error: "Timeout" },
		];

		const result = formatSubscriberComparison(results, failures, 6);
		expect(result).toContain("1 of 3 loaded");
		expect(result).toContain("Not found (skipped): IDs 999, 1001");
	});

	it("handles empty results (all failed)", () => {
		const failures = [
			{ id: 100, error: "Not found" },
			{ id: 200, error: "Not found" },
		];

		const result = formatSubscriberComparison([], failures, 4);
		expect(result).toContain("No subscriber stats could be loaded");
		expect(result).toContain("100");
		expect(result).toContain("200");
	});

	it("shows API call count", () => {
		const results = [
			{
				subscriber: makeSub(1, "Test", "test@example.com"),
				stats: makeStats(50.0, 10.0, 100, null),
			},
		];

		const result = formatSubscriberComparison(results, [], 2);
		expect(result).toContain("API calls: 2 requests used.");
	});
});
