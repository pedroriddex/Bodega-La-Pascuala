import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { writeClient } from '$lib/server/sanity/client';
import { RequestError } from '$lib/server/http-error';
import { parseCheckoutPayload } from '$lib/server/orders/checkout-payload';
import { generateOrderNumber, generateOrderPublicId } from '$lib/server/orders/utils';
import { buildCanonicalOrder } from '$lib/server/pricing/catalog';
import { getStripeConfig, getTrackingConfig } from '$lib/server/config';
import { createTrackingToken } from '$lib/server/security/tracking-token';
import { validateDeliveryCoverage } from '$lib/server/delivery/radius';
import { getStoreStatus } from '$lib/server/store/status';

const stripeConfig = getStripeConfig();
const trackingConfig = getTrackingConfig();

const stripe = new Stripe(stripeConfig.stripeSecretKey, {
	apiVersion: '2026-01-28.clover'
});

export const POST: RequestHandler = async ({ request }) => {
	try {
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
		const checkoutIntentId = `checkoutIntent-${orderPublicId}`;

		await writeClient.create({
			_id: checkoutIntentId,
			_type: 'checkoutIntent',
			orderPublicId,
			orderNumber,
			customer: payload.customer,
			delivery: payload.delivery,
			items: canonicalOrder.items,
			totalAmount: canonicalOrder.totalAmount,
			notes: payload.notes,
			createdAt
		});

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
						orderPublicId,
						checkoutIntentId,
						orderNumber
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
			return json({ error: error.message, code: error.code }, { status: error.status });
		}

		console.error('Error creating payment intent:', error);
		return json({ error: 'Error processing payment' }, { status: 500 });
	}
};
