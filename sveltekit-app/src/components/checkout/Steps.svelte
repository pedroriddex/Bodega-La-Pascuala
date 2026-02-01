<script lang="ts">
	export let currentStep: number;
	const steps = ['Datos', 'Envío', 'Pago'];
</script>

<div class="flex items-center justify-between mb-8 relative">
	<!-- Connecting Line -->
	<div class="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full">
		<div
			class="h-full bg-brand-blue transition-all duration-300 rounded-full"
			style="width: {(currentStep / (steps.length - 1)) * 100}%"
		></div>
	</div>

	{#each steps as step, i}
		<div class="flex flex-col items-center gap-2 bg-white px-2">
			<div
				class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                {i <= currentStep
					? 'border-brand-blue bg-brand-blue text-white'
					: 'border-gray-200 bg-white text-gray-400'}"
			>
				{i + 1}
			</div>
			<span
				class="text-xs font-bold uppercase tracking-wider transition-colors duration-300
                {i <= currentStep ? 'text-brand-blue' : 'text-gray-400'}"
			>
				{step}
			</span>
		</div>
	{/each}
</div>
