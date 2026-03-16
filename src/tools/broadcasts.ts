/**
 * manage_broadcasts — 6 actions covering broadcast management.
 * Actions: list, get, create, update, delete, stats
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { formatBroadcastDetail, formatBroadcastList, formatBroadcastStats } from "../formatters.js";
import type {
	KitBroadcastResponse,
	KitBroadcastStatsResponse,
	KitBroadcastsResponse,
} from "../types.js";

// --- Schema ---

export const ManageBroadcastsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
		status: z
			.enum(["draft", "scheduled", "sent"])
			.describe("Filter by broadcast status")
			.optional(),
		page_size: z.number().int().min(1).max(100).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("get"),
		id: z.number().int().positive().describe("Broadcast ID (required)"),
	}),
	z.object({
		action: z.literal("create"),
		subject: z.string().min(1).max(500).describe("Email subject line (required)"),
		content: z.string().min(1).describe("HTML email body (required)"),
		email_template_id: z
			.number()
			.int()
			.positive()
			.describe(
				"Email template ID. Use manage_email_templates to find available IDs. Uses account default if omitted.",
			)
			.optional(),
		preview_text: z.string().max(300).describe("Preview text shown in inbox").optional(),
		send_at: z
			.string()
			.describe("Schedule send time (ISO 8601). Omit to save as draft.")
			.optional(),
		segment_ids: z.array(z.number()).describe("Send to specific segment IDs").optional(),
		tag_ids: z.array(z.number()).describe("Send to subscribers with these tag IDs").optional(),
		public: z.boolean().describe("Make broadcast publicly viewable").optional(),
	}),
	z.object({
		action: z.literal("update"),
		id: z.number().int().positive().describe("Broadcast ID (required)"),
		subject: z.string().min(1).max(500).optional(),
		content: z.string().min(1).describe("Updated HTML body").optional(),
		preview_text: z.string().max(300).optional(),
		send_at: z.string().describe("Reschedule send time (ISO 8601)").optional(),
	}),
	z.object({
		action: z.literal("delete"),
		id: z.number().int().positive().describe("Broadcast ID (required)"),
	}),
	z.object({
		action: z.literal("stats"),
		id: z.number().int().positive().describe("Broadcast ID (required)"),
	}),
]);

export type ManageBroadcastsArgs = z.infer<typeof ManageBroadcastsSchema>;

// --- Handler ---

export async function handleManageBroadcasts(
	args: ManageBroadcastsArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(args, client);
		case "get":
			return handleGet(args, client);
		case "create":
			return handleCreate(args, client);
		case "update":
			return handleUpdate(args, client);
		case "delete":
			return handleDelete(args, client);
		case "stats":
			return handleStats(args, client);
	}
}

// --- Action Handlers ---

async function handleList(
	args: Extract<ManageBroadcastsArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.status) params.push(`status=${encodeURIComponent(args.status)}`);
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitBroadcastsResponse>(`/broadcasts${query}`);
	return formatBroadcastList(data.broadcasts, data.pagination);
}

async function handleGet(
	args: Extract<ManageBroadcastsArgs, { action: "get" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.get<KitBroadcastResponse>(`/broadcasts/${args.id}`);
	return formatBroadcastDetail(data.broadcast);
}

async function handleCreate(
	args: Extract<ManageBroadcastsArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {
		content: args.content,
		subject: args.subject,
	};
	if (args.email_template_id) body.email_template_id = args.email_template_id;
	if (args.preview_text) body.preview_text = args.preview_text;
	if (args.send_at) body.send_at = args.send_at;
	if (args.segment_ids) body.segment_ids = args.segment_ids;
	if (args.tag_ids) body.tag_ids = args.tag_ids;
	if (args.public !== undefined) body.public = args.public;

	const data = await client.post<KitBroadcastResponse>("/broadcasts", body);
	const bc = data.broadcast;
	const status = bc.send_at ? `scheduled for ${bc.send_at}` : "saved as draft";
	return `Broadcast created (ID: ${bc.id}): "${bc.subject}" — ${status}`;
}

async function handleUpdate(
	args: Extract<ManageBroadcastsArgs, { action: "update" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {};
	if (args.subject !== undefined) body.subject = args.subject;
	if (args.content !== undefined) body.content = args.content;
	if (args.preview_text !== undefined) body.preview_text = args.preview_text;
	if (args.send_at !== undefined) body.send_at = args.send_at;

	const data = await client.put<KitBroadcastResponse>(`/broadcasts/${args.id}`, body);
	return `Broadcast updated (ID: ${data.broadcast.id}): "${data.broadcast.subject}"`;
}

async function handleDelete(
	args: Extract<ManageBroadcastsArgs, { action: "delete" }>,
	client: KitClient,
): Promise<string> {
	await client.delete(`/broadcasts/${args.id}`);
	return `Broadcast ${args.id} deleted.`;
}

async function handleStats(
	args: Extract<ManageBroadcastsArgs, { action: "stats" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.get<KitBroadcastStatsResponse>(`/broadcasts/${args.id}/stats`);
	return formatBroadcastStats(data.broadcast);
}
