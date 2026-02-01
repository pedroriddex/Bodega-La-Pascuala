import { json } from '@sveltejs/kit';
import { writeClient } from '$lib/server/sanity/client';
import { writeToken } from '$lib/server/sanity/api'; // Import the token directly
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
        if (!writeToken) {
            console.error('SANITY_API_WRITE_TOKEN is missing in server environment');
            return json({ error: 'Server configuration error: Missing write token' }, { status: 500 });
        }

        if (!writeClient) {
            return json({ error: 'Sanity write client not configured' }, { status: 500 });
        }

		const body = await request.json();
		const { customer, delivery, items, totalAmount, stripePaymentId } = body;

        // Generate a simple Order Number (e.g., #LP-timestamp or random)
        const orderNumber = `#LP-${Date.now().toString().slice(-6)}`;

		const doc = {
			_type: 'order',
            orderNumber,
			customer,
			delivery,
			items,
			totalAmount,
            stripePaymentId,
			status: 'paid', // Assuming we call this after successful payment
            createdAt: new Date().toISOString()
		};

		const result = await writeClient.create(doc);

		return json({ success: true, orderId: result._id });
	} catch (error) {
		console.error('Error creating order:', error);
		return json({ error: 'Error creating order' }, { status: 500 });
	}
};
