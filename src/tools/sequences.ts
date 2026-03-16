/**
 * manage_sequences — 3 actions covering sequence management.
 * Actions: list, add_subscriber, list_subscribers
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitValidationError } from "../errors.js";
import { formatSequenceList, formatSubscriberList } from "../formatters.js";
import type {
	KitSequencesResponse,
	KitSubscriberResponse,
	KitSubscribersResponse,
} from "../types.js";

// --- Schema ---

export const ManageSequencesSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("add_subscriber"),
		sequence_id: z.number().int().positive().describe("Sequence ID (required)"),
		email: z.string().describe("Subscriber email address").optional(),
		subscriber_id: z.number().int().positive().describe("Subscriber ID").optional(),
	}),
	z.object({
		action: z.literal("list_subscribers"),
		sequence_id: z.number().int().positive().describe("Sequence ID (required)"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
]);

export type ManageSequencesArgs = z.infer<typeof ManageSequencesSchema>;

// --- Handler ---

export async function handleManageSequences(
	args: ManageSequencesArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(args, client);
		case "add_subscriber":
			return handleAddSubscriber(args, client);
		case "list_subscribers":
			return handleListSubscribers(args, client);
	}
}

// --- Action Handlers ---

async function handleList(
	args: Extract<ManageSequencesArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitSequencesResponse>(`/sequences${query}`);
	return formatSequenceList(data.courses, data.pagination);
}

async function handleAddSubscriber(
	args: Extract<ManageSequencesArgs, { action: "add_subscriber" }>,
	client: KitClient,
): Promise<string> {
	if (!args.email && !args.subscriber_id) {
		throw new KitValidationError(
			"Either email or subscriber_id is required.",
			"Provide an email address or subscriber ID to enroll in the sequence.",
		);
	}

	const body: Record<string, unknown> = {};
	if (args.email) body.email_address = args.email;

	if (args.subscriber_id) {
		await client.post(`/sequences/${args.sequence_id}/subscribers/${args.subscriber_id}`, body);
	} else {
		await client.post<KitSubscriberResponse>(`/sequences/${args.sequence_id}/subscribers`, body);
	}

	const target = args.email ?? `subscriber ID ${args.subscriber_id}`;
	return `${target} enrolled in sequence ${args.sequence_id}.`;
}

async function handleListSubscribers(
	args: Extract<ManageSequencesArgs, { action: "list_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitSubscribersResponse>(
		`/sequences/${args.sequence_id}/subscribers${query}`,
	);
	return formatSubscriberList(data.subscribers, data.pagination);
}
