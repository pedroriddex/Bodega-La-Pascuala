import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import type { SanityImage } from '$lib/types/sanity';
import { client } from './client';

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource | SanityImage) {
	return builder.image(source as SanityImageSource);
}
