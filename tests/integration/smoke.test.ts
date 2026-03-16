/**
 * Integration smoke tests — requires KIT_API_KEY environment variable.
 * Run with: KIT_API_KEY=xxx npm run test:int
 *
 * These tests make real API calls to Kit V4. They are read-only
 * (no creates, updates, or deletes) to avoid side effects.
 */

import { describe, expect, it } from "vitest";
import { KitClient } from "../../src/client.js";
import { handleGetAccount } from "../../src/tools/account.js";
import { handleManageBroadcasts } from "../../src/tools/broadcasts.js";
import { handleTestConnection } from "../../src/tools/connection.js";
import { handleManageCustomFields } from "../../src/tools/custom-fields.js";
import { handleManageEmailTemplates } from "../../src/tools/email-templates.js";
import { handleManageForms } from "../../src/tools/forms.js";
import { handleManageSegments } from "../../src/tools/segments.js";
import { handleManageSequences } from "../../src/tools/sequences.js";
import { handleManageSubscribers } from "../../src/tools/subscribers.js";
import { handleManageTags } from "../../src/tools/tags.js";
import { handleManageWebhooks } from "../../src/tools/webhooks.js";

const apiKey = process.env.KIT_API_KEY;

describe.skipIf(!apiKey)("Integration: Kit V4 API", { timeout: 30_000 }, () => {
	const client = new KitClient({
		apiKey: apiKey ?? "",
		authMethod: "api_key",
		rateLimitPerMinute: 120,
	});

	it("test_connection returns account info", async () => {
		const result = await handleTestConnection(client);
		expect(result).toContain("Connected to Kit account:");
		expect(result).toContain("API Key");
		expect(result).toContain("120 requests/minute");
	});

	it("get_account returns comprehensive overview", async () => {
		const result = await handleGetAccount(client);
		expect(result).toContain("Account:");
		expect(result).toContain("Plan:");
	});

	it("manage_subscribers list returns subscribers", async () => {
		const result = await handleManageSubscribers({ action: "list", page_size: 5 }, client);
		// Could be empty or populated — both are valid
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_tags list returns tags", async () => {
		const result = await handleManageTags({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_broadcasts list returns broadcasts", async () => {
		const result = await handleManageBroadcasts({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_forms list returns forms", async () => {
		const result = await handleManageForms({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_sequences list returns sequences", async () => {
		const result = await handleManageSequences({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_custom_fields list returns fields", async () => {
		const result = await handleManageCustomFields({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_segments list returns segments", async () => {
		const result = await handleManageSegments({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_webhooks list returns webhooks", async () => {
		const result = await handleManageWebhooks({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_email_templates list returns templates", async () => {
		const result = await handleManageEmailTemplates({ action: "list" }, client);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("manage_subscribers find with unknown email returns not-found", async () => {
		const result = await handleManageSubscribers(
			{ action: "find", email: "this-email-does-not-exist-xyz-123@example.com" },
			client,
		);
		expect(result).toContain("No subscriber found");
	});
});
