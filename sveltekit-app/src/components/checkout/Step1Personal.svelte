<script lang="ts">
	export let data: {
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
		saveInfo: boolean;
	};
</script>

<div class="space-y-6 animate-fade-in">
	<div class="space-y-2">
		<label for="firstName" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
			>Nombre</label
		>
		<input
			type="text"
			id="firstName"
			bind:value={data.firstName}
			class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
			placeholder="Tu nombre"
		/>
	</div>
	<div class="space-y-2">
		<label for="lastName" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
			>Apellidos</label
		>
		<input
			type="text"
			id="lastName"
			bind:value={data.lastName}
			class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
			placeholder="Tus apellidos"
		/>
	</div>

	<div class="space-y-2">
		<label for="email" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
			>Email</label
		>
		<input
			type="email"
			id="email"
			bind:value={data.email}
			class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
			placeholder="tu@email.com"
		/>
	</div>

	<div class="space-y-2">
		<label for="phone" class="block text-sm font-bold text-gray-700 tracking-wide uppercase"
			>Teléfono</label
		>
		<input
			type="tel"
			id="phone"
			bind:value={data.phone}
			class="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:bg-white transition-all shadow-sm"
			placeholder="600 000 000"
		/>
	</div>

	<div class="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
		<input
			type="checkbox"
			id="saveInfo"
			bind:checked={data.saveInfo}
			class="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
		/>
		<label for="saveInfo" class="text-sm font-medium text-gray-600 cursor-pointer select-none">
			Guardar mis datos en este dispositivo para futuras compras
		</label>
	</div>
</div>
