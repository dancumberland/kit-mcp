import { describe, expect, it } from "vitest";
import {
	KitApiError,
	KitAuthError,
	KitNotFoundError,
	KitOAuthRequiredError,
	KitRateLimitError,
	KitServerError,
	KitValidationError,
	formatError,
} from "../../src/errors.js";

describe("KitApiError", () => {
	it("formats error with status and recovery hint", () => {
		const error = new KitApiError(500, "TEST", "Something broke", "Try again");
		expect(error.format()).toBe("Error 500: Something broke\nRecovery: Try again");
	});

	it("extends Error with correct name", () => {
		const error = new KitApiError(500, "TEST", "msg", "hint");
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("KitApiError");
	});
});

describe("KitAuthError", () => {
	it("has 401 status and recovery hint pointing to API key settings", () => {
		const error = new KitAuthError();
		expect(error.status).toBe(401);
		expect(error.code).toBe("AUTH_ERROR");
		expect(error.message).toBe("Invalid API key");
		expect(error.recovery).toContain("KIT_API_KEY");
		expect(error.recovery).toContain("kit.com");
	});

	it("accepts custom message", () => {
		const error = new KitAuthError("Custom auth error");
		expect(error.message).toBe("Custom auth error");
	});
});

describe("KitRateLimitError", () => {
	it("has 429 status and includes retry delay in recovery", () => {
		const error = new KitRateLimitError(30);
		expect(error.status).toBe(429);
		expect(error.retryAfter).toBe(30);
		expect(error.recovery).toContain("30 seconds");
	});

	it("defaults to 60 second retry", () => {
		const error = new KitRateLimitError();
		expect(error.retryAfter).toBe(60);
	});
});

describe("KitValidationError", () => {
	it("has 422 status", () => {
		const error = new KitValidationError("Email is invalid");
		expect(error.status).toBe(422);
		expect(error.message).toBe("Email is invalid");
	});

	it("accepts custom recovery hint", () => {
		const error = new KitValidationError("Bad field", "Use a valid email");
		expect(error.recovery).toBe("Use a valid email");
	});
});

describe("KitNotFoundError", () => {
	it("includes resource and identifier in message", () => {
		const error = new KitNotFoundError("Subscriber", 123);
		expect(error.status).toBe(404);
		expect(error.message).toContain("Subscriber");
		expect(error.message).toContain("123");
	});
});

describe("KitOAuthRequiredError", () => {
	it("has 403 status and mentions OAuth setup", () => {
		const error = new KitOAuthRequiredError("bulk_operations");
		expect(error.status).toBe(403);
		expect(error.message).toContain("bulk_operations");
		expect(error.recovery).toContain("KIT_OAUTH_TOKEN");
	});
});

describe("KitServerError", () => {
	it("has the passed status code", () => {
		const error = new KitServerError(503);
		expect(error.status).toBe(503);
		expect(error.message).toContain("503");
	});
});

describe("formatError", () => {
	it("formats KitApiError instances", () => {
		const error = new KitAuthError();
		const formatted = formatError(error);
		expect(formatted).toContain("Error 401");
		expect(formatted).toContain("Recovery:");
	});

	it("formats generic Error instances", () => {
		const error = new Error("something went wrong");
		expect(formatError(error)).toBe("Unexpected error: something went wrong");
	});

	it("formats non-Error values", () => {
		expect(formatError("oops")).toBe("Unexpected error: oops");
		expect(formatError(42)).toBe("Unexpected error: 42");
	});
});
