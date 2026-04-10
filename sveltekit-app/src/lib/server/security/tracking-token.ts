import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TrackingTokenPayload {
	orderPublicId: string;
	exp: number;
	v: 1;
}

export interface TrackingTokenVerification {
	valid: boolean;
	orderPublicId?: string;
	reason?: 'format' | 'signature' | 'expired' | 'payload';
}

function encodeBase64Url(value: string): string {
	return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
	return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string, secret: string): string {
	return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createTrackingToken(payload: TrackingTokenPayload, secret: string): string {
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const signature = sign(encodedPayload, secret);
	return `${encodedPayload}.${signature}`;
}

export function verifyTrackingToken(
	token: string,
	secret: string,
	now = Date.now()
): TrackingTokenVerification {
	const [encodedPayload, signature] = token.split('.');

	if (!encodedPayload || !signature) {
		return { valid: false, reason: 'format' };
	}

	const expectedSignature = sign(encodedPayload, secret);
	if (!safeEqual(signature, expectedSignature)) {
		return { valid: false, reason: 'signature' };
	}

	let payload: TrackingTokenPayload;
	try {
		payload = JSON.parse(decodeBase64Url(encodedPayload));
	} catch {
		return { valid: false, reason: 'payload' };
	}

	if (
		typeof payload !== 'object' ||
		payload === null ||
		typeof payload.orderPublicId !== 'string' ||
		typeof payload.exp !== 'number' ||
		payload.v !== 1
	) {
		return { valid: false, reason: 'payload' };
	}

	if (payload.exp <= now) {
		return { valid: false, reason: 'expired' };
	}

	return { valid: true, orderPublicId: payload.orderPublicId };
}
