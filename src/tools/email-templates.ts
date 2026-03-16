/**
 * manage_email_templates — 1 action (list only).
 * Actions: list
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { formatEmailTemplateList } from "../formatters.js";
import type { KitEmailTemplatesResponse } from "../types.js";

// --- Schema ---

export const ManageEmailTemplatesSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
	}),
]);

export type ManageEmailTemplatesArgs = z.infer<typeof ManageEmailTemplatesSchema>;

// --- Handler ---

export async function handleManageEmailTemplates(
	args: ManageEmailTemplatesArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(client);
	}
}

// --- Action Handlers ---

async function handleList(client: KitClient): Promise<string> {
	const data = await client.get<KitEmailTemplatesResponse>("/email_templates");
	return formatEmailTemplateList(data.email_templates, data.pagination);
}
