import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockForms = [
	{
		id: 10,
		name: "Newsletter Signup",
		type: "embed",
		format: "inline",
		embed_js: "https://kit.com/embed/10.js",
		embed_url: "https://kit.com/embed/10",
		archived: false,
		uid: "abc123",
		created_at: "2024-06-01T00:00:00Z",
	},
	{
		id: 11,
		name: "Webinar Registration",
		type: "modal",
		format: null,
		embed_js: null,
		embed_url: null,
		archived: true,
		uid: "def456",
		created_at: "2024-07-01T00:00:00Z",
	},
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

describe("handleManageForms", () => {
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
		const formMod = await import("../../src/tools/forms.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageForms: formMod.handleManageForms,
		};
	}

	it("list returns formatted form list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ forms: mockForms, pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageForms } = await importFresh();
		const result = await handleManageForms({ action: "list" }, client);

		expect(result).toContain("Forms (2 shown):");
		expect(result).toContain("Newsletter Signup");
		expect(result).toContain("embed");
		expect(result).toContain("Webinar Registration");
		expect(result).toContain("[archived]");
	});

	it("list_subscribers returns subscribers for a form", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					subscribers: [mockSubscriber],
					pagination: mockPagination,
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageForms } = await importFresh();
		const result = await handleManageForms({ action: "list_subscribers", form_id: 10 }, client);

		expect(result).toContain("Subscribers");
		expect(result).toContain("dan@example.com");
	});

	it("add_subscriber returns confirmation with opt-in note", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ subscriber: mockSubscriber }), {
				status: 200,
			}),
		);

		const { client, handleManageForms } = await importFresh();
		const result = await handleManageForms(
			{ action: "add_subscriber", form_id: 10, email: "dan@example.com" },
			client,
		);

		expect(result).toContain("dan@example.com");
		expect(result).toContain("form 10");
		expect(result).toContain("Double opt-in");
	});

	it("add_subscriber with no email or subscriber_id throws", async () => {
		const { client, handleManageForms } = await importFresh();

		await expect(
			handleManageForms({ action: "add_subscriber", form_id: 10 }, client),
		).rejects.toThrow("Either email or subscriber_id is required");
	});

	it("list with empty results returns no forms message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ forms: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageForms } = await importFresh();
		const result = await handleManageForms({ action: "list" }, client);

		expect(result).toBe("No forms found.");
	});
});
