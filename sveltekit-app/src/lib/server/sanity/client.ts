import { client } from '$lib/sanity/client';
import { token, writeToken } from '$lib/server/sanity/api';

export const serverClient = client.withConfig({
	token,
	useCdn: false,
	stega: true
});

export const writeClient = client.withConfig({
	token: writeToken,
	useCdn: false,
	stega: false 
});
