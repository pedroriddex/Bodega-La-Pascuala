import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { RequestError } from '$lib/server/http-error';
import { getStripeConfig } from '$lib/server/config';
import {
	findCheckoutIntent,
	findOrder,
	upsertPaidOrderFromCheckoutIntent
} from '$lib/server/orders/payment-materialization';

const stripeConfig = getStripeConfig();

const stripe = new Stripe(stripeConfig.stripeSecretKey, {
	apiVersion: '2026-01-28.clover'
});

function readString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new RequestError(400, 'invalid_payload', `${path} must be a non-empty string`);
	}

	return value.trim();
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const paymentIntentId = readString(body.paymentIntentId, 'paymentIntentId');

		const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
		const orderPublicId =
			typeof paymentIntent.metadata?.orderPublicId === 'string'
				? paymentIntent.metadata.orderPublicId
				: undefined;
		const checkoutIntentId =
			typeof paymentIntent.metadata?.checkoutIntentId === 'string'
				? paymentIntent.metadata.checkoutIntentId
				: undefined;

		if (paymentIntent.status !== 'succeeded') {
			throw new RequestError(409, 'payment_not_succeeded', 'El pago todavía no se ha confirmado.');
		}

		const order = await findOrder(paymentIntent.id, orderPublicId);
		if (order) {
			return json({ ok: true, orderAlreadyExists: true });
		}

		const checkoutIntent = await findCheckoutIntent({
			checkoutIntentId,
			orderPublicId,
			paymentIntentId: paymentIntent.id
		});
		if (!checkoutIntent) {
			throw new RequestError(
				404,
				'checkout_intent_not_found',
				'No se encontró el pedido temporal.'
			);
		}

		await upsertPaidOrderFromCheckoutIntent(checkoutIntent, paymentIntent.id);

		return json({ ok: true, orderAlreadyExists: false });
	} catch (error) {
		if (error instanceof RequestError) {
			return json({ error: error.message, code: error.code }, { status: error.status });
		}

		console.error('Error confirming payment intent:', error);
		return json({ error: 'Error confirming payment' }, { status: 500 });
	}
};
