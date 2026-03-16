import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockTemplates = [
	{ id: 1, name: "Default Template" },
	{ id: 2, name: "Newsletter Template" },
	{ id: 3, name: "Plain Text" },
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

describe("handleManageEmailTemplates", () => {
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
		const etMod = await import("../../src/tools/email-templates.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageEmailTemplates: etMod.handleManageEmailTemplates,
		};
	}

	it("list returns formatted template list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ email_templates: mockTemplates, pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageEmailTemplates } = await importFresh();
		const result = await handleManageEmailTemplates({ action: "list" }, client);

		expect(result).toContain("Email Templates (3 shown):");
		expect(result).toContain("Default Template (ID: 1)");
		expect(result).toContain("Newsletter Template (ID: 2)");
		expect(result).toContain("Plain Text (ID: 3)");
	});

	it("list with empty results returns no templates message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ email_templates: [], pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageEmailTemplates } = await importFresh();
		const result = await handleManageEmailTemplates({ action: "list" }, client);

		expect(result).toBe("No email templates found.");
	});
});
