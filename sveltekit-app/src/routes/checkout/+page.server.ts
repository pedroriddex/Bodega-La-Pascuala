
import { drinksQuery } from '$lib/sanity/queries';
import type { Drink } from '$lib/types/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { loadQuery } = event.locals;
	
    // We only need drinks for the cross-sell, not sandwiches (those are in the cart store)
    // But wait, if we want to confirm prices or stock from server, we might want sandwiches too.
    // For now, adhering to instruction: "show drinks... as cross-sell"
	const drinksResult = await loadQuery<Drink[]>(drinksQuery);

	return {
		drinks: drinksResult?.data ?? []
	};
};
