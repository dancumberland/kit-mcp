/**
 * manage_forms — 3 actions covering form management.
 * Actions: list, list_subscribers, add_subscriber
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitValidationError } from "../errors.js";
import { formatFormList, formatSubscriberList } from "../formatters.js";
import type { KitFormsResponse, KitSubscriberResponse, KitSubscribersResponse } from "../types.js";

// --- Schema ---

export const ManageFormsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("list_subscribers"),
		form_id: z.number().int().positive().describe("Form ID (required)"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("add_subscriber"),
		form_id: z.number().int().positive().describe("Form ID (required)"),
		email: z.string().describe("Subscriber email address").optional(),
		subscriber_id: z.number().int().positive().describe("Subscriber ID").optional(),
	}),
]);

export type ManageFormsArgs = z.infer<typeof ManageFormsSchema>;

// --- Handler ---

export async function handleManageForms(args: ManageFormsArgs, client: KitClient): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(args, client);
		case "list_subscribers":
			return handleListSubscribers(args, client);
		case "add_subscriber":
			return handleAddSubscriber(args, client);
	}
}

// --- Action Handlers ---

async function handleList(
	args: Extract<ManageFormsArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitFormsResponse>(`/forms${query}`);
	return formatFormList(data.forms, data.pagination);
}

async function handleListSubscribers(
	args: Extract<ManageFormsArgs, { action: "list_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitSubscribersResponse>(
		`/forms/${args.form_id}/subscribers${query}`,
	);
	return formatSubscriberList(data.subscribers, data.pagination);
}

async function handleAddSubscriber(
	args: Extract<ManageFormsArgs, { action: "add_subscriber" }>,
	client: KitClient,
): Promise<string> {
	if (!args.email && !args.subscriber_id) {
		throw new KitValidationError(
			"Either email or subscriber_id is required.",
			"Provide an email address or subscriber ID to add to the form.",
		);
	}

	const body: Record<string, unknown> = {};
	if (args.email) body.email_address = args.email;
	if (args.subscriber_id) body.id = args.subscriber_id;

	const data = await client.post<KitSubscriberResponse>(`/forms/${args.form_id}/subscribers`, body);
	return `Subscriber ${data.subscriber.email_address} added to form ${args.form_id}. Double opt-in email sent if enabled.`;
}
