import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockWebhooks = [
	{
		id: 1,
		target_url: "https://example.com/webhook",
		event: { name: "subscriber.subscriber_activate" },
	},
	{
		id: 2,
		target_url: "https://example.com/unsubscribe",
		event: { name: "subscriber.subscriber_unsubscribe" },
	},
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

describe("handleManageWebhooks", () => {
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
		const whMod = await import("../../src/tools/webhooks.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageWebhooks: whMod.handleManageWebhooks,
		};
	}

	it("list returns formatted webhook list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ webhooks: mockWebhooks, pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageWebhooks } = await importFresh();
		const result = await handleManageWebhooks({ action: "list" }, client);

		expect(result).toContain("Webhooks (2 shown):");
		expect(result).toContain("subscriber.subscriber_activate");
		expect(result).toContain("https://example.com/webhook");
		expect(result).toContain("subscriber.subscriber_unsubscribe");
	});

	it("create returns webhook detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					webhook: {
						id: 3,
						target_url: "https://example.com/new",
						event: { name: "subscriber.form_subscribe" },
					},
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageWebhooks } = await importFresh();
		const result = await handleManageWebhooks(
			{
				action: "create",
				target_url: "https://example.com/new",
				event: "subscriber.form_subscribe",
			},
			client,
		);

		expect(result).toContain("Webhook created:");
		expect(result).toContain("subscriber.form_subscribe");
		expect(result).toContain("https://example.com/new");
		expect(result).toContain("ID: 3");
	});

	it("delete returns confirmation", async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const { client, handleManageWebhooks } = await importFresh();
		const result = await handleManageWebhooks({ action: "delete", id: 1 }, client);

		expect(result).toContain("Webhook 1 deleted");
	});

	it("list with empty results returns no webhooks message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ webhooks: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageWebhooks } = await importFresh();
		const result = await handleManageWebhooks({ action: "list" }, client);

		expect(result).toBe("No webhooks found.");
	});
});
