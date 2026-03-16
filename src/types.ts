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

// --- Subscribers ---

export interface KitSubscriber {
	id: number;
	first_name: string | null;
	email_address: string;
	state: string;
	created_at: string;
	fields: Record<string, string | null>;
}

export interface KitSubscriberResponse {
	subscriber: KitSubscriber;
}

export interface KitSubscribersResponse {
	subscribers: KitSubscriber[];
	pagination: KitPagination;
}

// --- Tags ---

export interface KitTag {
	id: number;
	name: string;
	created_at: string;
}

export interface KitTagResponse {
	tag: KitTag;
}

export interface KitTagsResponse {
	tags: KitTag[];
	pagination: KitPagination;
}

export interface KitSubscriberStats {
	sent: number;
	opened: number;
	clicked: number;
	bounced: number;
	open_rate: number;
	click_rate: number;
	last_sent: string | null;
	last_opened: string | null;
	last_clicked: string | null;
	sends_since_last_open: number;
	sends_since_last_click: number;
}

export interface KitSubscriberStatsResponse {
	subscriber: {
		id: number;
		stats: KitSubscriberStats;
	};
}

// --- Sequences ---

export interface KitSequence {
	id: number;
	name: string;
	hold: boolean;
	repeat: boolean;
	created_at: string;
}

export interface KitSequencesResponse {
	sequences: KitSequence[];
	pagination: KitPagination;
}

// --- Custom Fields ---

export interface KitCustomField {
	id: number;
	key: string;
	label: string;
}

export interface KitCustomFieldsResponse {
	custom_fields: KitCustomField[];
	pagination: KitPagination;
}

export interface KitCustomFieldResponse {
	custom_field: KitCustomField;
}

// --- Purchases ---

export interface KitProduct {
	pid: string;
	lid: number;
	name: string;
	sku: string;
	unit_price: number;
	quantity: number;
}

export interface KitPurchase {
	id: number;
	transaction_id: string;
	status: string;
	email_address: string;
	currency: string;
	transaction_time: string;
	subtotal: number;
	discount: number;
	tax: number;
	total: number;
	products: KitProduct[];
}

export interface KitPurchasesResponse {
	purchases: KitPurchase[];
	pagination: KitPagination;
}

export interface KitPurchaseResponse {
	purchase: KitPurchase;
}

// --- Segments ---

export interface KitSegment {
	id: number;
	name: string;
	created_at: string;
}

export interface KitSegmentsResponse {
	segments: KitSegment[];
	pagination: KitPagination;
}

// --- Webhooks ---

export interface KitWebhook {
	id: number;
	target_url: string;
	event: {
		name: string;
	};
}

export interface KitWebhooksResponse {
	webhooks: KitWebhook[];
	pagination: KitPagination;
}

export interface KitWebhookResponse {
	webhook: KitWebhook;
}

// --- Email Templates ---

export interface KitEmailTemplate {
	id: number;
	name: string;
}

export interface KitEmailTemplatesResponse {
	email_templates: KitEmailTemplate[];
	pagination: KitPagination;
}

// --- Broadcasts ---

export interface KitBroadcast {
	id: number;
	subject: string | null;
	description: string | null;
	content: string | null;
	public: boolean;
	published_at: string | null;
	send_at: string | null;
	thumbnail_alt: string | null;
	thumbnail_url: string | null;
	preview_text: string | null;
	created_at: string;
	email_template: { id: number; name: string } | null;
}

export interface KitBroadcastResponse {
	broadcast: KitBroadcast;
}

export interface KitBroadcastsResponse {
	broadcasts: KitBroadcast[];
	pagination: KitPagination;
}

export interface KitBroadcastStatsResponse {
	broadcast: {
		id: number;
		subject: string;
		stats: {
			recipients: number;
			open_rate: number;
			click_rate: number;
			unsubscribes: number;
			total_clicks: number;
			show_total_clicks: boolean;
			status: string;
			progress: number;
		};
	};
}

// --- Forms ---

export interface KitForm {
	id: number;
	name: string;
	type: string;
	format: string | null;
	embed_js: string | null;
	embed_url: string | null;
	archived: boolean;
	uid: string;
	created_at: string;
}

export interface KitFormsResponse {
	forms: KitForm[];
	pagination: KitPagination;
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
