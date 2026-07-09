import {
	CHECKOUT_INTENT_DOCUMENT_TYPE,
	CHECKOUT_INTENT_ID_PREFIX,
	STRIPE_ORDER_METADATA_KEYS,
	type CheckoutIntentDocument
} from '@bodega-la-pascuala/contracts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { writeClient } from '$lib/server/sanity/client';
import { RequestError } from '$lib/server/http-error';
import { parseCheckoutPayload } from '$lib/server/orders/checkout-payload';
import { generateOrderNumber, generateOrderPublicId } from '$lib/server/orders/utils';
import { buildCanonicalOrder } from '$lib/server/pricing/catalog';
import { getStripeClientConfig, getTrackingConfig } from '$lib/server/config';
import { createTrackingToken } from '$lib/server/security/tracking-token';
import { validateDeliveryCoverage } from '$lib/server/delivery/radius';
import { getStoreStatus } from '$lib/server/store/status';
import { enforceRateLimit } from '$lib/server/security/rate-limit';

const stripeConfig = getStripeClientConfig();
const trackingConfig = getTrackingConfig();

const stripe = new Stripe(stripeConfig.stripeSecretKey, {
	apiVersion: '2026-01-28.clover'
});

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	try {
		await enforceRateLimit(event, 'create-payment-intent', { limit: 8, windowMs: 60_000 });

		const storeStatus = await getStoreStatus();
		if (!storeStatus.isOpen) {
			throw new RequestError(403, 'store_closed', storeStatus.closedMessage);
		}

		const payload = parseCheckoutPayload(await request.json());
		await validateDeliveryCoverage(payload.delivery);
		const canonicalOrder = await buildCanonicalOrder(payload.items);

		const orderPublicId = generateOrderPublicId();
		const orderNumber = generateOrderNumber();
		const createdAt = new Date().toISOString();
		const checkoutIntentId = `${CHECKOUT_INTENT_ID_PREFIX}${orderPublicId}`;
		const checkoutIntentDocument: CheckoutIntentDocument & { _id: string } = {
			_id: checkoutIntentId,
			_type: CHECKOUT_INTENT_DOCUMENT_TYPE,
			orderPublicId,
			orderNumber,
			customer: payload.customer,
			delivery: payload.delivery,
			items: canonicalOrder.items,
			totalAmount: canonicalOrder.totalAmount,
			notes: payload.notes,
			createdAt
		};

		await writeClient.create(checkoutIntentDocument);

		let paymentIntent: Stripe.PaymentIntent;
		try {
			paymentIntent = await stripe.paymentIntents.create(
				{
					amount: canonicalOrder.totalAmountCents,
					currency: 'eur',
					automatic_payment_methods: {
						enabled: true
					},
					metadata: {
						[STRIPE_ORDER_METADATA_KEYS.orderPublicId]: orderPublicId,
						[STRIPE_ORDER_METADATA_KEYS.checkoutIntentId]: checkoutIntentId,
						[STRIPE_ORDER_METADATA_KEYS.orderNumber]: orderNumber
					}
				},
				{
					idempotencyKey: `order:${orderPublicId}`
				}
			);
		} catch (paymentError) {
			await writeClient.delete(checkoutIntentId).catch(() => null);
			throw paymentError;
		}

		if (!paymentIntent.client_secret) {
			throw new RequestError(500, 'stripe_error', 'Stripe did not return a client secret');
		}

		await writeClient
			.patch(checkoutIntentId)
			.set({
				paymentIntentId: paymentIntent.id
			})
			.commit();

		const expiresAt = Date.now() + trackingConfig.trackingTokenTtlMs;
		const trackingToken = createTrackingToken(
			{
				orderPublicId,
				exp: expiresAt,
				v: 1
			},
			trackingConfig.trackingTokenSecret
		);

		return json({
			clientSecret: paymentIntent.client_secret,
			paymentIntentId: paymentIntent.id,
			orderPublicId,
			trackingToken,
			trackingExpiresAt: new Date(expiresAt).toISOString()
		});
	} catch (error) {
		if (error instanceof RequestError) {
			return json(
				{ error: error.message, code: error.code },
				{ status: error.status, headers: error.headers }
			);
		}

		console.error('Error creating payment intent:', error);
		return json({ error: 'Error processing payment' }, { status: 500 });
	}
};
