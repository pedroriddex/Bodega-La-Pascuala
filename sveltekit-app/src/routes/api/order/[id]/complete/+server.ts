import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeClient } from '$lib/server/sanity/client';
import { getTrackingConfig } from '$lib/server/config';
import { verifyTrackingToken } from '$lib/server/security/tracking-token';
import type { OrderStatus } from '$lib/types/order';

interface StoredOrder {
	_id: string;
	status: OrderStatus;
	updatedAt: string;
}

const orderQuery = `*[_type == "order" && publicId == $publicId][0]{
  _id,
  status,
  "updatedAt": _updatedAt
}`;

const trackingConfig = getTrackingConfig();

function notFound(): never {
	throw error(404, 'Pedido no encontrado');
}

export const POST: RequestHandler = async ({ params, request }) => {
	const body = (await request.json().catch(() => ({}))) as { token?: string };
	const trackingToken = typeof body.token === 'string' ? body.token : '';

	if (!trackingToken) {
		notFound();
	}

	const verification = verifyTrackingToken(trackingToken, trackingConfig.trackingTokenSecret);
	if (!verification.valid || verification.orderPublicId !== params.id) {
		notFound();
	}

	const order = await writeClient.fetch<StoredOrder | null>(orderQuery, {
		publicId: params.id
	});
	if (!order) {
		notFound();
	}

	if (order.status === 'completed') {
		return json({ ok: true, status: 'completed', updatedAt: order.updatedAt });
	}

	if (order.status !== 'shipped') {
		return json(
			{
				ok: false,
				code: 'invalid_transition',
				error: 'El pedido todavía no está en estado enviado.'
			},
			{ status: 409 }
		);
	}

	await writeClient.patch(order._id).set({ status: 'completed' }).commit();

	const updatedOrder = await writeClient.fetch<StoredOrder | null>(orderQuery, {
		publicId: params.id
	});

	return json({
		ok: true,
		status: updatedOrder?.status ?? 'completed',
		updatedAt: updatedOrder?.updatedAt ?? new Date().toISOString()
	});
};
