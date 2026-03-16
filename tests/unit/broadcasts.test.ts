import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockBroadcast = {
	id: 42,
	subject: "AI Training Guide — March Edition",
	description: null,
	content: "<p>Hello world</p>",
	public: false,
	published_at: null,
	send_at: null,
	thumbnail_alt: null,
	thumbnail_url: null,
	preview_text: "Latest AI insights",
	created_at: "2026-03-12T10:00:00Z",
	email_template: { id: 5, name: "Default Template" },
};

const mockSentBroadcast = {
	...mockBroadcast,
	published_at: "2026-03-12T14:00:00Z",
};

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 25,
};

describe("handleManageBroadcasts", () => {
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
		const bcMod = await import("../../src/tools/broadcasts.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageBroadcasts: bcMod.handleManageBroadcasts,
		};
	}

	it("list returns formatted broadcast list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcasts: [mockBroadcast, mockSentBroadcast],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "list" }, client);

		expect(result).toContain("Broadcasts (2 shown):");
		expect(result).toContain("AI Training Guide");
		expect(result).toContain("draft");
		expect(result).toContain("sent");
	});

	it("list with status filter includes query param", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcasts: [mockSentBroadcast],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		await handleManageBroadcasts({ action: "list", status: "sent" }, client);

		const url = mockFetch.mock.calls[0][0] as string;
		expect(url).toContain("status=sent");
	});

	it("get returns broadcast detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ broadcast: mockBroadcast }), {
				status: 200,
			}),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "get", id: 42 }, client);

		expect(result).toContain("AI Training Guide");
		expect(result).toContain("ID: 42");
		expect(result).toContain("draft");
		expect(result).toContain("Preview: Latest AI insights");
		expect(result).toContain("Default Template");
	});

	it("create draft returns confirmation", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ broadcast: mockBroadcast }), {
				status: 200,
			}),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts(
			{
				action: "create",
				subject: "AI Training Guide — March Edition",
				content: "<p>Hello world</p>",
			},
			client,
		);

		expect(result).toContain("Broadcast created");
		expect(result).toContain("ID: 42");
		expect(result).toContain("saved as draft");
	});

	it("create scheduled broadcast shows schedule time", async () => {
		const scheduled = {
			...mockBroadcast,
			send_at: "2026-03-20T10:00:00Z",
		};
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ broadcast: scheduled }), {
				status: 200,
			}),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts(
			{
				action: "create",
				subject: "Test",
				content: "<p>Test</p>",
				email_template_id: 5,
				send_at: "2026-03-20T10:00:00Z",
			},
			client,
		);

		expect(result).toContain("scheduled for");
	});

	it("update returns updated confirmation", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcast: { ...mockBroadcast, subject: "Updated Subject" },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts(
			{ action: "update", id: 42, subject: "Updated Subject" },
			client,
		);

		expect(result).toContain("Broadcast updated");
		expect(result).toContain("Updated Subject");
	});

	it("delete returns confirmation", async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "delete", id: 42 }, client);

		expect(result).toContain("Broadcast 42 deleted");
	});

	it("stats returns formatted performance data", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcast: {
						id: 42,
						subject: "AI Training Guide — March Edition",
						stats: {
							recipients: 11234,
							open_rate: 43.5,
							click_rate: 11.0,
							unsubscribes: 23,
							total_clicks: 1234,
							show_total_clicks: true,
							status: "completed",
							progress: 100,
							emails_opened: 4886,
							unsubscribe_rate: 0.2,
							open_tracking_disabled: false,
							click_tracking_disabled: false,
						},
					},
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "stats", id: 42 }, client);

		expect(result).toContain("AI Training Guide");
		expect(result).toContain("11,234");
		expect(result).toContain("43.5%");
		expect(result).toContain("4,886 opened");
		expect(result).toContain("11.0%");
		expect(result).toContain("1,234");
		expect(result).toContain("0.2%");
		expect(result).not.toContain("tracking was disabled");
	});

	it("list with empty results returns no broadcasts message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ broadcasts: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "list" }, client);

		expect(result).toBe("No broadcasts found.");
	});

	it("list_stats returns formatted stats list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcasts: [
						{
							id: 42,
							stats: {
								recipients: 11234,
								open_rate: 43.5,
								click_rate: 11.0,
								unsubscribes: 23,
								total_clicks: 1234,
								show_total_clicks: true,
								status: "completed",
								progress: 100,
								emails_opened: 4886,
								unsubscribe_rate: 0.2,
								open_tracking_disabled: false,
								click_tracking_disabled: false,
							},
						},
						{
							id: 43,
							stats: {
								recipients: 5000,
								open_rate: 38.2,
								click_rate: 8.5,
								unsubscribes: 10,
								total_clicks: 425,
								show_total_clicks: true,
								status: "completed",
								progress: 100,
								emails_opened: 1910,
								unsubscribe_rate: 0.2,
								open_tracking_disabled: false,
								click_tracking_disabled: false,
							},
						},
					],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "list_stats" }, client);

		expect(result).toContain("Broadcast Stats (2 shown):");
		expect(result).toContain("ID: 42");
		expect(result).toContain("11,234 recipients");
		expect(result).toContain("Open: 43.5%");
		expect(result).toContain("ID: 43");
		expect(result).toContain("38.2%");
		expect(result).toContain("Tip:");
	});

	it("list_stats passes pagination params to correct endpoint", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ broadcasts: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		await handleManageBroadcasts({ action: "list_stats", page_size: 10, cursor: "abc123" }, client);

		const url = mockFetch.mock.calls[0][0] as string;
		expect(url).toContain("/broadcasts/stats");
		expect(url).toContain("per_page=10");
		expect(url).toContain("after=abc123");
	});

	it("get_clicks returns formatted click data sorted by clicks", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcast: {
						id: 42,
						clicks: [
							{
								url: "https://example.com/low",
								unique_clicks: 10,
								click_to_delivery_rate: 0.001,
								click_to_open_rate: 0.002,
							},
							{
								url: "https://example.com/high",
								unique_clicks: 500,
								click_to_delivery_rate: 0.05,
								click_to_open_rate: 0.1,
							},
						],
					},
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "get_clicks", id: 42 }, client);

		expect(result).toContain("Click Analytics (2 links):");
		expect(result).toContain("500 clicks");
		expect(result).toContain("https://example.com/high");
		expect(result).toContain("10 clicks");
		// Verify high-click link appears before low-click link
		const highIdx = result.indexOf("https://example.com/high");
		const lowIdx = result.indexOf("https://example.com/low");
		expect(highIdx).toBeLessThan(lowIdx);
		// Verify rate conversion (0.05 → 5.0%)
		expect(result).toContain("5.0%");
		expect(result).toContain("10.0%");
	});

	it("get_clicks handles empty clicks", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					broadcast: { id: 42, clicks: [] },
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageBroadcasts } = await importFresh();
		const result = await handleManageBroadcasts({ action: "get_clicks", id: 42 }, client);

		expect(result).toContain("No click data available");
	});
});
