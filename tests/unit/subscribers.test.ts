import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

// --- Mock data ---

const mockSubscriber = {
	id: 123,
	first_name: "Dan",
	email_address: "dan@example.com",
	state: "active",
	created_at: "2024-01-15T00:00:00Z",
	fields: { role: "executive", company: "Acme" },
};

const mockTags = [
	{ id: 1, name: "ai-strategy", created_at: "2024-01-01T00:00:00Z" },
	{ id: 2, name: "newsletter", created_at: "2024-01-01T00:00:00Z" },
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: true,
	start_cursor: "abc",
	end_cursor: "xyz",
	per_page: 50,
};

describe("handleManageSubscribers", () => {
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
		const subMod = await import("../../src/tools/subscribers.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageSubscribers: subMod.handleManageSubscribers,
		};
	}

	it("find by email returns formatted subscriber with tags", async () => {
		mockFetch
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						subscribers: [mockSubscriber],
						pagination: mockPagination,
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ tags: mockTags, pagination: mockPagination }), {
					status: 200,
				}),
			);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "find", email: "dan@example.com" },
			client,
		);

		expect(result).toContain("Dan");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("ai-strategy");
		expect(result).toContain("newsletter");
		expect(result).toContain("role=executive");
	});

	it("find by ID returns formatted subscriber", async () => {
		mockFetch
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ subscriber: mockSubscriber }), {
					status: 200,
				}),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ tags: [], pagination: mockPagination }), {
					status: 200,
				}),
			);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "find", id: 123 }, client);

		expect(result).toContain("Dan");
		expect(result).toContain("123");
	});

	it("find with no email or id throws validation error", async () => {
		const { client, handleManageSubscribers } = await importFresh();

		await expect(handleManageSubscribers({ action: "find" }, client)).rejects.toThrow(
			"Either email or id is required",
		);
	});

	it("find returns not found message for unknown email", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscribers: [], pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "find", email: "nobody@example.com" },
			client,
		);

		expect(result).toContain("No subscriber found");
		expect(result).toContain("nobody@example.com");
	});

	it("list returns paginated subscriber list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [mockSubscriber],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "list", page_size: 25 }, client);

		expect(result).toContain("Subscribers");
		expect(result).toContain("dan@example.com");
		expect(result).toContain('cursor "xyz"');
	});

	it("create returns subscriber confirmation", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), {
				status: 200,
			}),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "create", email: "dan@example.com", first_name: "Dan" },
			client,
		);

		expect(result).toContain("created/updated");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("123");
	});

	it("create with tags resolves and applies them", async () => {
		// 1. Create subscriber
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), {
				status: 200,
			}),
		);
		// 2. List existing tags
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ tags: mockTags, pagination: mockPagination }), { status: 200 }),
		);
		// 3. Apply tag
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "create", email: "dan@example.com", tags: ["ai-strategy"] },
			client,
		);

		expect(result).toContain("Tags applied: ai-strategy");
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("update returns updated confirmation", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), {
				status: 200,
			}),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "update", id: 123, first_name: "Daniel" },
			client,
		);

		expect(result).toContain("updated");
		expect(result).toContain("dan@example.com");
	});

	it("unsubscribe by ID returns confirmation", async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "unsubscribe", id: 123 }, client);

		expect(result).toContain("unsubscribed");
		expect(result).toContain("123");
	});

	it("unsubscribe with no email or id throws validation error", async () => {
		const { client, handleManageSubscribers } = await importFresh();

		await expect(handleManageSubscribers({ action: "unsubscribe" }, client)).rejects.toThrow(
			"Either email or id is required",
		);
	});

	it("stats returns formatted engagement stats", async () => {
		// 1. Fetch subscriber info
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), { status: 200 }),
		);
		// 2. Fetch subscriber stats
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscriber: {
						id: 123,
						stats: {
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
						},
					},
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "stats", id: 123 }, client);

		expect(result).toContain("Dan");
		expect(result).toContain("dan@example.com");
		expect(result).toContain("Engagement Stats:");
		expect(result).toContain("47.0%");
		expect(result).toContain("12.0%");
		expect(result).toContain("Last opened: 2026-03-10");
	});

	it("filter by status returns filtered list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [mockSubscriber],
					pagination: { ...mockPagination, has_next_page: false },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "filter", status: "active" }, client);

		expect(result).toContain("Subscribers");
		expect(result).toContain("dan@example.com");
		// Verify the status filter was passed
		const url = mockFetch.mock.calls[0][0] as string;
		expect(url).toContain("status=active");
	});
});
