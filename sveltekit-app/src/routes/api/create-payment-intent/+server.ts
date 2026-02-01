import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16' // Using latest stable version, adjust if needed
});

export async function POST({ request }) {
	try {
		const { amount, currency = 'eur' } = await request.json();

		const paymentIntent = await stripe.paymentIntents.create({
			amount, // Amount in cents
			currency,
			automatic_payment_methods: {
				enabled: true
			}
		});

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (error) {
		console.error('Stripe error:', error);
		return json({ error: 'Error processing payment' }, { status: 500 });
	}
}
