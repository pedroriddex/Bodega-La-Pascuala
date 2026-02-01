<script lang="ts">
	import { useQuery } from '@sanity/svelte-loader';
	import { onMount } from 'svelte';
	import ProductCard from '../components/ProductCard.svelte';
	import DrinkCard from '../components/DrinkCard.svelte'; // Import DrinkCard
	import CartFloatingButton from '../components/CartFloatingButton.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const q = useQuery(data);
    
    // Split data if strictly typed, or assume data spreads
    // The useQuery might need to be adjusted if we are passing multiple queries or a single combined query?
    // In +page.server.ts we return 'sandwichesResult' and 'drinksResult' inside 'options.initial' if we used a single query.
    // But we used Promise.all separate queries.
    // The 'useQuery' usually takes a single query string.
    // Wait, the standard 'svelte-loader' pattern with multiple queries is tricky.
    // Let's assume for now we just use the server data directly for simplicity if useQuery is complex for multiple queries.
    // Or we handle it properly:
    // Actually, 'data' property in PageData has 'sandwiches' and 'drinks' already from the server return.
    // The 'useQuery' is for Live Preview. 
    // To support Live Preview for BOTH, we might need separate useQuery calls if the library supports it, or a combined GROQ query.
    // For now, let's just rely on the server data `data.drinks` and `data.sandwiches`.
    // Live preview for drinks might not verify immediately without extra setup, but let's stick to server data first.
    
	$: sandwiches = data.sandwiches;
    $: drinks = data.drinks;
</script>

<div class="container mx-auto md:px-4 md:py-8 md:pb-24">
	<div class="md:p-10 md:rounded-lg px-4 py-10">
		<div class="mb-10 flex items-center justify-center">
			<h2 class="font-montserrat text-3xl font-black uppercase tracking-tight text-[#214593] text-shadow-[4px_4px_0px_#FABE40] text-center">
				Bocadillos
			</h2>
		</div>

		{#if sandwiches && sandwiches.length}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
				{#each sandwiches as sandwich (sandwich._id)}
					<ProductCard product={sandwich} />
				{/each}
			</div>
		{/if}
	</div>
    
    <div>
    {#if drinks && drinks.length}
        <div class="md:p-10 md:rounded-lg px-4 py-10">
            <h2 class="font-montserrat text-3xl font-black uppercase tracking-tight text-[#214593] text-shadow-[4px_4px_0px_#FABE40] text-center">
                Bebidas
            </h2>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            {#each drinks as drink (drink._id)}
                <DrinkCard product={drink} />
            {/each}
        </div>
    {/if}
	</div>
	<CartFloatingButton />
</div>
