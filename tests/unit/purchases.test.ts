import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const OAUTH_CONFIG: KitClientConfig = {
	apiKey: "",
	oauthToken: "test-oauth-token",
	authMethod: "oauth",
	rateLimitPerMinute: 600,
};

const API_KEY_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockPurchase = {
	id: 1,
	transaction_id: "txn_abc123",
	status: "paid",
	email_address: "dan@example.com",
	currency: "USD",
	transaction_time: "2026-03-10T14:00:00Z",
	subtotal: 97.0,
	discount: 0,
	tax: 0,
	total: 97.0,
	products: [
		{
			pid: "prod_1",
			lid: 1,
			name: "AI Strategy Course",
			sku: "AI-101",
			unit_price: 97.0,
			quantity: 1,
		},
	],
};

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

describe("handleManagePurchases", () => {
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
		const purchMod = await import("../../src/tools/purchases.js");
		return {
			client: new clientMod.KitClient(config),
			handleManagePurchases: purchMod.handleManagePurchases,
		};
	}

	it("throws OAuth required error when using API key", async () => {
		const { client, handleManagePurchases } = await importFresh(API_KEY_CONFIG);

		await expect(handleManagePurchases({ action: "list" }, client)).rejects.toThrow(
			"requires OAuth",
		);
	});

	it("list returns formatted purchase list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ purchases: [mockPurchase], pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManagePurchases } = await importFresh(OAUTH_CONFIG);
		const result = await handleManagePurchases({ action: "list" }, client);

		expect(result).toContain("Purchases (1 shown):");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("USD");
		expect(result).toContain("AI Strategy Course");
	});

	it("get returns purchase detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ purchase: mockPurchase }), { status: 200 }),
		);

		const { client, handleManagePurchases } = await importFresh(OAUTH_CONFIG);
		const result = await handleManagePurchases({ action: "get", id: 1 }, client);

		expect(result).toContain("Purchase (ID: 1)");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("txn_abc123");
		expect(result).toContain("AI Strategy Course");
	});

	it("create returns confirmation", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ purchase: mockPurchase }), { status: 200 }),
		);

		const { client, handleManagePurchases } = await importFresh(OAUTH_CONFIG);
		const result = await handleManagePurchases(
			{
				action: "create",
				email: "dan@example.com",
				transaction_id: "txn_abc123",
				total: 97.0,
				products: [{ name: "AI Strategy Course", unit_price: 97.0, quantity: 1 }],
			},
			client,
		);

		expect(result).toContain("Purchase recorded");
		expect(result).toContain("ID: 1");
		expect(result).toContain("dan@example.com");
	});

	it("list with empty results returns no purchases message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ purchases: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManagePurchases } = await importFresh(OAUTH_CONFIG);
		const result = await handleManagePurchases({ action: "list" }, client);

		expect(result).toBe("No purchases found.");
	});
});
