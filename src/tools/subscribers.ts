/**
 * manage_subscribers — 7 actions covering subscriber management.
 * Actions: find, list, create, update, unsubscribe, stats, filter
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitValidationError } from "../errors.js";
import {
	formatSubscriberList,
	formatSubscriberStats,
	formatSubscriberSummary,
} from "../formatters.js";
import type {
	KitSubscriber,
	KitSubscriberResponse,
	KitSubscriberStatsResponse,
	KitSubscribersResponse,
	KitTag,
	KitTagResponse,
	KitTagsResponse,
} from "../types.js";

// --- Schema ---

export const ManageSubscribersSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("find"),
		email: z.string().describe("Find by email address").optional(),
		id: z.number().int().positive().describe("Find by subscriber ID").optional(),
	}),
	z.object({
		action: z.literal("list"),
		page_size: z
			.number()
			.int()
			.min(1)
			.max(500)
			.describe("Results per page (1-500, default 50)")
			.optional(),
		cursor: z.string().describe("Pagination cursor from previous response").optional(),
		from: z.string().describe("Filter: created after this date (ISO 8601)").optional(),
		to: z.string().describe("Filter: created before this date (ISO 8601)").optional(),
		sort_field: z.enum(["created_at", "updated_at"]).describe("Sort by field").optional(),
		sort_order: z.enum(["asc", "desc"]).describe("Sort direction").optional(),
	}),
	z.object({
		action: z.literal("create"),
		email: z.string().describe("Subscriber email address (required)"),
		first_name: z.string().describe("Subscriber first name").optional(),
		tags: z
			.array(z.string())
			.describe("Tag names to apply (created if they don't exist)")
			.optional(),
		fields: z.record(z.string()).describe("Custom field key-value pairs").optional(),
	}),
	z.object({
		action: z.literal("update"),
		id: z.number().int().positive().describe("Subscriber ID (required)"),
		first_name: z.string().describe("Updated first name").optional(),
		fields: z.record(z.string()).describe("Custom field key-value pairs to update").optional(),
	}),
	z.object({
		action: z.literal("unsubscribe"),
		email: z.string().describe("Unsubscribe by email address").optional(),
		id: z.number().int().positive().describe("Unsubscribe by subscriber ID").optional(),
	}),
	z.object({
		action: z.literal("stats"),
		id: z.number().int().positive().describe("Subscriber ID (required)"),
	}),
	z.object({
		action: z.literal("filter"),
		status: z
			.enum(["active", "inactive", "bounced", "complained", "cancelled"])
			.describe("Filter by subscriber state")
			.optional(),
		tag_id: z.number().int().positive().describe("Filter by tag ID").optional(),
		created_after: z.string().describe("Created after date (ISO 8601)").optional(),
		created_before: z.string().describe("Created before date (ISO 8601)").optional(),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().optional(),
		sort_order: z.enum(["asc", "desc"]).optional(),
	}),
]);

export type ManageSubscribersArgs = z.infer<typeof ManageSubscribersSchema>;

// --- Handler ---

export async function handleManageSubscribers(
	args: ManageSubscribersArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "find":
			return handleFind(args, client);
		case "list":
			return handleList(args, client);
		case "create":
			return handleCreate(args, client);
		case "update":
			return handleUpdate(args, client);
		case "unsubscribe":
			return handleUnsubscribe(args, client);
		case "stats":
			return handleStats(args, client);
		case "filter":
			return handleFilter(args, client);
	}
}

// --- Action Handlers ---

async function handleFind(
	args: Extract<ManageSubscribersArgs, { action: "find" }>,
	client: KitClient,
): Promise<string> {
	if (!args.email && !args.id) {
		throw new KitValidationError(
			"Either email or id is required for find action.",
			"Provide an email address or subscriber ID.",
		);
	}

	let subscriber: KitSubscriber;

	if (args.id) {
		const data = await client.get<KitSubscriberResponse>(`/subscribers/${args.id}`);
		subscriber = data.subscriber;
	} else {
		const data = await client.get<KitSubscribersResponse>(
			`/subscribers?email_address=${encodeURIComponent(args.email as string)}`,
		);
		if (data.subscribers.length === 0) {
			return `No subscriber found with email ${args.email}`;
		}
		subscriber = data.subscribers[0] as KitSubscriber;
	}

	// Fetch tags in parallel
	const tagsData = await client
		.get<KitTagsResponse>(`/subscribers/${subscriber.id}/tags`)
		.catch(() => null);
	const tags = tagsData?.tags ?? [];

	return formatSubscriberSummary(subscriber, tags);
}

async function handleList(
	args: Extract<ManageSubscribersArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params = buildSubscriberQueryParams(args);
	const data = await client.get<KitSubscribersResponse>(`/subscribers${params}`);
	return formatSubscriberList(data.subscribers, data.pagination);
}

async function handleCreate(
	args: Extract<ManageSubscribersArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {
		email_address: args.email,
	};
	if (args.first_name) body.first_name = args.first_name;
	if (args.fields) body.fields = args.fields;

	const data = await client.post<KitSubscriberResponse>("/subscribers", body);
	const subscriber = data.subscriber;

	// Apply tags if provided
	const appliedTags: string[] = [];
	if (args.tags && args.tags.length > 0) {
		const resolvedTags = await resolveTagNames(args.tags, client);
		for (const tag of resolvedTags) {
			await client.post(`/tags/${tag.id}/subscribers`, {
				email_address: args.email,
			});
			appliedTags.push(tag.name);
		}
	}

	const tagSuffix = appliedTags.length > 0 ? `\nTags applied: ${appliedTags.join(", ")}` : "";
	return `Subscriber created/updated: ${subscriber.email_address} (ID: ${subscriber.id})${tagSuffix}`;
}

async function handleUpdate(
	args: Extract<ManageSubscribersArgs, { action: "update" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {};
	if (args.first_name !== undefined) body.first_name = args.first_name;
	if (args.fields) body.fields = args.fields;

	const data = await client.put<KitSubscriberResponse>(`/subscribers/${args.id}`, body);
	return `Subscriber updated: ${data.subscriber.email_address} (ID: ${data.subscriber.id})`;
}

async function handleUnsubscribe(
	args: Extract<ManageSubscribersArgs, { action: "unsubscribe" }>,
	client: KitClient,
): Promise<string> {
	if (!args.email && !args.id) {
		throw new KitValidationError(
			"Either email or id is required for unsubscribe action.",
			"Provide an email address or subscriber ID.",
		);
	}

	let subscriberId = args.id;

	// Look up by email if no ID provided
	if (!subscriberId && args.email) {
		const data = await client.get<KitSubscribersResponse>(
			`/subscribers?email_address=${encodeURIComponent(args.email)}`,
		);
		if (data.subscribers.length === 0) {
			return `No subscriber found with email ${args.email}`;
		}
		subscriberId = (data.subscribers[0] as KitSubscriber).id;
	}

	await client.post(`/subscribers/${subscriberId}/unsubscribe`);
	return `Subscriber ${args.email ?? `ID ${subscriberId}`} has been unsubscribed.`;
}

async function handleStats(
	args: Extract<ManageSubscribersArgs, { action: "stats" }>,
	client: KitClient,
): Promise<string> {
	// Fetch subscriber info and stats in parallel
	const [subData, statsData] = await Promise.all([
		client.get<KitSubscriberResponse>(`/subscribers/${args.id}`),
		client.get<KitSubscriberStatsResponse>(`/subscribers/${args.id}/stats`),
	]);

	return formatSubscriberStats(subData.subscriber, statsData.subscriber.stats);
}

async function handleFilter(
	args: Extract<ManageSubscribersArgs, { action: "filter" }>,
	client: KitClient,
): Promise<string> {
	const queryParts: string[] = [];

	if (args.status) queryParts.push(`status=${encodeURIComponent(args.status)}`);
	if (args.tag_id) queryParts.push(`tag_id=${args.tag_id}`);
	if (args.created_after)
		queryParts.push(`created_after=${encodeURIComponent(args.created_after)}`);
	if (args.created_before)
		queryParts.push(`created_before=${encodeURIComponent(args.created_before)}`);
	if (args.page_size) queryParts.push(`per_page=${args.page_size}`);
	if (args.cursor) queryParts.push(`after=${encodeURIComponent(args.cursor)}`);
	if (args.sort_order) queryParts.push(`sort_order=${args.sort_order}`);

	const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
	const data = await client.get<KitSubscribersResponse>(`/subscribers${query}`);
	return formatSubscriberList(data.subscribers, data.pagination);
}

// --- Helpers ---

function buildSubscriberQueryParams(args: {
	page_size?: number;
	cursor?: string;
	from?: string;
	to?: string;
	sort_field?: string;
	sort_order?: string;
}): string {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	if (args.from) params.push(`created_after=${encodeURIComponent(args.from)}`);
	if (args.to) params.push(`created_before=${encodeURIComponent(args.to)}`);
	if (args.sort_field) params.push(`sort_field=${args.sort_field}`);
	if (args.sort_order) params.push(`sort_order=${args.sort_order}`);
	return params.length > 0 ? `?${params.join("&")}` : "";
}

async function resolveTagNames(tagNames: string[], client: KitClient): Promise<KitTag[]> {
	// Fetch existing tags to match by name
	const existing = await client.get<KitTagsResponse>("/tags");
	const tagMap = new Map(existing.tags.map((t) => [t.name.toLowerCase(), t]));

	const resolved: KitTag[] = [];
	for (const name of tagNames) {
		const found = tagMap.get(name.toLowerCase());
		if (found) {
			resolved.push(found);
		} else {
			// Create the tag
			const created = await client.post<KitTagResponse>("/tags", {
				name,
			});
			resolved.push(created.tag);
		}
	}
	return resolved;
}
