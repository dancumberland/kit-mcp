/**
 * Shared TypeScript types for Kit V4 API responses.
 */

// --- Auth ---

export type AuthMethod = "api_key" | "oauth";

export interface KitClientConfig {
	apiKey: string;
	oauthToken?: string;
	authMethod: AuthMethod;
	rateLimitPerMinute: number;
}

// --- Account ---

export interface KitUser {
	id: number;
	email: string;
}

export interface KitTimezone {
	name: string;
	friendly_name: string;
	utc_offset: string;
}

export interface KitAccount {
	id: number;
	name: string;
	plan_type: string;
	primary_email_address: string;
	created_at: string;
	timezone: KitTimezone;
}

export interface KitAccountResponse {
	user: KitUser;
	account: KitAccount;
}

export interface KitCreatorProfile {
	name: string;
	byline: string;
	bio: string;
	image_url: string;
	profile_url: string;
}

export interface KitCreatorProfileResponse {
	profile: KitCreatorProfile;
}

export interface KitEmailStats {
	sent: number;
	clicked: number;
	opened: number;
	email_stats_mode: string;
	open_tracking_enabled: boolean;
	click_tracking_enabled: boolean;
	starting: string;
	ending: string;
}

export interface KitEmailStatsResponse {
	stats: KitEmailStats;
}

export interface KitGrowthStats {
	cancellations: number;
	net_new_subscribers: number;
	new_subscribers: number;
	subscribers: number;
	starting: string;
	ending: string;
}

export interface KitGrowthStatsResponse {
	stats: KitGrowthStats;
}

export interface KitColorsResponse {
	colors: string[];
}

// --- Pagination ---

export interface KitPagination {
	has_previous_page: boolean;
	has_next_page: boolean;
	start_cursor: string | null;
	end_cursor: string | null;
	per_page: number;
}

export interface KitPaginatedResponse<T> {
	data: T[];
	pagination: KitPagination;
}
