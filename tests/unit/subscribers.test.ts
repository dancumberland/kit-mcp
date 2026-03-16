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

	it("engagement_filter posts filter conditions and returns results", async () => {
		const filteredSubscribers = [
			{
				id: "100",
				first_name: "Alice",
				email_address: "alice@example.com",
				created_at: "2024-06-01T00:00:00Z",
				tag_names: ["newsletter", "vip"],
				tag_ids: ["1", "5"],
			},
			{
				id: "200",
				first_name: null,
				email_address: "bob@example.com",
				created_at: "2024-03-15T00:00:00Z",
				tag_names: [],
				tag_ids: [],
			},
		];

		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: filteredSubscribers,
					pagination: { ...mockPagination, has_next_page: false, total_count: 2 },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{
				action: "engagement_filter",
				filters: [
					{ type: "subscribed", before: "2025-09-01" },
					{ type: "opens", count_greater_than: 5 },
				],
			},
			client,
		);

		expect(result).toContain("Engagement filter results:");
		expect(result).toContain("2 total");
		expect(result).toContain("Alice");
		expect(result).toContain("alice@example.com");
		expect(result).toContain("[newsletter, vip]");
		expect(result).toContain("bob@example.com");

		// Verify POST body
		const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("/subscribers/filter");
		expect(options.method).toBe("POST");
		const body = JSON.parse(options.body as string);
		expect(body.all).toHaveLength(2);
		expect(body.all[0]).toEqual({ type: "subscribed", before: "2025-09-01" });
		expect(body.all[1]).toEqual({ type: "opens", count_greater_than: 5 });
	});

	it("engagement_filter with no results returns empty message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [],
					pagination: { ...mockPagination, has_next_page: false, total_count: 0 },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{
				action: "engagement_filter",
				filters: [{ type: "clicks", count_greater_than: 1000 }],
			},
			client,
		);

		expect(result).toContain("No subscribers matched");
	});

	it("engagement_filter passes pagination params", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [],
					pagination: { ...mockPagination, has_next_page: false, total_count: 0 },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSubscribers } = await importFresh();
		await handleManageSubscribers(
			{
				action: "engagement_filter",
				filters: [{ type: "opens", count_greater_than: 1 }],
				page_size: 100,
				cursor: "abc123",
			},
			client,
		);

		const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(options.body as string);
		expect(body.per_page).toBe(100);
		expect(body.after).toBe("abc123");
	});

	it("compare_stats returns ranked comparison sorted by open rate", async () => {
		const sub1 = {
			...mockSubscriber,
			id: 100,
			first_name: "Alice",
			email_address: "alice@example.com",
		};
		const sub2 = {
			...mockSubscriber,
			id: 200,
			first_name: "Bob",
			email_address: "bob@example.com",
		};

		const stats1 = {
			subscriber: {
				id: 100,
				stats: {
					sent: 80,
					opened: 32,
					clicked: 8,
					bounced: 1,
					open_rate: 40.0,
					click_rate: 10.0,
					last_sent: "2026-03-10T00:00:00Z",
					last_opened: "2026-03-09T00:00:00Z",
					last_clicked: "2026-03-07T00:00:00Z",
					sends_since_last_open: 1,
					sends_since_last_click: 3,
				},
			},
		};

		const stats2 = {
			subscriber: {
				id: 200,
				stats: {
					sent: 100,
					opened: 55,
					clicked: 15,
					bounced: 0,
					open_rate: 55.0,
					click_rate: 15.0,
					last_sent: "2026-03-12T00:00:00Z",
					last_opened: "2026-03-12T00:00:00Z",
					last_clicked: "2026-03-11T00:00:00Z",
					sends_since_last_open: 0,
					sends_since_last_click: 1,
				},
			},
		};

		// Sub 100: subscriber + stats
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify({ subscriber: sub1 }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(stats1), { status: 200 }))
			// Sub 200: subscriber + stats
			.mockResolvedValueOnce(new Response(JSON.stringify({ subscriber: sub2 }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(stats2), { status: 200 }));

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "compare_stats", ids: [100, 200] },
			client,
		);

		// Bob (55%) should rank above Alice (40%)
		expect(result).toContain("Subscriber Comparison");
		expect(result).toContain("2 of 2 loaded");
		const bobIdx = result.indexOf("Bob");
		const aliceIdx = result.indexOf("Alice");
		expect(bobIdx).toBeLessThan(aliceIdx);
		expect(result).toContain("55.0%");
		expect(result).toContain("40.0%");
		expect(result).toContain("API calls: 4");
	});

	it("compare_stats handles partial failures gracefully", async () => {
		const sub1 = {
			...mockSubscriber,
			id: 100,
			first_name: "Alice",
			email_address: "alice@example.com",
		};

		const stats1 = {
			subscriber: {
				id: 100,
				stats: {
					sent: 80,
					opened: 32,
					clicked: 8,
					bounced: 1,
					open_rate: 40.0,
					click_rate: 10.0,
					last_sent: "2026-03-10T00:00:00Z",
					last_opened: "2026-03-09T00:00:00Z",
					last_clicked: null,
					sends_since_last_open: 1,
					sends_since_last_click: 0,
				},
			},
		};

		// Sub 100 succeeds
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify({ subscriber: sub1 }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(stats1), { status: 200 }))
			// Sub 999 fails (404)
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "compare_stats", ids: [100, 999] },
			client,
		);

		expect(result).toContain("1 of 2 loaded");
		expect(result).toContain("Alice");
		expect(result).toContain("Not found (skipped): IDs 999");
		expect(result).toContain("API calls: 4");
	});

	it("compare_stats makes correct number of API calls (2 per subscriber)", async () => {
		const subs = [101, 102, 103, 104, 105, 106];
		for (const id of subs) {
			mockFetch
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							subscriber: { ...mockSubscriber, id, email_address: `s${id}@example.com` },
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							subscriber: {
								id,
								stats: {
									sent: 50,
									opened: 25,
									clicked: 5,
									bounced: 0,
									open_rate: 50.0,
									click_rate: 10.0,
									last_sent: null,
									last_opened: null,
									last_clicked: null,
									sends_since_last_open: 0,
									sends_since_last_click: 0,
								},
							},
						}),
						{ status: 200 },
					),
				);
		}

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers({ action: "compare_stats", ids: subs }, client);

		// 6 subscribers × 2 API calls each = 12
		expect(result).toContain("API calls: 12");
		expect(result).toContain("6 of 6 loaded");
		expect(mockFetch).toHaveBeenCalledTimes(12);
	});

	it("compare_stats returns error message when all IDs fail", async () => {
		// Both IDs fail
		mockFetch
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));

		const { client, handleManageSubscribers } = await importFresh();
		const result = await handleManageSubscribers(
			{ action: "compare_stats", ids: [888, 999] },
			client,
		);

		expect(result).toContain("No subscriber stats could be loaded");
		expect(result).toContain("888");
		expect(result).toContain("999");
		expect(result).toContain("API calls: 4");
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
