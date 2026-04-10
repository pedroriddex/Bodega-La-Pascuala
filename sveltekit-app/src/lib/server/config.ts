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

interface StripeConfig {
	stripeSecretKey: string;
	stripeWebhookSecret: string;
}

interface TrackingConfig {
	trackingTokenSecret: string;
	trackingTokenTtlMs: number;
}

let sanityCache: SanityConfig | null = null;
let stripeCache: StripeConfig | null = null;
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

export function getStripeConfig(): StripeConfig {
	if (!stripeCache) {
		stripeCache = {
			stripeSecretKey: requireEnv('STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY),
			stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET)
		};
	}

	return stripeCache;
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
