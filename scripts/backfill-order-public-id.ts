import { randomBytes } from 'node:crypto';
import { createClient } from '@sanity/client';

function requireValue(name: string, value: string | undefined): string {
	if (!value || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function generatePublicId() {
	return `ord_${randomBytes(8).toString('hex')}`;
}

const projectId = requireValue(
	'PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID',
	process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID
);
const dataset = requireValue(
	'PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET',
	process.env.PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET
);
const token = requireValue('SANITY_API_WRITE_TOKEN', process.env.SANITY_API_WRITE_TOKEN);

const client = createClient({
	projectId,
	dataset,
	apiVersion: '2024-03-15',
	token,
	useCdn: false
});

const query = '*[_type == "order" && !defined(publicId)]{_id, orderNumber}';

async function run() {
	const orders = await client.fetch<Array<{ _id: string; orderNumber?: string }>>(query);
	if (orders.length === 0) {
		console.log('No orders require backfill.');
		return;
	}

	console.log(`Backfilling publicId for ${orders.length} order(s)...`);

	for (const order of orders) {
		const publicId = generatePublicId();
		await client.patch(order._id).set({ publicId }).commit();
		console.log(`Updated ${order._id} (${order.orderNumber || 'no-order-number'}) -> ${publicId}`);
	}

	console.log('Backfill completed.');
}

run().catch((error) => {
	console.error('Backfill failed:', error);
	process.exitCode = 1;
});
