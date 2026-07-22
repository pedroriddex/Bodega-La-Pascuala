import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of two secrets received as plain strings.
 * Returns false when either side is missing so callers can't be tricked by an
 * unconfigured secret matching an empty header.
 */
export function matchesSharedSecret(
	provided: string | null | undefined,
	expected: string | null | undefined
): boolean {
	if (!provided || !expected) {
		return false;
	}

	const providedBuffer = Buffer.from(provided);
	const expectedBuffer = Buffer.from(expected);

	if (providedBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return timingSafeEqual(providedBuffer, expectedBuffer);
}
