<script lang="ts">
	import { cartTotal, cartCount } from '$lib/stores/cart';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
</script>

{#if $cartCount > 0}
	<div
		class="fixed bottom-0 z-50 w-full px-3 pb-3 md:bottom-5 md:right-5 md:left-auto md:w-auto md:p-0"
		transition:fly={{ y: 24, duration: 300, easing: cubicOut }}
	>
		<a
			href="/checkout"
			class="group flex items-center justify-between gap-4 rounded-2xl bg-brand-blue px-4 py-3.5 text-white no-underline shadow-2xl ring-1 ring-white/10 transition-all duration-300 hover:brightness-110 md:rounded-full md:px-5"
		>
			<span class="flex items-center gap-3">
				<span class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
					<i class="ri-shopping-basket-2-fill text-xl"></i>
					<span
						class="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-yellow px-1 text-xs font-extrabold text-brand-blue"
					>
						{$cartCount}
					</span>
				</span>
				<span class="text-base font-extrabold uppercase tracking-wide md:text-lg">Hacer pedido</span
				>
			</span>
			<span class="rounded-full bg-white px-4 py-1.5 font-extrabold text-brand-blue shadow-sm">
				{$cartTotal.toFixed(2)}€
			</span>
		</a>
	</div>
{/if}
