<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import type { CartItem } from '$lib/stores/cart';

	export let item: CartItem;

	function increment() {
		cart.addItem({
			id: item.id,
			type: item.type,
			title: item.title,
			price: item.price
		});
	}

	function decrement() {
		cart.removeItem(item.id, item.type);
	}
</script>

<div
	class="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-gray-50/50"
>
	<div class="flex flex-col">
		<span class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
			{item.type === 'half' ? 'Media' : 'Entero'}
		</span>
		<h3 class="font-bold text-gray-900 text-lg leading-tight mb-2">{item.title}</h3>

		<div
			class="flex flex-row items-center rounded-full border border-gray-200 bg-white shadow-sm h-8 self-start"
		>
			<button
				class="flex h-8 w-8 items-center justify-center rounded-l-full text-brand-blue hover:bg-gray-100 active:bg-gray-200 transition-colors"
				on:click|preventDefault={decrement}
				aria-label="Disminuir cantidad"
			>
				-
			</button>
			<span
				class="flex h-8 min-w-[2rem] items-center justify-center text-sm font-bold text-brand-blue border-x border-gray-100"
			>
				{item.quantity}
			</span>
			<button
				class="flex h-8 w-8 items-center justify-center rounded-r-full text-brand-blue hover:bg-gray-100 active:bg-gray-200 transition-colors"
				on:click|preventDefault={increment}
				aria-label="Aumentar cantidad"
			>
				+
			</button>
		</div>
	</div>

	<div class="flex flex-col items-end justify-center self-center h-full">
		<span class="font-bold text-xl text-brand-blue">
			{(item.quantity * item.price).toFixed(2)}€
		</span>
		<span class="text-xs text-gray-400 font-medium">
			{item.price}€ / ud
		</span>
	</div>
</div>
