import { serverClient } from '$lib/server/sanity/client';
import { storeSettingsQuery } from '$lib/sanity/queries';
import type { StoreSettings } from '$lib/types/sanity';

export const DEFAULT_STORE_CLOSED_MESSAGE =
	'Ahora mismo estamos cerrados. Vuelve en nuestro horario habitual para realizar tu pedido.';

export interface StoreStatus {
	isOpen: boolean;
	closedMessage: string;
}

function normalizeClosedMessage(value: string | undefined): string {
	const message = value?.trim();
	if (!message) {
		return DEFAULT_STORE_CLOSED_MESSAGE;
	}
	return message;
}

export async function getStoreStatus(): Promise<StoreStatus> {
	const settings = await serverClient
		.fetch<StoreSettings | null>(storeSettingsQuery)
		.catch(() => null);

	return {
		isOpen: settings?.isOpen ?? true,
		closedMessage: normalizeClosedMessage(settings?.closedMessage)
	};
}
