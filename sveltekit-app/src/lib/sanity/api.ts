import { env } from '$env/dynamic/public';
import * as staticEnv from '$env/static/public';

export function assertEnvVar<T>(value: T | undefined, name: string): T {
	if (value === undefined) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

// Helper to get env var with fallback
function getEnv(key: string): string | undefined {
	// @ts-ignore
	const val = env[key] || staticEnv[key];
	return val;
}

export const dataset = assertEnvVar(getEnv('PUBLIC_SANITY_DATASET'), 'PUBLIC_SANITY_DATASET');

export const projectId = assertEnvVar(getEnv('PUBLIC_SANITY_PROJECT_ID'), 'PUBLIC_SANITY_PROJECT_ID');

export const apiVersion = getEnv('PUBLIC_SANITY_API_VERSION') || '2024-03-15';

export const studioUrl = getEnv('PUBLIC_SANITY_STUDIO_URL') || 'http://localhost:3333';
