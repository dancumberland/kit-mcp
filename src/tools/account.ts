/**
 * get_account tool — comprehensive account overview.
 * Composes: GET /account, /account/creator_profile, /account/email_stats, /account/growth_stats
 */

import type { KitClient } from "../client.js";
import { formatAccountOverview } from "../formatters.js";
import type {
	KitAccountResponse,
	KitCreatorProfileResponse,
	KitEmailStatsResponse,
	KitGrowthStatsResponse,
} from "../types.js";

export async function handleGetAccount(client: KitClient): Promise<string> {
	const [accountData, profileData, emailStatsData, growthStatsData] = await Promise.all([
		client.get<KitAccountResponse>("/account"),
		client.get<KitCreatorProfileResponse>("/account/creator_profile").catch(() => null),
		client.get<KitEmailStatsResponse>("/account/email_stats").catch(() => null),
		client.get<KitGrowthStatsResponse>("/account/growth_stats").catch(() => null),
	]);

	return formatAccountOverview(
		accountData.user,
		accountData.account,
		profileData?.profile ?? null,
		emailStatsData?.stats ?? null,
		growthStatsData?.stats ?? null,
	);
}
