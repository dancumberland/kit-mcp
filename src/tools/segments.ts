/**
 * manage_segments — 1 action (list only, read-only via API).
 * Actions: list
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { formatSegmentList } from "../formatters.js";
import type { KitSegmentsResponse } from "../types.js";

// --- Schema ---

export const ManageSegmentsSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
	}),
]);

export type ManageSegmentsArgs = z.infer<typeof ManageSegmentsSchema>;

// --- Handler ---

export async function handleManageSegments(
	args: ManageSegmentsArgs,
	client: KitClient,
): Promise<string> {
	switch (args.action) {
		case "list":
			return handleList(client);
	}
}

// --- Action Handlers ---

async function handleList(client: KitClient): Promise<string> {
	const data = await client.get<KitSegmentsResponse>("/segments");
	return formatSegmentList(data.segments, data.pagination);
}
