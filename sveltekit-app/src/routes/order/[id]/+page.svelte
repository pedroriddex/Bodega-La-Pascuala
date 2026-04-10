<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	export let data: PageData;

	let order = data.order;
	const trackingToken = data.trackingToken;
	let lastUpdatedAt = order.updatedAt || order.createdAt;
	let refreshTimer: number | undefined;
	let completingOrder = false;
	let completeErrorMessage = '';

	const steps = [
		{ id: 'paid', label: 'Pagado', icon: 'ri-money-euro-circle-line' },
		{ id: 'preparing', label: 'En preparación', icon: 'ri-restaurant-line' },
		{ id: 'shipped', label: 'Enviado', icon: 'ri-truck-line' },
		{ id: 'completed', label: 'Completado', icon: 'ri-check-double-line' }
	];

	const statusMap: Record<string, number> = {
		pending_payment: 0,
		paid: 0,
		preparing: 1,
		shipped: 2,
		completed: 3,
		cancelled: -1
	};

	$: currentStep = statusMap[order.status] ?? 0;

	async function markAsReceived() {
		if (order.status !== 'shipped' || completingOrder) {
			return;
		}

		completingOrder = true;
		completeErrorMessage = '';

		try {
			const response = await fetch(`/api/order/${encodeURIComponent(order.publicId)}/complete`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token: trackingToken })
			});

			const result = (await response.json()) as {
				ok?: boolean;
				status?: string;
				updatedAt?: string;
				error?: string;
			};

			if (!response.ok || !result.ok) {
				throw new Error(result.error || 'No se pudo actualizar el estado del pedido.');
			}

			if (result.status) {
				order = { ...order, status: result.status as typeof order.status };
			}
			if (result.updatedAt) {
				lastUpdatedAt = result.updatedAt;
			}
		} catch (error) {
			console.error('Error completing order from tracking page', error);
			completeErrorMessage =
				error instanceof Error
					? error.message
					: 'No se pudo confirmar la recepción. Inténtalo de nuevo.';
		} finally {
			completingOrder = false;
		}
	}

	async function refreshOrderStatus() {
		try {
			const response = await fetch(
				`/api/order/${encodeURIComponent(order.publicId)}/status?t=${encodeURIComponent(trackingToken)}`,
				{
					headers: {
						'cache-control': 'no-cache'
					}
				}
			);

			if (!response.ok) {
				return;
			}

			const live = (await response.json()) as { status?: string; updatedAt?: string };
			if (live.status && live.status !== order.status) {
				order = { ...order, status: live.status as typeof order.status };
			}

			if (live.updatedAt) {
				lastUpdatedAt = live.updatedAt;
			}
		} catch (error) {
			console.error('Error refreshing order status', error);
		}
	}

	onMount(() => {
		void refreshOrderStatus();
		refreshTimer = window.setInterval(() => {
			void refreshOrderStatus();
		}, 5000);

		const onVisible = () => {
			if (document.visibilityState === 'visible') {
				void refreshOrderStatus();
			}
		};

		document.addEventListener('visibilitychange', onVisible);

		return () => {
			if (refreshTimer) {
				window.clearInterval(refreshTimer);
			}
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4">
	<div class="max-w-3xl mx-auto">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-[#214593] uppercase tracking-tight mb-2">
				Sigue tu Pedido
			</h1>
			<p class="text-gray-500 font-medium">Pedido #{order.orderNumber}</p>
			<p class="text-xs uppercase tracking-wide text-gray-400 mt-2">
				Estado en tiempo real, actualizado el {formatDate(lastUpdatedAt)}
			</p>
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
			{#if order.status === 'cancelled'}
				<div class="text-center p-8 bg-red-50 rounded-xl">
					<i class="ri-close-circle-line text-4xl text-red-500 mb-2"></i>
					<h3 class="text-xl font-bold text-red-700">Pedido Cancelado</h3>
					<p class="text-red-600 mt-2">Este pedido ha sido cancelado.</p>
				</div>
			{:else}
				<div class="relative flex justify-between items-center w-full">
					<div class="absolute top-1/2 left-0 w-full h-2 bg-gray-100 -z-0 rounded-full"></div>
					<div
						class="absolute top-1/2 left-0 h-2 bg-[#214593] -z-0 rounded-full transition-all duration-500"
						style="width: {(currentStep / (steps.length - 1)) * 100}%"
					></div>

					{#each steps as step, i}
						<div class="relative z-10 flex flex-col items-center">
							<div
								class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300
								{i <= currentStep
									? 'bg-[#214593] border-[#214593] text-white shadow-lg scale-110'
									: 'bg-white border-gray-200 text-gray-300'}"
							>
								<i class="{step.icon} text-lg md:text-xl"></i>
							</div>
							<span
								class="absolute top-14 text-xs md:text-sm font-bold uppercase tracking-wide text-center w-32 transition-colors duration-300
								{i <= currentStep ? 'text-[#214593]' : 'text-gray-400'}"
							>
								{step.label}
							</span>
						</div>
					{/each}
				</div>

				{#if order.status === 'pending_payment'}
					<div class="mt-16 text-center">
						<p
							class="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg font-bold"
						>
							<i class="ri-time-line"></i>
							Pago en verificación
						</p>
					</div>
				{:else if order.status === 'completed'}
					<div class="mt-16 text-center">
						<div
							class="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-bold"
						>
							<i class="ri-checkbox-circle-line text-xl"></i>
							Pedido Completado
						</div>
					</div>
				{:else if order.status === 'shipped'}
					<div class="mt-16 text-center">
						<p class="text-sm text-gray-600 mb-4">
							¿Has recibido tu pedido? Confírmalo para cerrar el seguimiento.
						</p>
						<button
							type="button"
							on:click={markAsReceived}
							disabled={completingOrder}
							class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-6 py-3 text-white font-bold shadow-md hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<i class="ri-checkbox-circle-line"></i>
							{completingOrder ? 'Confirmando...' : 'He recibido el pedido'}
						</button>
						{#if completeErrorMessage}
							<p class="mt-3 text-sm text-red-600">{completeErrorMessage}</p>
						{/if}
					</div>
				{:else}
					<div class="mt-16"></div>
				{/if}
			{/if}
		</div>

		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="p-6 border-b border-gray-100 bg-gray-50/50">
				<h3 class="font-bold text-gray-900 uppercase tracking-wide">Detalles del Pedido</h3>
			</div>
			<div class="p-6">
				<div class="space-y-4 mb-6">
					{#each order.items as item}
						<div class="flex justify-between items-center">
							<div class="flex items-center gap-3">
								<div class="bg-gray-100 rounded-lg px-2 py-1 text-sm font-bold text-gray-600">
									x{item.quantity}
								</div>
								<div>
									<p class="font-bold text-[#214593]">{item.name}</p>
									<p class="text-xs text-gray-500 uppercase">
										{item.type === 'half' ? 'Medio' : item.type === 'drink' ? 'Bebida' : 'Entero'}
									</p>
								</div>
							</div>
							<span class="font-bold text-gray-900">{(item.quantity * item.price).toFixed(2)}€</span
							>
						</div>
					{/each}
				</div>

				<div class="border-t border-gray-100 pt-4 flex justify-between items-center">
					<span class="text-lg font-bold text-gray-800">Total Pagado</span>
					<span class="text-2xl font-bold text-[#FABE40]">{order.totalAmount.toFixed(2)}€</span>
				</div>

				<div class="mt-6 pt-6 border-t border-gray-100 grid md:grid-cols-2 gap-6 text-sm">
					<div>
						<p class="font-bold text-gray-900 mb-1">Cliente</p>
						<p class="text-gray-600">{order.customerName}</p>
					</div>
					<div>
						<p class="font-bold text-gray-900 mb-1">Entrega</p>
						<p class="text-gray-600">
							{order.deliveryMethod === 'pickup' ? 'Recogida en local' : 'Domicilio'}
						</p>
						{#if order.deliveryMethod === 'delivery' && order.deliveryCity}
							<p class="text-gray-600">Ciudad: {order.deliveryCity}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="mt-8 text-center">
			<a href="/" class="text-[#214593] font-bold hover:underline">Volver a la Carta</a>
		</div>
	</div>
</div>
