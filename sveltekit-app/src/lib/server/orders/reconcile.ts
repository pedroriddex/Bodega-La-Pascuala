import Stripe from 'stripe';
import { getStripeClientConfig } from '$lib/server/config';
import {
	findCheckoutIntent,
	findOrder,
	upsertPaidOrderFromCheckoutIntent
} from '$lib/server/orders/payment-materialization';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
	if (!stripeClient) {
		stripeClient = new Stripe(getStripeClientConfig().stripeSecretKey, {
			apiVersion: '2026-01-28.clover'
		});
	}
	return stripeClient;
}

/**
 * Safety net for the window where an order should exist but doesn't yet — a
 * misconfigured or delayed Stripe webhook, a transient failure, or a client
 * `confirm-payment` call that never completed. If a checkout intent for this
 * public id carries a PaymentIntent that Stripe reports as succeeded, promote it
 * to a paid order via the same idempotent materialization path the webhook uses.
 *
 * Callers must have already authenticated the request (e.g. a valid tracking
 * token) since this triggers a Stripe lookup and a potential write.
 *
 * @returns true when a paid order exists (or was just created) for the id.
 */
export async function reconcilePaidOrder(orderPublicId: string): Promise<boolean> {
	const existing = await findOrder('', orderPublicId);
	if (existing) {
		return true;
	}

	const checkoutIntent = await findCheckoutIntent({ orderPublicId });
	if (!checkoutIntent?.paymentIntentId) {
		return false;
	}

	let paymentIntent: Stripe.PaymentIntent;
	try {
		paymentIntent = await getStripe().paymentIntents.retrieve(checkoutIntent.paymentIntentId);
	} catch (error) {
		console.error('Reconcile: failed to retrieve PaymentIntent', error);
		return false;
	}

	if (paymentIntent.status !== 'succeeded') {
		return false;
	}

	await upsertPaidOrderFromCheckoutIntent(checkoutIntent, paymentIntent.id);
	return true;
}
