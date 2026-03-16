import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const API_KEY_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const OAUTH_CONFIG: KitClientConfig = {
	apiKey: "",
	oauthToken: "test-oauth-token",
	authMethod: "oauth",
	rateLimitPerMinute: 600,
};

const mockAccountResponse = {
	user: { id: 1, email: "dan@example.com" },
	account: {
		id: 100,
		name: "DCL Account",
		plan_type: "creator_pro",
		primary_email_address: "dan@example.com",
		created_at: "2023-01-01T00:00:00Z",
		timezone: { name: "US/Eastern", friendly_name: "Eastern", utc_offset: "-05:00" },
	},
};

describe("handleTestConnection", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	async function importFresh(config: KitClientConfig) {
		const clientMod = await import("../../src/client.js");
		const connMod = await import("../../src/tools/connection.js");
		return {
			client: new clientMod.KitClient(config),
			handleTestConnection: connMod.handleTestConnection,
		};
	}

	it("returns account name and API key auth method", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(mockAccountResponse), { status: 200 }),
		);

		const { client, handleTestConnection } = await importFresh(API_KEY_CONFIG);
		const result = await handleTestConnection(client);

		expect(result).toContain("✓ Connected to Kit account: DCL Account");
		expect(result).toContain("API Key");
		expect(result).toContain("120 requests/minute");
	});

	it("shows OAuth auth method and 600 rate limit", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify(mockAccountResponse), { status: 200 }),
		);

		const { client, handleTestConnection } = await importFresh(OAUTH_CONFIG);
		const result = await handleTestConnection(client);

		expect(result).toContain("✓ Connected to Kit account: DCL Account");
		expect(result).toContain("OAuth");
		expect(result).toContain("600 requests/minute");
	});

	it("propagates API errors on invalid credentials", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
		);

		const { client, handleTestConnection } = await importFresh(API_KEY_CONFIG);

		await expect(handleTestConnection(client)).rejects.toThrow();
	});
});
