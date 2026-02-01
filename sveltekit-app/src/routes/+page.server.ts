import { sandwichesQuery, drinksQuery } from '$lib/sanity/queries';
import type { Sandwich, Drink } from '$lib/types/sanity';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { loadQuery } = event.locals;
	
	const [sandwichesResult, drinksResult] = await Promise.all([
		loadQuery<Sandwich[]>(sandwichesQuery),
		loadQuery<Drink[]>(drinksQuery)
	]);

	return {
		sandwichesQuery,
		drinksQuery,
		sandwiches: sandwichesResult?.data ?? [],
		drinks: drinksResult?.data ?? [],
		options: { 
			initial: sandwichesResult // Retain for preview mode compatibility if needed
		}
	};
};
