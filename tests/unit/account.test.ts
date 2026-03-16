import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockAccount = {
	user: { id: 1, email: "dan@example.com" },
	account: {
		id: 100,
		name: "DCL Account",
		plan_type: "creator_pro",
		primary_email_address: "dan@example.com",
		created_at: "2023-01-01T00:00:00Z",
		timezone: { name: "US/Eastern", friendly_name: "Eastern Time", utc_offset: "-05:00" },
	},
};

const mockProfile = {
	profile: {
		name: "Dan Cumberland",
		byline: "AI Strategy",
		bio: "Helping leaders with AI",
		image_url: "https://example.com/img.jpg",
		profile_url: "https://example.com/profile",
	},
};

const mockEmailStats = {
	stats: {
		sent: 10000,
		opened: 4300,
		clicked: 1100,
		email_stats_mode: "last_90",
		open_tracking_enabled: true,
		click_tracking_enabled: true,
		starting: "2025-12-15T00:00:00Z",
		ending: "2026-03-15T00:00:00Z",
	},
};

const mockGrowthStats = {
	stats: {
		subscribers: 15000,
		new_subscribers: 800,
		cancellations: 120,
		net_new_subscribers: 680,
		starting: "2025-12-15",
		ending: "2026-03-15",
	},
};

describe("handleGetAccount", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);
		vi.stubEnv("KIT_API_KEY", "test-key");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	async function importFresh() {
		const clientMod = await import("../../src/client.js");
		const accountMod = await import("../../src/tools/account.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleGetAccount: accountMod.handleGetAccount,
		};
	}

	function mockAllEndpoints() {
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify(mockAccount), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(mockProfile), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(mockEmailStats), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(mockGrowthStats), { status: 200 }));
	}

	it("composes full account overview from 4 API calls", async () => {
		mockAllEndpoints();
		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Account: DCL Account");
		expect(result).toContain("Creator Pro");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("Eastern Time (-05:00)");
	});

	it("includes creator profile when available", async () => {
		mockAllEndpoints();
		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Creator Profile:");
		expect(result).toContain("Dan Cumberland");
		expect(result).toContain("AI Strategy");
		expect(result).toContain("Helping leaders with AI");
	});

	it("includes email stats with computed rates", async () => {
		mockAllEndpoints();
		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Email Stats");
		expect(result).toContain("10,000");
		expect(result).toContain("43.0%"); // open rate: 4300/10000
		expect(result).toContain("11.0%"); // click rate: 1100/10000
	});

	it("includes growth stats with net subscriber count", async () => {
		mockAllEndpoints();
		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Growth");
		expect(result).toContain("15,000");
		expect(result).toContain("+800");
		expect(result).toContain("-120");
		expect(result).toContain("+680");
	});

	it("handles all optional endpoints failing gracefully", async () => {
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify(mockAccount), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"));

		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Account: DCL Account");
		expect(result).toContain("Creator Pro");
		expect(result).not.toContain("Creator Profile:");
		expect(result).not.toContain("Email Stats");
		expect(result).not.toContain("Growth");
	});

	it("shows open tracking disabled note", async () => {
		const statsWithTrackingOff = {
			stats: {
				...mockEmailStats.stats,
				open_tracking_enabled: false,
			},
		};

		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify(mockAccount), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockResolvedValueOnce(new Response(JSON.stringify(statsWithTrackingOff), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"));

		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Open tracking is disabled");
	});

	it("handles zero emails sent without NaN rates", async () => {
		const zeroStats = {
			stats: {
				...mockEmailStats.stats,
				sent: 0,
				opened: 0,
				clicked: 0,
			},
		};

		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify(mockAccount), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockResolvedValueOnce(new Response(JSON.stringify(zeroStats), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"));

		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).not.toContain("NaN");
		expect(result).not.toContain("Open rate:");
	});

	it("formats plan_type with underscores as title case", async () => {
		const freeAccount = {
			...mockAccount,
			account: { ...mockAccount.account, plan_type: "free" },
		};

		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify(freeAccount), { status: 200 }))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"));

		const { client, handleGetAccount } = await importFresh();
		const result = await handleGetAccount(client);

		expect(result).toContain("Plan: Free");
	});
});
