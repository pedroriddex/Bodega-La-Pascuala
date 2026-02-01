import { env } from '$env/dynamic/private';

export const token = env.SANITY_API_READ_TOKEN;
export const writeToken = env.SANITY_API_WRITE_TOKEN;
