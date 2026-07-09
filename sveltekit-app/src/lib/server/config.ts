import { env } from '$env/dynamic/private';

function requireEnv(name: string, value: string | undefined): string {
	if (!value || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

interface SanityConfig {
	sanityReadToken?: string;
	sanityWriteToken: string;
}

interface StripeClientConfig {
	stripeSecretKey: string;
}

interface StripeWebhookConfig {
	stripeWebhookSecret: string;
}

interface TrackingConfig {
	trackingTokenSecret: string;
	trackingTokenTtlMs: number;
}

let sanityCache: SanityConfig | null = null;
let stripeClientCache: StripeClientConfig | null = null;
let stripeWebhookCache: StripeWebhookConfig | null = null;
let trackingCache: TrackingConfig | null = null;

export function getSanityConfig(): SanityConfig {
	if (!sanityCache) {
		sanityCache = {
			sanityReadToken: env.SANITY_API_READ_TOKEN?.trim() || undefined,
			sanityWriteToken: requireEnv('SANITY_API_WRITE_TOKEN', env.SANITY_API_WRITE_TOKEN)
		};
	}

	return sanityCache;
}

export function getStripeClientConfig(): StripeClientConfig {
	if (!stripeClientCache) {
		stripeClientCache = {
			stripeSecretKey: requireEnv('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY)
		};
	}

	return stripeClientCache;
}

export function getStripeWebhookConfig(): StripeWebhookConfig {
	if (!stripeWebhookCache) {
		stripeWebhookCache = {
			stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET)
		};
	}

	return stripeWebhookCache;
}

export function getTrackingConfig(): TrackingConfig {
	if (!trackingCache) {
		trackingCache = {
			trackingTokenSecret: requireEnv('TRACKING_TOKEN_SECRET', env.TRACKING_TOKEN_SECRET),
			trackingTokenTtlMs: 7 * 24 * 60 * 60 * 1000
		};
	}

	return trackingCache;
}
