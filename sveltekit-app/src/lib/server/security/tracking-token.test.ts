import { describe, expect, it } from 'vitest';
import { createTrackingToken, verifyTrackingToken } from './tracking-token';

const secret = 'test-secret';

describe('tracking-token', () => {
	it('creates and verifies a valid token', () => {
		const now = Date.now();
		const token = createTrackingToken(
			{
				orderPublicId: 'ord_123',
				exp: now + 60_000,
				v: 1
			},
			secret
		);

		const result = verifyTrackingToken(token, secret, now);
		expect(result).toEqual({ valid: true, orderPublicId: 'ord_123' });
	});

	it('rejects tampered tokens', () => {
		const now = Date.now();
		const token = createTrackingToken(
			{
				orderPublicId: 'ord_123',
				exp: now + 60_000,
				v: 1
			},
			secret
		);

		const tampered = `${token}x`;
		const result = verifyTrackingToken(tampered, secret, now);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('signature');
	});

	it('rejects expired tokens', () => {
		const now = Date.now();
		const token = createTrackingToken(
			{
				orderPublicId: 'ord_123',
				exp: now - 1,
				v: 1
			},
			secret
		);

		const result = verifyTrackingToken(token, secret, now);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('expired');
	});
});
