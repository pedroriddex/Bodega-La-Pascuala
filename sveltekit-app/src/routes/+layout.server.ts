import type { LayoutServerLoad } from './$types';
import { getStoreStatus } from '$lib/server/store/status';

export const load = (async (event) => {
	// The `event.locals.preview` value received here is set by the helper function
	// in `hooks.server.ts`. It indicates whether the app is in preview mode or not.
	const { preview } = event.locals;
	const storeStatus = await getStoreStatus();
	// As `event.locals` is only available on the server, we can expose the value
	// to the client by returning it here.
	return { preview, storeStatus };
}) satisfies LayoutServerLoad;
