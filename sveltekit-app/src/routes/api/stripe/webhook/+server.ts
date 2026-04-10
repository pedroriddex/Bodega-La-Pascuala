import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { writeClient } from '$lib/server/sanity/client';
import { getStripeConfig } from '$lib/server/config';
import {
	applyPaymentEventToOrder,
	findCheckoutIntent,
	findOrder,
	upsertPaidOrderFromCheckoutIntent
} from '$lib/server/orders/payment-materialization';
import type { PaymentIntentEventType } from '$lib/server/orders/utils';

const stripeConfig = getStripeConfig();

const stripe = new Stripe(stripeConfig.stripeSecretKey, {
	apiVersion: '2026-01-28.clover'
});

const handledEvents = new Set<PaymentIntentEventType>([
	'payment_intent.succeeded',
	'payment_intent.payment_failed',
	'payment_intent.canceled'
]);

export const POST: RequestHandler = async ({ request }) => {
	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ error: 'Missing stripe-signature header' }, { status: 400 });
	}

	const payload = await request.text();

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(payload, signature, stripeConfig.stripeWebhookSecret);
	} catch (error) {
		console.error('Invalid Stripe webhook signature:', error);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	if (!handledEvents.has(event.type as PaymentIntentEventType)) {
		return json({ received: true, ignored: true });
	}

	const paymentIntent = event.data.object as Stripe.PaymentIntent;
	const orderPublicId =
		typeof paymentIntent.metadata?.orderPublicId === 'string'
			? paymentIntent.metadata.orderPublicId
			: undefined;
	const checkoutIntentId =
		typeof paymentIntent.metadata?.checkoutIntentId === 'string'
			? paymentIntent.metadata.checkoutIntentId
			: undefined;
	const eventType = event.type as PaymentIntentEventType;

	try {
		const order = await findOrder(paymentIntent.id, orderPublicId);
		if (order) {
			await applyPaymentEventToOrder(order, paymentIntent.id, eventType);
			return json({ received: true });
		}

		if (eventType === 'payment_intent.succeeded') {
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
