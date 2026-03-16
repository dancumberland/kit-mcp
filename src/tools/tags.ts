/**
 * manage_tags — 6 actions covering tag management.
 * Actions: list, create, update, tag_subscriber, untag_subscriber, list_subscribers
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitValidationError } from "../errors.js";
import { formatSubscriberList, formatTagDetail, formatTagList } from "../formatters.js";
import type { KitSubscribersResponse, KitTagResponse, KitTagsResponse } from "../types.js";

// --- Schema ---

export const ManageTagsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("create"),
		name: z.string().min(1).describe("Tag name (required)"),
	}),
	z.object({
		action: z.literal("update"),
		id: z.number().int().positive().describe("Tag ID (required)"),
		name: z.string().min(1).describe("New tag name (required)"),
	}),
	z.object({
		action: z.literal("tag_subscriber"),
		tag_id: z.number().int().positive().describe("Tag ID (required)"),
		email: z.string().describe("Subscriber email address").optional(),
		subscriber_id: z.number().int().positive().describe("Subscriber ID").optional(),
	}),
	z.object({
		action: z.literal("untag_subscriber"),
		tag_id: z.number().int().positive().describe("Tag ID (required)"),
		subscriber_id: z.number().int().positive().describe("Subscriber ID (required)"),
	}),
	z.object({
		action: z.literal("list_subscribers"),
		tag_id: z.number().int().positive().describe("Tag ID (required)"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
]);

export type ManageTagsArgs = z.infer<typeof ManageTagsSchema>;

// --- Handler ---

export async function handleManageTags(args: ManageTagsArgs, client: KitClient): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(args, client);
		case "create":
			return handleCreate(args, client);
		case "update":
			return handleUpdate(args, client);
		case "tag_subscriber":
			return handleTagSubscriber(args, client);
		case "untag_subscriber":
			return handleUntagSubscriber(args, client);
		case "list_subscribers":
			return handleListSubscribers(args, client);
	}
}

// --- Action Handlers ---

async function handleList(
	args: Extract<ManageTagsArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitTagsResponse>(`/tags${query}`);
	return formatTagList(data.tags, data.pagination);
}

async function handleCreate(
	args: Extract<ManageTagsArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.post<KitTagResponse>("/tags", {
		name: args.name,
	});
	return formatTagDetail(data.tag, "created");
}

async function handleUpdate(
	args: Extract<ManageTagsArgs, { action: "update" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.put<KitTagResponse>(`/tags/${args.id}`, {
		name: args.name,
	});
	return formatTagDetail(data.tag, "updated");
}

async function handleTagSubscriber(
	args: Extract<ManageTagsArgs, { action: "tag_subscriber" }>,
	client: KitClient,
): Promise<string> {
	if (!args.email && !args.subscriber_id) {
		throw new KitValidationError(
			"Either email or subscriber_id is required.",
			"Provide an email address or subscriber ID to tag.",
		);
	}

	if (args.subscriber_id) {
		// Tag by subscriber ID (path-based)
		await client.post(`/tags/${args.tag_id}/subscribers/${args.subscriber_id}`);
	} else {
		// Tag by email (body-based)
		await client.post(`/tags/${args.tag_id}/subscribers`, {
			email_address: args.email,
		});
	}
	const target = args.email ?? `subscriber ID ${args.subscriber_id}`;
	return `Tag ${args.tag_id} applied to ${target}.`;
}

async function handleUntagSubscriber(
	args: Extract<ManageTagsArgs, { action: "untag_subscriber" }>,
	client: KitClient,
): Promise<string> {
	await client.delete(`/tags/${args.tag_id}/subscribers/${args.subscriber_id}`);
	return `Tag ${args.tag_id} removed from subscriber ${args.subscriber_id}.`;
}

async function handleListSubscribers(
	args: Extract<ManageTagsArgs, { action: "list_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitSubscribersResponse>(`/tags/${args.tag_id}/subscribers${query}`);
	return formatSubscriberList(data.subscribers, data.pagination);
}
