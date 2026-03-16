/**
 * manage_custom_fields — 4 actions covering custom field management.
 * Actions: list, create, update, delete
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { formatCustomFieldDetail, formatCustomFieldList } from "../formatters.js";
import type { KitCustomFieldResponse, KitCustomFieldsResponse } from "../types.js";

// --- Schema ---

export const ManageCustomFieldsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
	}),
	z.object({
		action: z.literal("create"),
		label: z.string().min(1).describe("Custom field label (required)"),
	}),
	z.object({
		action: z.literal("update"),
		id: z.number().int().positive().describe("Custom field ID (required)"),
		label: z
			.string()
			.min(1)
			.describe("New label (required). Warning: breaks Liquid tags referencing the old name."),
	}),
	z.object({
		action: z.literal("delete"),
		id: z
			.number()
			.int()
			.positive()
			.describe(
				"Custom field ID (required). Destructive — deletes all subscriber data for this field.",
			),
	}),
]);

export type ManageCustomFieldsArgs = z.infer<typeof ManageCustomFieldsSchema>;

// --- Handler ---

export async function handleManageCustomFields(
	args: ManageCustomFieldsArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(client);
		case "create":
			return handleCreate(args, client);
		case "update":
			return handleUpdate(args, client);
		case "delete":
			return handleDelete(args, client);
	}
}

// --- Action Handlers ---

async function handleList(client: KitClient): Promise<string> {
	const data = await client.get<KitCustomFieldsResponse>("/custom_fields");
	return formatCustomFieldList(data.custom_fields, data.pagination);
}

async function handleCreate(
	args: Extract<ManageCustomFieldsArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.post<KitCustomFieldResponse>("/custom_fields", {
		label: args.label,
	});
	return formatCustomFieldDetail(data.custom_field, "created");
}

async function handleUpdate(
	args: Extract<ManageCustomFieldsArgs, { action: "update" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.put<KitCustomFieldResponse>(`/custom_fields/${args.id}`, {
		label: args.label,
	});
	return formatCustomFieldDetail(data.custom_field, "updated");
}

async function handleDelete(
	args: Extract<ManageCustomFieldsArgs, { action: "delete" }>,
	client: KitClient,
): Promise<string> {
	await client.delete(`/custom_fields/${args.id}`);
	return `Custom field ${args.id} deleted. All subscriber data for this field has been removed.`;
}
