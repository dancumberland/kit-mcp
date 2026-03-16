import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitClientConfig } from "../../src/types.js";

const TEST_CONFIG: KitClientConfig = {
	apiKey: "test-key",
	authMethod: "api_key",
	rateLimitPerMinute: 120,
};

const mockSegments = [
	{ id: 1, name: "Active subscribers", created_at: "2024-01-01T00:00:00Z" },
	{ id: 2, name: "Cold subscribers (90d)", created_at: "2024-02-01T00:00:00Z" },
];

const mockPagination = {
	has_previous_page: false,
	has_next_page: false,
	start_cursor: null,
	end_cursor: null,
	per_page: 50,
};

describe("handleManageSegments", () => {
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
		const segMod = await import("../../src/tools/segments.js");
		return {
			client: new clientMod.KitClient(TEST_CONFIG),
			handleManageSegments: segMod.handleManageSegments,
		};
	}

	it("list returns formatted segment list", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ segments: mockSegments, pagination: mockPagination }), {
				status: 200,
			}),
		);

		const { client, handleManageSegments } = await importFresh();
		const result = await handleManageSegments({ action: "list" }, client);

		expect(result).toContain("Segments (2 shown):");
		expect(result).toContain("Active subscribers");
		expect(result).toContain("Cold subscribers (90d)");
	});

	it("list with empty results returns no segments message", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ segments: [], pagination: mockPagination }), { status: 200 }),
		);

		const { client, handleManageSegments } = await importFresh();
		const result = await handleManageSegments({ action: "list" }, client);

		expect(result).toBe("No segments found.");
	});
});
