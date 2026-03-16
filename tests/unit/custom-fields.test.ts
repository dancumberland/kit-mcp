import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockCustomFields = [
	{ id: 1, key: "role", label: "Role" },
	{ id: 2, key: "company", label: "Company" },
	{ id: 3, key: "revenue", label: "Annual Revenue" },
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

describe("handleManageCustomFields", () => {
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
		const cfMod = await import("../../src/tools/custom-fields.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageCustomFields: cfMod.handleManageCustomFields,
		};
	}

	it("list returns formatted custom field list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({ custom_fields: mockCustomFields, pagination: mockPagination }),
				{ status: 200 },
			),
		);

		const { client, handleManageCustomFields } = await importFresh();
		const result = await handleManageCustomFields({ action: "list" }, client);

		expect(result).toContain("Custom Fields (3 shown):");
		expect(result).toContain("Role (key: role, ID: 1)");
		expect(result).toContain("Company (key: company, ID: 2)");
		expect(result).toContain("Annual Revenue");
	});

	it("create returns field detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					custom_field: { id: 4, key: "industry", label: "Industry" },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageCustomFields } = await importFresh();
		const result = await handleManageCustomFields({ action: "create", label: "Industry" }, client);

		expect(result).toContain('Custom field created: "Industry"');
		expect(result).toContain("ID: 4");
	});

	it("update returns updated field detail", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					custom_field: { id: 1, key: "job_title", label: "Job Title" },
				}),
				{ status: 200 },
			),
		);

		const { client, handleManageCustomFields } = await importFresh();
		const result = await handleManageCustomFields(
			{ action: "update", id: 1, label: "Job Title" },
			client,
		);

		expect(result).toContain('Custom field updated: "Job Title"');
	});

	it("delete returns confirmation with warning", async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

		const { client, handleManageCustomFields } = await importFresh();
		const result = await handleManageCustomFields({ action: "delete", id: 1 }, client);

		expect(result).toContain("Custom field 1 deleted");
		expect(result).toContain("subscriber data");
	});

	it("list with empty results returns no fields message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ custom_fields: [], pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageCustomFields } = await importFresh();
		const result = await handleManageCustomFields({ action: "list" }, client);

		expect(result).toBe("No custom fields found.");
	});
});
