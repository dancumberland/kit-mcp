import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockTags = [
	{ id: 1, name: "ai-strategy", created_at: "2024-01-01T00:00:00Z" },
	{ id: 2, name: "newsletter", created_at: "2024-01-01T00:00:00Z" },
	{ id: 3, name: "founder-voice", created_at: "2024-02-01T00:00:00Z" },
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

const mockSubscriber = {
	id: 123,
	first_name: "Dan",
	email_address: "dan@example.com",
	state: "active",
	created_at: "2024-01-15T00:00:00Z",
	fields: {},
};

describe("handleManageTags", () => {
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
		const tagMod = await import("../../src/tools/tags.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageTags: tagMod.handleManageTags,
		};
	}

	it("list returns formatted tag list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ tags: mockTags, pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags({ action: "list" }, client);

		expect(result).toContain("Tags (3 shown):");
		expect(result).toContain("ai-strategy");
		expect(result).toContain("newsletter");
		expect(result).toContain("founder-voice");
	});

	it("create returns tag detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					tag: { id: 4, name: "new-tag", created_at: "2026-03-15T00:00:00Z" },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags({ action: "create", name: "new-tag" }, client);

		expect(result).toContain('Tag created: "new-tag"');
		expect(result).toContain("ID: 4");
	});

	it("update returns updated tag detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					tag: { id: 1, name: "ai-consulting", created_at: "2024-01-01T00:00:00Z" },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags(
			{ action: "update", id: 1, name: "ai-consulting" },
			client,
		);

		expect(result).toContain('Tag updated: "ai-consulting"');
	});

	it("tag_subscriber applies tag and confirms", async () => {
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags(
			{ action: "tag_subscriber", tag_id: 1, email: "dan@example.com" },
			client,
		);

		expect(result).toContain("Tag 1 applied to dan@example.com");
	});

	it("tag_subscriber with no email or subscriber_id throws", async () => {
		const { client, handleManageTags } = await importFresh();

		await expect(handleManageTags({ action: "tag_subscriber", tag_id: 1 }, client)).rejects.toThrow(
			"Either email or subscriber_id is required",
		);
	});

	it("untag_subscriber removes tag and confirms", async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags(
			{ action: "untag_subscriber", tag_id: 1, subscriber_id: 123 },
			client,
		);

		expect(result).toContain("Tag 1 removed from subscriber 123");
	});

	it("list_subscribers returns subscriber list for tag", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [mockSubscriber],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags({ action: "list_subscribers", tag_id: 1 }, client);

		expect(result).toContain("Subscribers");
		expect(result).toContain("dan@example.com");
	});

	it("list with empty results returns no tags message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ tags: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageTags } = await importFresh();
		const result = await handleManageTags({ action: "list" }, client);

		expect(result).toBe("No tags found.");
	});
});
