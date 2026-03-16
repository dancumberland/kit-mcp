import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitClient } from "../../src/client.js";
import {
	KitAuthError,
	KitNotFoundError,
	KitRateLimitError,
	KitValidationError,
} from "../../src/errors.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function errorResponse(status: number, errors: string[] = []): Response {
	return new Response(JSON.stringify({ errors }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("KitClient", () => {
	beforeEach(() => {
		vi.stubEnv("KIT_API_KEY", "test-api-key");
		vi.stubEnv("KIT_OAUTH_TOKEN", "");
		mockFetch.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("constructor", () => {
		it("throws KitAuthError when no auth configured", () => {
			vi.stubEnv("KIT_API_KEY", "");
			vi.stubEnv("KIT_OAUTH_TOKEN", "");
			expect(() => new KitClient()).toThrow(KitAuthError);
		});

		it("configures API key auth when KIT_API_KEY set", () => {
			const client = new KitClient();
			expect(client.authMethod).toBe("api_key");
			expect(client.rateLimitPerMinute).toBe(120);
		});

		it("prefers OAuth when KIT_OAUTH_TOKEN set", () => {
			vi.stubEnv("KIT_OAUTH_TOKEN", "oauth-token");
			const client = new KitClient();
			expect(client.authMethod).toBe("oauth");
			expect(client.rateLimitPerMinute).toBe(600);
		});

		it("accepts explicit config", () => {
			const client = new KitClient({
				apiKey: "explicit-key",
				authMethod: "api_key",
				rateLimitPerMinute: 120,
			});
			expect(client.authMethod).toBe("api_key");
		});
	});

	describe("request handling", () => {
		it("makes GET requests with correct headers", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ account: { name: "Test" } }));
			const client = new KitClient();
			await client.get("/account");

			expect(mockFetch).toHaveBeenCalledOnce();
			const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect(url).toBe("https://api.kit.com/v4/account");
			expect((init.headers as Record<string, string>)["X-Kit-Api-Key"]).toBe("test-api-key");
		});

		it("makes POST requests with body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
			const client = new KitClient();
			await client.post("/subscribers", { email: "test@example.com" });

			const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect(init.method).toBe("POST");
			expect(init.body).toBe(JSON.stringify({ email: "test@example.com" }));
		});

		it("handles 204 No Content", async () => {
			mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
			const client = new KitClient();
			const result = await client.delete("/subscribers/123");
			expect(result).toBeUndefined();
		});

		it("uses OAuth bearer token when configured", async () => {
			vi.stubEnv("KIT_OAUTH_TOKEN", "my-token");
			mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
			const client = new KitClient();
			await client.get("/account");

			const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect((init.headers as Record<string, string>).Authorization).toBe("Bearer my-token");
		});
	});

	describe("error handling", () => {
		it("throws KitAuthError on 401", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse(401, ["Invalid token"]));
			const client = new KitClient();
			await expect(client.get("/account")).rejects.toThrow(KitAuthError);
		});

		it("throws KitNotFoundError on 404", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse(404, ["Not found"]));
			const client = new KitClient();
			await expect(client.get("/subscribers/999")).rejects.toThrow(KitNotFoundError);
		});

		it("throws KitValidationError on 422 without retrying", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse(422, ["Email is invalid"]));
			const client = new KitClient();
			await expect(client.get("/subscribers")).rejects.toThrow(KitValidationError);
			// Should only call fetch once — no retries on 422
			expect(mockFetch).toHaveBeenCalledOnce();
		});

		it("retries on 429 with backoff", async () => {
			mockFetch
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ errors: ["Rate limited"] }), {
						status: 429,
						headers: { "Retry-After": "30" },
					}),
				)
				.mockResolvedValueOnce(jsonResponse({ ok: true }));

			const client = new KitClient();
			const result = await client.get<{ ok: boolean }>("/account");
			expect(result.ok).toBe(true);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		}, 10000);

		it("throws KitRateLimitError after max retries on 429", async () => {
			const rateLimitResponse = () =>
				new Response(JSON.stringify({ errors: ["Rate limited"] }), {
					status: 429,
					headers: { "Retry-After": "30" },
				});

			mockFetch
				.mockResolvedValueOnce(rateLimitResponse())
				.mockResolvedValueOnce(rateLimitResponse())
				.mockResolvedValueOnce(rateLimitResponse())
				.mockResolvedValueOnce(rateLimitResponse());

			const client = new KitClient();
			await expect(client.get("/account")).rejects.toThrow(KitRateLimitError);
			expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
		}, 15000);

		it("retries once on 5xx", async () => {
			mockFetch
				.mockResolvedValueOnce(errorResponse(500))
				.mockResolvedValueOnce(jsonResponse({ ok: true }));

			const client = new KitClient();
			const result = await client.get<{ ok: boolean }>("/account");
			expect(result.ok).toBe(true);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		}, 10000);
	});
});
