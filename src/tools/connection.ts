/**
 * test_connection tool — verifies API key is valid, returns account name.
 * Use as the first tool call to confirm setup.
 */

import type { KitClient } from "../client.js";
import { formatConnectionSuccess } from "../formatters.js";
import type { KitAccountResponse } from "../types.js";

export async function handleTestConnection(client: KitClient): Promise<string> {
	const data = await client.get<KitAccountResponse>("/account");
	return formatConnectionSuccess(data.account.name, client.authMethod, client.rateLimitPerMinute);
}
