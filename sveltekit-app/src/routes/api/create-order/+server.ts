import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	return json(
		{
			error: 'Deprecated endpoint. Use /api/create-payment-intent to start checkout.'
		},
		{ status: 410 }
	);
};
