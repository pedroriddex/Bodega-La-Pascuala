<script lang="ts">
	export let data: {
		notes: string;
	};
</script>

<div class="space-y-6 animate-fade-in">
	<div class="space-y-2">
		<label for="notes" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
			>Notas del pedido (Opcional)</label
		>
		<textarea
			id="notes"
			bind:value={data.notes}
			rows="3"
			class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
			placeholder="¿Alguna alergia? ¿Instrucciones especiales para el repartidor?"
		></textarea>
	</div>

	<div
		class="bg-gradient-to-br from-white to-gray-50 p rounded-2xl border border-gray-100 shadow-sm"
	>
		<div class="flex items-center gap-3 mb-6">
			<div class="h-8 w-1 bg-brand-blue rounded-full"></div>
			<h3 class="font-bold text-gray-900 text-lg">Pago Seguro</h3>
		</div>
		<!-- Stripe Element Container -->
		<div id="payment-element" class="min-h-[200px] bg-white rounded-xl p-1"></div>
	</div>
</div>
