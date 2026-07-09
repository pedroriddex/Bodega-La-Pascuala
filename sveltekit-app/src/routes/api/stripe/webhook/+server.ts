import {
	PAYMENT_INTENT_EVENT,
	STRIPE_ORDER_METADATA_KEYS,
	type PaymentIntentEventType
} from '@bodega-la-pascuala/contracts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { writeClient } from '$lib/server/sanity/client';
import { getStripeClientConfig, getStripeWebhookConfig } from '$lib/server/config';
import {
	applyPaymentEventToOrder,
	findCheckoutIntent,
	findOrder,
	upsertPaidOrderFromCheckoutIntent
} from '$lib/server/orders/payment-materialization';

const stripeConfig = getStripeClientConfig();

const stripe = new Stripe(stripeConfig.stripeSecretKey, {
	apiVersion: '2026-01-28.clover'
});

const handledEvents = new Set<PaymentIntentEventType>([
	PAYMENT_INTENT_EVENT.succeeded,
	PAYMENT_INTENT_EVENT.paymentFailed,
	PAYMENT_INTENT_EVENT.canceled
]);

export const POST: RequestHandler = async ({ request }) => {
	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ error: 'Missing stripe-signature header' }, { status: 400 });
	}

	const payload = await request.text();
	let stripeWebhookSecret: string;
	try {
		stripeWebhookSecret = getStripeWebhookConfig().stripeWebhookSecret;
	} catch (error) {
		console.error('Missing Stripe webhook configuration:', error);
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
	} catch (error) {
		console.error('Invalid Stripe webhook signature:', error);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	if (!handledEvents.has(event.type as PaymentIntentEventType)) {
		return json({ received: true, ignored: true });
	}

	const paymentIntent = event.data.object as Stripe.PaymentIntent;
	const orderPublicId =
		typeof paymentIntent.metadata?.[STRIPE_ORDER_METADATA_KEYS.orderPublicId] === 'string'
			? paymentIntent.metadata[STRIPE_ORDER_METADATA_KEYS.orderPublicId]
			: undefined;
	const checkoutIntentId =
		typeof paymentIntent.metadata?.[STRIPE_ORDER_METADATA_KEYS.checkoutIntentId] === 'string'
			? paymentIntent.metadata[STRIPE_ORDER_METADATA_KEYS.checkoutIntentId]
			: undefined;
	const eventType = event.type as PaymentIntentEventType;

	try {
		const order = await findOrder(paymentIntent.id, orderPublicId);
		if (order) {
			await applyPaymentEventToOrder(order, paymentIntent.id, eventType);
			return json({ received: true });
		}

		if (eventType === PAYMENT_INTENT_EVENT.succeeded) {
			const checkoutIntent = await findCheckoutIntent({
				checkoutIntentId,
				orderPublicId,
				paymentIntentId: paymentIntent.id
			});
			if (!checkoutIntent) {
				return json({ received: true, ignored: true, reason: 'checkout_intent_not_found' });
			}

			await upsertPaidOrderFromCheckoutIntent(checkoutIntent, paymentIntent.id);
			return json({ received: true });
		}

		const checkoutIntent = await findCheckoutIntent({
			checkoutIntentId,
			orderPublicId,
			paymentIntentId: paymentIntent.id
		});
		if (checkoutIntent) {
			await writeClient.delete(checkoutIntent._id).catch(() => null);
		}

		return json({ received: true, ignored: true, reason: 'order_not_found' });
	} catch (error) {
		console.error('Error handling Stripe webhook:', error);
		return json({ error: 'Webhook processing failed' }, { status: 500 });
	}
};
