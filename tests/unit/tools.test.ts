import { describe, expect, it, vi } from "vitest";
import { KitClient } from "../../src/client.js";
import { handleGetAccount } from "../../src/tools/account.js";
import { handleTestConnection } from "../../src/tools/connection.js";

// Create a mock client that doesn't need env vars
function createMockClient() {
	return new KitClient({
		apiKey: "test-key",
		authMethod: "api_key",
		rateLimitPerMinute: 120,
	});
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown): Response {
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

describe("handleTestConnection", () => {
	it("returns formatted connection success", async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				user: { id: 1, email: "test@example.com" },
				account: {
					id: 100,
					name: "Test Account",
					plan_type: "creator",
					primary_email_address: "test@example.com",
					created_at: "2023-01-01T00:00:00Z",
					timezone: { name: "US/Eastern", friendly_name: "Eastern", utc_offset: "-05:00" },
				},
			}),
		);

		const client = createMockClient();
		const result = await handleTestConnection(client);

		expect(result).toContain("✓ Connected to Kit account: Test Account");
		expect(result).toContain("API Key");
		expect(result).toContain("120 requests/minute");
	});
});

describe("handleGetAccount", () => {
	it("composes data from multiple API calls", async () => {
		mockFetch
			.mockResolvedValueOnce(
				jsonResponse({
					user: { id: 1, email: "test@example.com" },
					account: {
						id: 100,
						name: "Test Account",
						plan_type: "creator_pro",
						primary_email_address: "test@example.com",
						created_at: "2023-01-01T00:00:00Z",
						timezone: { name: "US/Eastern", friendly_name: "Eastern", utc_offset: "-05:00" },
					},
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					profile: {
						name: "Test User",
						byline: "Builder",
						bio: "Building things",
						image_url: "https://example.com/img.jpg",
						profile_url: "https://example.com/profile",
					},
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					stats: {
						sent: 5000,
						opened: 2000,
						clicked: 500,
						email_stats_mode: "last_90",
						open_tracking_enabled: true,
						click_tracking_enabled: true,
						starting: "2025-12-15T00:00:00Z",
						ending: "2026-03-15T00:00:00Z",
					},
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({
					stats: {
						subscribers: 10000,
						new_subscribers: 500,
						cancellations: 50,
						net_new_subscribers: 450,
						starting: "2025-12-15",
						ending: "2026-03-15",
					},
				}),
			);

		const client = createMockClient();
		const result = await handleGetAccount(client);

		expect(result).toContain("Account: Test Account");
		expect(result).toContain("Creator Pro");
		expect(result).toContain("Creator Profile:");
		expect(result).toContain("Test User");
		expect(result).toContain("Email Stats");
		expect(result).toContain("40.0%"); // open rate: 2000/5000
		expect(result).toContain("Growth");
		expect(result).toContain("10,000");
	});

	it("handles partial failures gracefully", async () => {
		mockFetch
			.mockResolvedValueOnce(
				jsonResponse({
					user: { id: 1, email: "test@example.com" },
					account: {
						id: 100,
						name: "Test Account",
						plan_type: "free",
						primary_email_address: "test@example.com",
						created_at: "2023-01-01T00:00:00Z",
						timezone: { name: "UTC", friendly_name: "UTC", utc_offset: "+00:00" },
					},
				}),
			)
			// Profile, email stats, growth stats all fail
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"))
			.mockRejectedValueOnce(new Error("Not available"));

		const client = createMockClient();
		const result = await handleGetAccount(client);

		expect(result).toContain("Account: Test Account");
		expect(result).toContain("Free");
		// Should not contain sections that failed
		expect(result).not.toContain("Creator Profile:");
		expect(result).not.toContain("Email Stats");
		expect(result).not.toContain("Growth");
	});
});
