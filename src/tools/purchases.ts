/**
 * manage_purchases — 3 actions covering purchase management.
 * Actions: list, get, create
 * All purchase endpoints require OAuth authentication.
 */

import { z } from "zod";
import type { KitClient } from "../client.js";
import { KitOAuthRequiredError } from "../errors.js";
import { formatPurchaseDetail, formatPurchaseList } from "../formatters.js";
import type { KitPurchaseResponse, KitPurchasesResponse } from "../types.js";

// --- Schema ---

export const ManagePurchasesSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("list"),
		page_size: z.number().int().min(1).max(500).optional(),
		cursor: z.string().describe("Pagination cursor").optional(),
	}),
	z.object({
		action: z.literal("get"),
		id: z.number().int().positive().describe("Purchase ID (required)"),
	}),
	z.object({
		action: z.literal("create"),
		email: z.string().describe("Buyer email address (required)"),
		transaction_id: z.string().describe("Unique transaction ID (required)"),
		currency: z.string().describe("3-letter currency code (e.g. USD)").optional(),
		transaction_time: z.string().describe("Transaction time (ISO 8601)").optional(),
		subtotal: z.number().describe("Subtotal before tax/discount").optional(),
		tax: z.number().describe("Tax amount").optional(),
		shipping: z.number().describe("Shipping cost").optional(),
		discount: z.number().describe("Discount amount").optional(),
		total: z.number().describe("Total amount").optional(),
		status: z.enum(["paid", "refund"]).describe("Transaction status").optional(),
		products: z
			.array(
				z.object({
					name: z.string().describe("Product name"),
					pid: z.string().describe("Product ID").optional(),
					sku: z.string().describe("Product SKU").optional(),
					unit_price: z.number().describe("Unit price").optional(),
					quantity: z.number().int().describe("Quantity").optional(),
				}),
			)
			.describe("Products in this purchase")
			.optional(),
	}),
]);

export type ManagePurchasesArgs = z.infer<typeof ManagePurchasesSchema>;

// --- Handler ---

export async function handleManagePurchases(
	args: ManagePurchasesArgs,
	client: KitClient,
): Promise<string> {
	if (client.authMethod !== "oauth") {
		throw new KitOAuthRequiredError("manage_purchases");
	}

	switch (args.action) {
		case "list":
			return handleList(args, client);
		case "get":
			return handleGet(args, client);
		case "create":
			return handleCreate(args, client);
	}
}

// --- Action Handlers ---

async function handleList(
	args: Extract<ManagePurchasesArgs, { action: "list" }>,
	client: KitClient,
): Promise<string> {
	const params: string[] = [];
	if (args.page_size) params.push(`per_page=${args.page_size}`);
	if (args.cursor) params.push(`after=${encodeURIComponent(args.cursor)}`);
	const query = params.length > 0 ? `?${params.join("&")}` : "";

	const data = await client.get<KitPurchasesResponse>(`/purchases${query}`);
	return formatPurchaseList(data.purchases, data.pagination);
}

async function handleGet(
	args: Extract<ManagePurchasesArgs, { action: "get" }>,
	client: KitClient,
): Promise<string> {
	const data = await client.get<KitPurchaseResponse>(`/purchases/${args.id}`);
	return formatPurchaseDetail(data.purchase);
}

async function handleCreate(
	args: Extract<ManagePurchasesArgs, { action: "create" }>,
	client: KitClient,
): Promise<string> {
	const body: Record<string, unknown> = {
		email_address: args.email,
		transaction_id: args.transaction_id,
	};
	if (args.currency) body.currency = args.currency;
	if (args.transaction_time) body.transaction_time = args.transaction_time;
	if (args.subtotal !== undefined) body.subtotal = args.subtotal;
	if (args.tax !== undefined) body.tax = args.tax;
	if (args.shipping !== undefined) body.shipping = args.shipping;
	if (args.discount !== undefined) body.discount = args.discount;
	if (args.total !== undefined) body.total = args.total;
	if (args.status) body.status = args.status;
	if (args.products) body.products = args.products;

	const data = await client.post<KitPurchaseResponse>("/purchases", body);
	return `Purchase recorded (ID: ${data.purchase.id}): ${data.purchase.email_address} — ${data.purchase.currency} ${data.purchase.total.toFixed(2)}`;
}
