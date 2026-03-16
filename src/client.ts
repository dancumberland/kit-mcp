/**
 * Kit V4 API HTTP client with rate limiting, auth detection, and retry logic.
 *
 * Rate limits:
 *   - API Key: 120 requests per 60 seconds
 *   - OAuth:   600 requests per 60 seconds
 *
 * Retry policy:
 *   - 429: up to 3 retries with exponential backoff (1s, 2s, 4s)
 *   - 5xx: 1 retry after 1s
 *   - 422: never retry (validation errors)
 *   - Network errors: 1 retry after 1s
 */

import {
	KitApiError,
	KitAuthError,
	KitNotFoundError,
	KitRateLimitError,
	KitServerError,
	KitValidationError,
} from "./errors.js";
import type { AuthMethod, KitClientConfig } from "./types.js";

const KIT_API_BASE = "https://api.kit.com/v4";
const BACKOFF_DELAYS = [1000, 2000, 4000];

// --- Rate Limiter ---

class SlidingWindowRateLimiter {
	private readonly timestamps: number[] = [];
	private readonly limit: number;
	private readonly windowMs = 60_000;

	constructor(limit: number) {
		this.limit = limit;
	}

	async acquire(): Promise<void> {
		this.pruneExpired();

		if (this.timestamps.length >= this.limit) {
			const oldest = this.timestamps[0];
			if (oldest === undefined) return;
			const waitMs = this.windowMs - (Date.now() - oldest) + 50;
			await sleep(Math.max(waitMs, 50));
			return this.acquire();
		}

		this.timestamps.push(Date.now());
	}

	private pruneExpired(): void {
		const cutoff = Date.now() - this.windowMs;
		while (
			this.timestamps.length > 0 &&
			(this.timestamps[0] ?? Number.POSITIVE_INFINITY) < cutoff
		) {
			this.timestamps.shift();
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- API Response Error Parsing ---

interface KitErrorBody {
	errors?: string[];
	error?: string;
	message?: string;
}

async function parseErrorBody(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as KitErrorBody;
		if (Array.isArray(body.errors) && body.errors.length > 0) {
			return body.errors.join(", ");
		}
		if (typeof body.error === "string") return body.error;
		if (typeof body.message === "string") return body.message;
		return `HTTP ${response.status}`;
	} catch {
		return `HTTP ${response.status}`;
	}
}

// --- Client ---

export class KitClient {
	private readonly config: KitClientConfig;
	private readonly rateLimiter: SlidingWindowRateLimiter;

	constructor(config?: KitClientConfig) {
		if (config) {
			this.config = config;
		} else {
			const apiKey = process.env.KIT_API_KEY;
			const oauthToken = process.env.KIT_OAUTH_TOKEN;

			if (!apiKey && !oauthToken) {
				throw new KitAuthError(
					"No authentication configured. Set KIT_API_KEY or KIT_OAUTH_TOKEN environment variable.",
				);
			}

			const authMethod: AuthMethod = oauthToken ? "oauth" : "api_key";

			this.config = {
				apiKey: apiKey ?? "",
				oauthToken,
				authMethod,
				rateLimitPerMinute: authMethod === "oauth" ? 600 : 120,
			};
		}

		this.rateLimiter = new SlidingWindowRateLimiter(this.config.rateLimitPerMinute);
	}

	get authMethod(): AuthMethod {
		return this.config.authMethod;
	}

	get rateLimitPerMinute(): number {
		return this.config.rateLimitPerMinute;
	}

	private buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		if (this.config.authMethod === "oauth" && this.config.oauthToken) {
			headers.Authorization = `Bearer ${this.config.oauthToken}`;
		} else {
			headers["X-Kit-Api-Key"] = this.config.apiKey;
		}

		return headers;
	}

	/**
	 * Core request method with rate limiting and retry logic.
	 * Retries: 429 → 3 retries, 5xx → 1 retry, network error → 1 retry.
	 * Never retries: 401, 404, 422.
	 */
	async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		await this.rateLimiter.acquire();

		const url = `${KIT_API_BASE}${path}`;
		const init: RequestInit = {
			method,
			headers: this.buildHeaders(),
		};

		if (body !== undefined && (method === "POST" || method === "PUT" || method === "PATCH")) {
			init.body = JSON.stringify(body);
		}

		const maxAttempts = 4; // 1 initial + up to 3 retries (only 429 uses all 3)
		let lastError: Error | undefined;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const response = await fetch(url, init);

				if (response.ok) {
					if (response.status === 204) {
						return undefined as T;
					}
					return (await response.json()) as T;
				}

				// Non-retryable errors — throw immediately
				if (response.status === 401) {
					throw new KitAuthError();
				}

				if (response.status === 404) {
					throw new KitNotFoundError("Resource", path);
				}

				if (response.status === 422) {
					const message = await parseErrorBody(response);
					throw new KitValidationError(message);
				}

				// Retryable: 429 (up to 3 retries)
				if (response.status === 429) {
					if (attempt < 3) {
						const delay = BACKOFF_DELAYS[attempt] ?? 4000;
						await sleep(delay);
						continue;
					}
					const retryAfter = Number.parseInt(response.headers.get("Retry-After") ?? "60", 10);
					throw new KitRateLimitError(retryAfter);
				}

				// Retryable: 5xx (1 retry only)
				if (response.status >= 500) {
					if (attempt < 1) {
						await sleep(BACKOFF_DELAYS[0] ?? 1000);
						continue;
					}
					throw new KitServerError(response.status);
				}

				// Unknown status
				const errorMessage = await parseErrorBody(response);
				throw new KitApiError(
					response.status,
					"UNKNOWN",
					`Unexpected API response (${response.status}): ${errorMessage}`,
					"Check the Kit API status page or try again.",
				);
			} catch (error) {
				// Re-throw Kit errors (they've already been classified)
				if (error instanceof KitApiError) {
					throw error;
				}

				// Network / fetch errors — 1 retry
				lastError = error instanceof Error ? error : new Error(String(error));
				if (attempt < 1) {
					await sleep(BACKOFF_DELAYS[0] ?? 1000);
				}
			}
		}

		throw new KitApiError(
			0,
			"NETWORK_ERROR",
			lastError?.message ?? "Request failed after retries",
			"Check your network connection and try again.",
		);
	}

	async get<T>(path: string): Promise<T> {
		return this.request<T>("GET", path);
	}

	async post<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	async put<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("PUT", path, body);
	}

	async delete<T>(path: string): Promise<T> {
		return this.request<T>("DELETE", path);
	}
}
