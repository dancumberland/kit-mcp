import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockSequences = [
	{ id: 1, name: "Welcome Series", hold: false, repeat: false, created_at: "2024-01-01T00:00:00Z" },
	{ id: 2, name: "Onboarding", hold: true, repeat: true, created_at: "2024-02-01T00:00:00Z" },
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

describe("handleManageSequences", () => {
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
		const seqMod = await import("../../src/tools/sequences.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageSequences: seqMod.handleManageSequences,
		};
	}

	it("list returns formatted sequence list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ courses: mockSequences, pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageSequences } = await importFresh();
		const result = await handleManageSequences({ action: "list" }, client);

		expect(result).toContain("Sequences (2 shown):");
		expect(result).toContain("Welcome Series");
		expect(result).toContain("[active]");
		expect(result).toContain("Onboarding");
		expect(result).toContain("[paused]");
		expect(result).toContain("(repeating)");
	});

	it("add_subscriber enrolls subscriber and confirms", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), { status: 200 }),
		);

		const { client, handleManageSequences } = await importFresh();
		const result = await handleManageSequences(
			{ action: "add_subscriber", sequence_id: 1, email: "dan@example.com" },
			client,
		);

		expect(result).toContain("dan@example.com");
		expect(result).toContain("enrolled in sequence 1");
	});

	it("add_subscriber with no email or subscriber_id throws", async () => {
		const { client, handleManageSequences } = await importFresh();

		await expect(
			handleManageSequences({ action: "add_subscriber", sequence_id: 1 }, client),
		).rejects.toThrow("Either email or subscriber_id is required");
	});

	it("list_subscribers returns subscribers for sequence", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [mockSubscriber],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageSequences } = await importFresh();
		const result = await handleManageSequences(
			{ action: "list_subscribers", sequence_id: 1 },
			client,
		);

		expect(result).toContain("Subscribers");
		expect(result).toContain("dan@example.com");
	});

	it("list with empty results returns no sequences message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ courses: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageSequences } = await importFresh();
		const result = await handleManageSequences({ action: "list" }, client);

		expect(result).toBe("No sequences found.");
	});
});
