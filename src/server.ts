/**
 * MCP server setup and tool registration.
 * Lazy-initializes the Kit API client on first tool call.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { KitClient } from "./client.js";
import { formatError } from "./errors.js";
import { handleGetAccount } from "./tools/account.js";
import { handleTestConnection } from "./tools/connection.js";

function success(text: string) {
	return { content: [{ type: "text" as const, text }] };
}

function failure(error: unknown) {
	return { content: [{ type: "text" as const, text: formatError(error) }], isError: true };
}

export function createServer(): McpServer {
	const server = new McpServer({
		name: "kit-mcp",
		version: "0.1.0",
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

	return server;
}
