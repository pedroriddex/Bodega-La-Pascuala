<script lang="ts">
	import { onMount } from 'svelte';
	import ProductCard from '../components/ProductCard.svelte';
	import DrinkCard from '../components/DrinkCard.svelte';
	import CartControl from '../components/CartControl.svelte';
	import CartFloatingButton from '../components/CartFloatingButton.svelte';
	import { getFavoriteProducts, type FavoriteProduct } from '$lib/client/favorite-orders';
	import type { Drink, Sandwich } from '$lib/types/sanity';
	import type { PageData } from './$types';

	export let data: PageData;

	$: sandwiches = data.sandwiches;
	$: drinks = data.drinks;

	type FavoriteEntry = {
		id: string;
		title: string;
		count: number;
		kind: 'sandwich' | 'drink';
		sandwich?: Sandwich;
		drink?: Drink;
	};

	let favoriteProducts: FavoriteProduct[] = [];

	onMount(() => {
		favoriteProducts = getFavoriteProducts(6);
	});

	$: favoriteEntries = favoriteProducts
		.map<FavoriteEntry | null>((favorite) => {
			const matchingSandwich = sandwiches.find((sandwich) => sandwich._id === favorite.id);
			if (matchingSandwich) {
				return {
					id: favorite.id,
					title: matchingSandwich.title || favorite.title,
					count: favorite.count,
					kind: 'sandwich',
					sandwich: matchingSandwich
				};
			}

			const matchingDrink = drinks.find((drink) => drink._id === favorite.id);
			if (matchingDrink) {
				return {
					id: favorite.id,
					title: matchingDrink.title || favorite.title,
					count: favorite.count,
					kind: 'drink',
					drink: matchingDrink
				};
			}

			return null;
		})
		.filter((entry): entry is FavoriteEntry => entry !== null);
</script>

<div class="container mx-auto md:px-4 md:py-8 md:pb-24">
	{#if favoriteEntries.length > 0}
		<section class="md:rounded-lg border border-[#f1ddac] bg-[#fff8e8] px-4 py-8 md:p-10">
			<div class="mb-6 flex items-center justify-center gap-3">
				<i class="ri-heart-3-fill text-xl text-[#214593]"></i>
				<h2 class="font-montserrat text-3xl font-black uppercase tracking-tight text-[#214593] text-center">
					Lo que te gusta
				</h2>
			</div>
			<p class="mb-6 text-center text-sm text-[#214593]/80">
				Tus productos más repetidos para pedirlos de nuevo en un toque.
			</p>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each favoriteEntries as favorite (favorite.id)}
					<article class="rounded-xl border border-[#214593]/10 bg-white p-4 shadow-sm">
						<p class="text-xs font-bold uppercase tracking-wide text-[#214593]/70">
							{favorite.kind === 'drink' ? 'Bebida favorita' : 'Bocadillo favorito'}
						</p>
						<h3 class="mt-1 text-lg font-bold uppercase text-[#214593]">{favorite.title}</h3>
						<p class="mt-1 text-sm text-gray-600">Lo has pedido {favorite.count} veces</p>

						{#if favorite.kind === 'sandwich' && favorite.sandwich?.pricing}
							<div class="mt-4 flex flex-wrap gap-2">
								{#if favorite.sandwich.pricing.halfSize}
									<CartControl
										id={favorite.sandwich._id}
										title={favorite.sandwich.title || favorite.title}
										price={favorite.sandwich.pricing.halfSize ?? 0}
										type="half"
									/>
								{/if}
								{#if favorite.sandwich.pricing.fullSize}
									<CartControl
										id={favorite.sandwich._id}
										title={favorite.sandwich.title || favorite.title}
										price={favorite.sandwich.pricing.fullSize ?? 0}
										type="full"
									/>
								{/if}
							</div>
						{:else if favorite.kind === 'drink' && favorite.drink}
							<div class="mt-4">
								<CartControl
									id={favorite.drink._id}
									title={favorite.drink.title || favorite.title}
									price={favorite.drink.price ?? 0}
									type="drink"
								/>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}

	<div class="md:p-10 md:rounded-lg px-4 py-10">
		<div class="mb-10 flex items-center justify-center">
			<h2
				class="font-montserrat text-3xl font-black uppercase tracking-tight text-[#214593] text-shadow-[4px_4px_0px_#FABE40] text-center"
			>
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
				<h2
					class="mb-10 font-montserrat text-3xl font-black uppercase tracking-tight text-[#214593] text-shadow-[4px_4px_0px_#FABE40] text-center"
				>
					Bebidas
				</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
					{#each drinks as drink (drink._id)}
						<DrinkCard product={drink} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
	<CartFloatingButton />
</div>
