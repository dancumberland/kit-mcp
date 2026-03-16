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

describe("handleBulkOperations", () => {
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
		const bulkMod = await import("../../src/tools/bulk.js");
		return {
			client: new clientMod.KitClient(config),
			handleBulkOperations: bulkMod.handleBulkOperations,
		};
	}

	it("throws OAuth required error when using API key", async () => {
		const { client, handleBulkOperations } = await importFresh(API_KEY_CONFIG);

		await expect(
			handleBulkOperations(
				{
					action: "create_subscribers",
					subscribers: [{ email_address: "test@example.com" }],
				},
				client,
			),
		).rejects.toThrow("requires OAuth");
	});

	it("create_subscribers queues bulk import", async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleBulkOperations } = await importFresh(OAUTH_CONFIG);
		const result = await handleBulkOperations(
			{
				action: "create_subscribers",
				subscribers: [
					{ email_address: "a@example.com", first_name: "Alice" },
					{ email_address: "b@example.com", first_name: "Bob" },
				],
			},
			client,
		);

		expect(result).toContain("2 subscribers queued for import");
	});

	it("create_tags queues bulk tag creation", async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleBulkOperations } = await importFresh(OAUTH_CONFIG);
		const result = await handleBulkOperations(
			{
				action: "create_tags",
				tags: [{ name: "tag-a" }, { name: "tag-b" }, { name: "tag-c" }],
			},
			client,
		);

		expect(result).toContain("3 tags queued for creation");
	});

	it("tag_subscribers queues tag application", async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleBulkOperations } = await importFresh(OAUTH_CONFIG);
		const result = await handleBulkOperations(
			{
				action: "tag_subscribers",
				tag_id: 1,
				emails: ["a@example.com", "b@example.com"],
			},
			client,
		);

		expect(result).toContain("tag 1 queued for application to 2 subscribers");
	});

	it("update_custom_fields queues field updates", async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleBulkOperations } = await importFresh(OAUTH_CONFIG);
		const result = await handleBulkOperations(
			{
				action: "update_custom_fields",
				custom_field_id: 5,
				subscribers: [
					{ id: 1, value: "CEO" },
					{ id: 2, value: "CTO" },
				],
			},
			client,
		);

		expect(result).toContain("custom field 5 queued for update on 2 subscribers");
	});
});
