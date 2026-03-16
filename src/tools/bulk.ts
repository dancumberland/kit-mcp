/**
 * bulk_operations — 7 actions for batch subscriber management.
 * All actions require OAuth authentication.
 * Actions: create_subscribers, create_tags, tag_subscribers, untag_subscribers,
 *          add_to_forms, create_custom_fields, update_custom_fields
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitOAuthRequiredError } from "../errors.js";

// --- Schema ---

export const BulkOperationsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("create_subscribers"),
		subscribers: z
			.array(
				z.object({
					email_address: z.string().describe("Subscriber email (required)"),
					first_name: z.string().optional(),
					fields: z.record(z.string()).optional(),
				}),
			)
			.min(1)
			.describe("Subscribers to create/upsert (required)"),
		callback_url: z.string().url().describe("URL for async completion notification").optional(),
	}),
	z.object({
		action: z.literal("create_tags"),
		tags: z
			.array(z.object({ name: z.string().min(1) }))
			.min(1)
			.describe("Tags to create (required)"),
		callback_url: z.string().url().optional(),
	}),
	z.object({
		action: z.literal("tag_subscribers"),
		tag_id: z.number().int().positive().describe("Tag ID to apply (required)"),
		emails: z.array(z.string()).describe("Subscriber emails to tag").optional(),
		subscriber_ids: z
			.array(z.number().int().positive())
			.describe("Subscriber IDs to tag")
			.optional(),
		callback_url: z.string().url().optional(),
	}),
	z.object({
		action: z.literal("untag_subscribers"),
		tag_id: z.number().int().positive().describe("Tag ID to remove (required)"),
		emails: z.array(z.string()).describe("Subscriber emails to untag").optional(),
		subscriber_ids: z
			.array(z.number().int().positive())
			.describe("Subscriber IDs to untag")
			.optional(),
		callback_url: z.string().url().optional(),
	}),
	z.object({
		action: z.literal("add_to_forms"),
		form_id: z.number().int().positive().describe("Form ID (required)"),
		emails: z.array(z.string()).describe("Subscriber emails to add").optional(),
		subscriber_ids: z
			.array(z.number().int().positive())
			.describe("Subscriber IDs to add")
			.optional(),
		callback_url: z.string().url().optional(),
	}),
	z.object({
		action: z.literal("create_custom_fields"),
		custom_fields: z
			.array(z.object({ label: z.string().min(1) }))
			.min(1)
			.describe("Custom fields to create (required)"),
		callback_url: z.string().url().optional(),
	}),
	z.object({
		action: z.literal("update_custom_fields"),
		custom_field_id: z.number().int().positive().describe("Custom field ID (required)"),
		subscribers: z
			.array(
				z.object({
					id: z.number().int().positive().describe("Subscriber ID"),
					value: z.string().describe("Field value to set"),
				}),
			)
			.min(1)
			.describe("Subscriber field values to update (required)"),
		callback_url: z.string().url().optional(),
	}),
]);

export type BulkOperationsArgs = z.infer<typeof BulkOperationsSchema>;

// --- Handler ---

export async function handleBulkOperations(
	args: BulkOperationsArgs,
	client: KitClient,
): Promise<string> {
	if (client.authMethod !== "oauth") {
		throw new KitOAuthRequiredError("bulk_operations");
	}

	switch (args.action) {
		case "create_subscribers":
			return handleCreateSubscribers(args, client);
		case "create_tags":
			return handleCreateTags(args, client);
		case "tag_subscribers":
			return handleTagSubscribers(args, client);
		case "untag_subscribers":
			return handleUntagSubscribers(args, client);
		case "add_to_forms":
			return handleAddToForms(args, client);
		case "create_custom_fields":
			return handleCreateCustomFields(args, client);
		case "update_custom_fields":
			return handleUpdateCustomFields(args, client);
	}
}

// --- Action Handlers ---

async function handleCreateSubscribers(
	args: Extract<BulkOperationsArgs, { action: "create_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { subscribers: args.subscribers };
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/subscribers", body);
	return `Bulk create: ${args.subscribers.length} subscribers queued for import.`;
}

async function handleCreateTags(
	args: Extract<BulkOperationsArgs, { action: "create_tags" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { tags: args.tags };
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/tags", body);
	return `Bulk create: ${args.tags.length} tags queued for creation.`;
}

async function handleTagSubscribers(
	args: Extract<BulkOperationsArgs, { action: "tag_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { tag_id: args.tag_id };
	if (args.emails) body.emails = args.emails;
	if (args.subscriber_ids) body.subscriber_ids = args.subscriber_ids;
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/tags/subscribers", body);
	const count = (args.emails?.length ?? 0) + (args.subscriber_ids?.length ?? 0);
	return `Bulk tag: tag ${args.tag_id} queued for application to ${count} subscribers.`;
}

async function handleUntagSubscribers(
	args: Extract<BulkOperationsArgs, { action: "untag_subscribers" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { tag_id: args.tag_id };
	if (args.emails) body.emails = args.emails;
	if (args.subscriber_ids) body.subscriber_ids = args.subscriber_ids;
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.delete("/bulk/tags/subscribers");
	const count = (args.emails?.length ?? 0) + (args.subscriber_ids?.length ?? 0);
	return `Bulk untag: tag ${args.tag_id} queued for removal from ${count} subscribers.`;
}

async function handleAddToForms(
	args: Extract<BulkOperationsArgs, { action: "add_to_forms" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { form_id: args.form_id };
	if (args.emails) body.emails = args.emails;
	if (args.subscriber_ids) body.subscriber_ids = args.subscriber_ids;
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/forms/subscribers", body);
	const count = (args.emails?.length ?? 0) + (args.subscriber_ids?.length ?? 0);
	return `Bulk form add: ${count} subscribers queued for form ${args.form_id}. Double opt-in will trigger if enabled.`;
}

async function handleCreateCustomFields(
	args: Extract<BulkOperationsArgs, { action: "create_custom_fields" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = { custom_fields: args.custom_fields };
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/custom_fields", body);
	return `Bulk create: ${args.custom_fields.length} custom fields queued for creation.`;
}

async function handleUpdateCustomFields(
	args: Extract<BulkOperationsArgs, { action: "update_custom_fields" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {
		custom_field_id: args.custom_field_id,
		subscribers: args.subscribers,
	};
	if (args.callback_url) body.callback_url = args.callback_url;

	await client.post("/bulk/custom_fields/subscribers", body);
	return `Bulk update: custom field ${args.custom_field_id} queued for update on ${args.subscribers.length} subscribers.`;
}
