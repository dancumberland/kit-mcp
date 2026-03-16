import { describe, expect, it } from "vitest";
import {
	formatAccountOverview,
	formatBroadcastDetail,
	formatBroadcastList,
	formatBroadcastStats,
	formatConnectionSuccess,
	formatCustomFieldDetail,
	formatCustomFieldList,
	formatEmailTemplateList,
	formatFormList,
	formatPurchaseDetail,
	formatPurchaseList,
	formatSegmentList,
	formatSequenceList,
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
	KitCreatorProfile,
	KitCustomField,
	KitEmailStats,
	KitEmailTemplate,
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
	it("shows performance metrics", () => {
		const result = formatBroadcastStats({
			id: 42,
			subject: "March Newsletter",
			stats: {
				recipients: 11234,
				open_rate: 43.5,
				click_rate: 11.0,
				unsubscribes: 23,
				total_clicks: 1234,
				show_total_clicks: true,
				status: "completed",
				progress: 100,
			},
		});
		expect(result).toContain("March Newsletter");
		expect(result).toContain("11,234");
		expect(result).toContain("43.5%");
		expect(result).toContain("11.0%");
		expect(result).toContain("1,234");
	});

	it("hides total clicks when show_total_clicks is false", () => {
		const result = formatBroadcastStats({
			id: 1,
			subject: "Test",
			stats: {
				recipients: 100,
				open_rate: 50.0,
				click_rate: 10.0,
				unsubscribes: 1,
				total_clicks: 50,
				show_total_clicks: false,
				status: "completed",
				progress: 100,
			},
		});
		expect(result).not.toContain("Total clicks");
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
