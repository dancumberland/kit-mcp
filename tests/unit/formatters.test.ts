import { describe, expect, it } from "vitest";
import { formatAccountOverview, formatConnectionSuccess } from "../../src/formatters.js";
import type {
	KitAccount,
	KitCreatorProfile,
	KitEmailStats,
	KitGrowthStats,
	KitUser,
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
