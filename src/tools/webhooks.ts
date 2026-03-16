/**
 * manage_webhooks — 3 actions covering webhook management.
 * Actions: list, create, delete
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { formatWebhookDetail, formatWebhookList } from "../formatters.js";
import type { KitWebhookResponse, KitWebhooksResponse } from "../types.js";

// --- Schema ---

export const ManageWebhooksSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
	}),
	z.object({
		action: z.literal("create"),
		target_url: z.string().url().describe("Webhook target URL (required)"),
		event: z
			.string()
			.describe(
				"Kit event name (required). Examples: subscriber.subscriber_activate, subscriber.subscriber_unsubscribe, subscriber.form_subscribe, subscriber.course_subscribe, subscriber.course_complete, subscriber.tag_add, subscriber.tag_remove, purchase.purchase_create",
			),
	}),
	z.object({
		action: z.literal("delete"),
		id: z.number().int().positive().describe("Webhook ID (required)"),
	}),
]);

export type ManageWebhooksArgs = z.infer<typeof ManageWebhooksSchema>;

// --- Handler ---

export async function handleManageWebhooks(
	args: ManageWebhooksArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(client);
		case "create":
			return handleCreate(args, client);
		case "delete":
			return handleDelete(args, client);
	}
}

// --- Action Handlers ---

async function handleList(client: KitClient): Promise<string> {
	const data = await client.get<KitWebhooksResponse>("/webhooks");
	return formatWebhookList(data.webhooks, data.pagination);
}

async function handleCreate(
	args: Extract<ManageWebhooksArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.post<KitWebhookResponse>("/webhooks", {
		target_url: args.target_url,
		event: { name: args.event },
	});
	return formatWebhookDetail(data.webhook, "created");
}

async function handleDelete(
	args: Extract<ManageWebhooksArgs, { action: "delete" }>,
	client: KitClient,
): Promise<string> {
	await client.delete(`/webhooks/${args.id}`);
	return `Webhook ${args.id} deleted.`;
}
