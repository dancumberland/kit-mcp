/**
 * MCP server setup and tool registration.
 * Lazy-initializes the Kit API client on first tool call.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KitClient } from "./client.js";
import { formatError } from "./errors.js";
import { handleGetAccount } from "./tools/account.js";
import { ManageBroadcastsSchema, handleManageBroadcasts } from "./tools/broadcasts.js";
import { BulkOperationsSchema, handleBulkOperations } from "./tools/bulk.js";
import { handleTestConnection } from "./tools/connection.js";
import { ManageCustomFieldsSchema, handleManageCustomFields } from "./tools/custom-fields.js";
import { ManageEmailTemplatesSchema, handleManageEmailTemplates } from "./tools/email-templates.js";
import { ManageFormsSchema, handleManageForms } from "./tools/forms.js";
import { ManagePurchasesSchema, handleManagePurchases } from "./tools/purchases.js";
import { ManageSegmentsSchema, handleManageSegments } from "./tools/segments.js";
import { ManageSequencesSchema, handleManageSequences } from "./tools/sequences.js";
import { ManageSubscribersSchema, handleManageSubscribers } from "./tools/subscribers.js";
import { ManageTagsSchema, handleManageTags } from "./tools/tags.js";
import { ManageWebhooksSchema, handleManageWebhooks } from "./tools/webhooks.js";

function success(text: string) {
	return { content: [{ type: "text" as const, text }] };
}

function failure(error: unknown) {
	return { content: [{ type: "text" as const, text: formatError(error) }], isError: true };
}

export function createServer(): McpServer {
	const server = new McpServer({
		name: "kit-mcp",
		version: "1.3.1",
	});

	// Lazy-init client — deferred until first tool call so env vars can be set after import
	let client: KitClient | undefined;

	function getClient(): KitClient {
		if (!client) {
			client = new KitClient();
		}
		return client;
	}

	// --- test_connection ---
	server.registerTool(
		"test_connection",
		{
			description:
				"Verify your Kit API key is valid and check connection status. Use this as the first tool call to confirm setup.",
		},
		async () => {
			try {
				return success(await handleTestConnection(getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- get_account ---
	server.registerTool(
		"get_account",
		{
			description:
				"Get a comprehensive overview of your Kit account including creator profile, email stats, and subscriber growth.",
		},
		async () => {
			try {
				return success(await handleGetAccount(getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_subscribers ---
	server.registerTool(
		"manage_subscribers",
		{
			description:
				"Manage Kit subscribers. WORKFLOW FOR ENGAGEMENT RANKING: To find most engaged subscribers, always follow this 2-step process: (1) use 'engagement_filter' to find candidate subscriber IDs matching criteria (e.g. opens > 5, subscribed before a date), then (2) pass those IDs to 'compare_stats' to get actual open/click rates ranked by engagement. IMPORTANT: 'list' and 'filter' return profiles only — they do NOT include engagement scores, open rates, or click rates. Never use 'list' or 'filter' to find engaged subscribers. Actions: find, list, create, update, unsubscribe, stats, compare_stats, filter, engagement_filter",
			inputSchema: ManageSubscribersSchema,
		},
		async (args) => {
			try {
				return success(await handleManageSubscribers(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_tags ---
	server.registerTool(
		"manage_tags",
		{
			description:
				"Manage Kit tags — list all tags, create, rename, apply/remove tags on subscribers, or list subscribers with a specific tag. Actions: list, create, update, tag_subscriber, untag_subscriber, list_subscribers",
			inputSchema: ManageTagsSchema,
		},
		async (args) => {
			try {
				return success(await handleManageTags(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_broadcasts ---
	server.registerTool(
		"manage_broadcasts",
		{
			description:
				"Manage Kit email broadcasts — list with status filter, get details, create drafts or scheduled sends, update, delete, view performance stats, compare stats across all broadcasts, or analyze per-link click data. Actions: list, get, create, update, delete, stats, list_stats, get_clicks",
			inputSchema: ManageBroadcastsSchema,
		},
		async (args) => {
			try {
				return success(await handleManageBroadcasts(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_forms ---
	server.registerTool(
		"manage_forms",
		{
			description:
				"Manage Kit forms — list all forms, list subscribers who opted in through a form, or add a subscriber to a form (triggers double opt-in if enabled). Actions: list, list_subscribers, add_subscriber",
			inputSchema: ManageFormsSchema,
		},
		async (args) => {
			try {
				return success(await handleManageForms(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_sequences ---
	server.registerTool(
		"manage_sequences",
		{
			description:
				"Manage Kit email sequences — list all sequences, enroll a subscriber, or list subscribers in a sequence. Actions: list, add_subscriber, list_subscribers",
			inputSchema: ManageSequencesSchema,
		},
		async (args) => {
			try {
				return success(await handleManageSequences(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_custom_fields ---
	server.registerTool(
		"manage_custom_fields",
		{
			description:
				"Manage Kit custom subscriber fields — list all fields, create, rename, or delete (destructive). Actions: list, create, update, delete",
			inputSchema: ManageCustomFieldsSchema,
		},
		async (args) => {
			try {
				return success(await handleManageCustomFields(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_purchases ---
	server.registerTool(
		"manage_purchases",
		{
			description:
				"Manage Kit purchases — list, get details, or record a new purchase. Requires OAuth authentication. Actions: list, get, create",
			inputSchema: ManagePurchasesSchema,
		},
		async (args) => {
			try {
				return success(await handleManagePurchases(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_segments ---
	server.registerTool(
		"manage_segments",
		{
			description:
				"List Kit subscriber segments (read-only — segments are created in the Kit UI). Actions: list",
			inputSchema: ManageSegmentsSchema,
		},
		async (args) => {
			try {
				return success(await handleManageSegments(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_webhooks ---
	server.registerTool(
		"manage_webhooks",
		{
			description:
				"Manage Kit webhooks — list registered webhooks, create new webhook subscriptions for Kit events, or delete webhooks. Actions: list, create, delete",
			inputSchema: ManageWebhooksSchema,
		},
		async (args) => {
			try {
				return success(await handleManageWebhooks(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- manage_email_templates ---
	server.registerTool(
		"manage_email_templates",
		{
			description:
				"List Kit email templates — returns template IDs and names needed for creating broadcasts. Actions: list",
			inputSchema: ManageEmailTemplatesSchema,
		},
		async (args) => {
			try {
				return success(await handleManageEmailTemplates(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	// --- bulk_operations ---
	server.registerTool(
		"bulk_operations",
		{
			description:
				"Batch operations for large-scale subscriber management. Requires OAuth authentication. Actions: create_subscribers, create_tags, tag_subscribers, untag_subscribers, add_to_forms, create_custom_fields, update_custom_fields",
			inputSchema: BulkOperationsSchema,
		},
		async (args) => {
			try {
				return success(await handleBulkOperations(args, getClient()));
			} catch (error) {
				return failure(error);
			}
		},
	);

	return server;
}
