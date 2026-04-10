import { getSanityConfig } from '$lib/server/config';

const sanityConfig = getSanityConfig();

export const token = sanityConfig.sanityReadToken;
export const writeToken = sanityConfig.sanityWriteToken;
