import type { RequestEvent } from '@sveltejs/kit';
import { RequestError } from '$lib/server/http-error';

export interface RateLimitOptions {
	/** Maximum number of requests allowed within the window. */
	limit: number;
	/** Length of the rolling window in milliseconds. */
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	/** Seconds the caller should wait before retrying (0 when allowed). */
	retryAfterSeconds: number;
}

/**
 * Pluggable backend for rate limiting. The default implementation keeps counters
 * in process memory; swapping this for a Redis/Upstash-backed store makes the
 * limit shared across serverless instances without touching call sites.
 */
export interface RateLimitStore {
	hit(
		key: string,
		options: RateLimitOptions,
		now: number
	): RateLimitResult | Promise<RateLimitResult>;
}

/**
 * In-memory sliding-window log. Accurate within a single instance and bounded in
 * memory (at most `limit` timestamps per key). In serverless this is best-effort:
 * each instance keeps its own counters, so it mitigates abuse rather than
 * enforcing a hard global ceiling. Replace with a shared store for that.
 */
export class InMemorySlidingWindowStore implements RateLimitStore {
	private readonly buckets = new Map<string, number[]>();
	private lastSweep = 0;

	hit(key: string, { limit, windowMs }: RateLimitOptions, now: number): RateLimitResult {
		this.maybeSweep(now, windowMs);

		const windowStart = now - windowMs;
		const timestamps = (this.buckets.get(key) ?? []).filter((ts) => ts > windowStart);

		if (timestamps.length >= limit) {
			this.buckets.set(key, timestamps);
			const retryAfterMs = timestamps[0] + windowMs - now;
			return {
				allowed: false,
				limit,
				remaining: 0,
				retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
			};
		}

		timestamps.push(now);
		this.buckets.set(key, timestamps);
		return {
			allowed: true,
			limit,
			remaining: limit - timestamps.length,
			retryAfterSeconds: 0
		};
	}

	/** Drop keys whose activity has fully aged out so memory can't grow unbounded. */
	private maybeSweep(now: number, windowMs: number): void {
		if (now - this.lastSweep < windowMs) {
			return;
		}
		this.lastSweep = now;

		const windowStart = now - windowMs;
		for (const [key, timestamps] of this.buckets) {
			const alive = timestamps.filter((ts) => ts > windowStart);
			if (alive.length === 0) {
				this.buckets.delete(key);
			} else {
				this.buckets.set(key, alive);
			}
		}
	}
}

const defaultStore: RateLimitStore = new InMemorySlidingWindowStore();

function resolveClientKey(event: RequestEvent, name: string): string {
	let ip = 'unknown';
	try {
		ip = event.getClientAddress();
	} catch {
		ip = 'unknown';
	}
	return `${name}:${ip}`;
}

/**
 * Enforce a per-client rate limit for the given bucket `name`. Throws a 429
 * `RequestError` carrying a `Retry-After` header when the limit is exceeded, so
 * the existing `RequestError` catch blocks surface it correctly.
 */
export async function enforceRateLimit(
	event: RequestEvent,
	name: string,
	options: RateLimitOptions,
	store: RateLimitStore = defaultStore
): Promise<void> {
	const result = await store.hit(resolveClientKey(event, name), options, Date.now());
	if (!result.allowed) {
		throw new RequestError(
			429,
			'rate_limited',
			'Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.',
			{ 'retry-after': String(result.retryAfterSeconds) }
		);
	}
}
