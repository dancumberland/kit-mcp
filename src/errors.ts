/**
 * Typed error classes for Kit API errors.
 * Each error includes a recovery hint that agents can act on.
 */

export class KitApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly recovery: string;

	constructor(status: number, code: string, message: string, recovery: string) {
		super(message);
		this.name = "KitApiError";
		this.status = status;
		this.code = code;
		this.recovery = recovery;
	}

	format(): string {
		return `Error ${this.status}: ${this.message}\nRecovery: ${this.recovery}`;
	}
}

export class KitAuthError extends KitApiError {
	constructor(message = "Invalid API key") {
		super(
			401,
			"AUTH_ERROR",
			message,
			"Check your KIT_API_KEY environment variable. Find your key at kit.com → Account Settings → Developer.",
		);
		this.name = "KitAuthError";
	}
}

export class KitRateLimitError extends KitApiError {
	readonly retryAfter: number;

	constructor(retryAfter = 60) {
		super(
			429,
			"RATE_LIMIT",
			"Rate limit exceeded",
			`Wait ${retryAfter} seconds before retrying. Current usage has hit the per-minute cap.`,
		);
		this.name = "KitRateLimitError";
		this.retryAfter = retryAfter;
	}
}

export class KitValidationError extends KitApiError {
	constructor(message: string, recovery?: string) {
		super(
			422,
			"VALIDATION_ERROR",
			message,
			recovery ?? "Check the request parameters and try again.",
		);
		this.name = "KitValidationError";
	}
}

export class KitNotFoundError extends KitApiError {
	constructor(resource: string, identifier: string | number) {
		super(
			404,
			"NOT_FOUND",
			`${resource} not found (${identifier})`,
			`Verify the ${resource.toLowerCase()} ID or identifier is correct.`,
		);
		this.name = "KitNotFoundError";
	}
}

export class KitOAuthRequiredError extends KitApiError {
	constructor(toolName: string) {
		super(
			403,
			"OAUTH_REQUIRED",
			`${toolName} requires OAuth authentication`,
			"Set KIT_OAUTH_TOKEN environment variable. See README for OAuth setup guide.",
		);
		this.name = "KitOAuthRequiredError";
	}
}

export class KitServerError extends KitApiError {
	constructor(status: number) {
		super(
			status,
			"SERVER_ERROR",
			`Kit API server error (${status})`,
			"This is a Kit API issue. Try again in a few minutes.",
		);
		this.name = "KitServerError";
	}
}

export function formatError(error: unknown): string {
	if (error instanceof KitApiError) {
		return error.format();
	}
	if (error instanceof Error) {
		return `Unexpected error: ${error.message}`;
	}
	return `Unexpected error: ${String(error)}`;
}
