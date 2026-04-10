<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { cart, cartTotal } from '$lib/stores/cart';
	import { checkout } from '$lib/stores/checkout';
	import { slide, fade } from 'svelte/transition';
	import { onMount, onDestroy, tick } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
	import CheckoutItemCard from '../../components/CheckoutItemCard.svelte';
	import Steps from '../../components/checkout/Steps.svelte';
	import Step1Personal from '../../components/checkout/Step1Personal.svelte';
	import Step2Delivery from '../../components/checkout/Step2Delivery.svelte';
	import Step3Payment from '../../components/checkout/Step3Payment.svelte';
	import InfoSummary from '../../components/checkout/InfoSummary.svelte';
	import DrinkCard from '../../components/DrinkCard.svelte';
	import { DELIVERY_MAX_DISTANCE_KM } from '$lib/config/delivery';
	import type { CreatePaymentIntentRequest } from '$lib/types/order';
	import { trackCompletedOrder } from '$lib/client/favorite-orders';
	import type { PageData } from './$types';

	export let data: PageData;
	const storeIsOpen = data.storeStatus?.isOpen ?? true;
	const storeClosedMessage =
		data.storeStatus?.closedMessage ??
		'Ahora mismo estamos cerrados. Vuelve en nuestro horario habitual para realizar tu pedido.';

	let step = 0;
	let stripe: Stripe | null = null;
	let elements: StripeElements | null = null;
	let paymentElement: StripePaymentElement | null = null;
	let clientSecret: string | null = null;
	let paymentIntentId: string | null = null;
	let orderPublicId: string | null = null;
	let trackingToken: string | null = null;
	let loading = false;
	let errorMessage = '';
	let checkingDeliveryCoverage = false;
	let deliveryDistanceKm: number | null = null;
	let lastDeliveryValidationKey: string | null = null;
	let checkoutStorageReady = false;

	onMount(async () => {
		const publishableKey = env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

		if (!publishableKey) {
			errorMessage = 'Falta la configuración de pago (PUBLIC_STRIPE_PUBLISHABLE_KEY).';
			return;
		}

		checkout.loadFromStorage();
		checkoutStorageReady = true;
		stripe = await loadStripe(publishableKey);
	});

	onDestroy(() => {
		paymentElement?.destroy();
	});

	$: if (checkoutStorageReady) checkout.persist($checkout);

	function resetPaymentSession() {
		paymentElement?.destroy();
		paymentElement = null;
		elements = null;
		clientSecret = null;
		paymentIntentId = null;
		orderPublicId = null;
		trackingToken = null;
	}

	function validatePersonal(): string | null {
		if ($checkout.firstName.trim().length === 0) return 'Introduce tu nombre.';
		if ($checkout.lastName.trim().length === 0) return 'Introduce tus apellidos.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($checkout.email.trim())) {
			return 'Introduce un email válido.';
		}
		if ($checkout.phone.trim().length < 6) return 'Introduce un teléfono válido.';
		return null;
	}

	function validateDeliveryFields(): string | null {
		if ($checkout.method === 'pickup') return null;
		if ($checkout.address.trim().length === 0) return 'Introduce la dirección de entrega.';
		if ($checkout.city.trim().length === 0) return 'Introduce la ciudad.';
		if ($checkout.zip.trim().length === 0) return 'Introduce el código postal.';
		return null;
	}

	function buildDeliveryValidationKey(): string {
		if ($checkout.method === 'pickup') {
			return 'pickup';
		}

		return [
			$checkout.address.trim().toLowerCase(),
			$checkout.city.trim().toLowerCase(),
			$checkout.zip.trim().toLowerCase()
		].join('|');
	}

	async function validateDeliveryCoverage(): Promise<string | null> {
		if ($checkout.method === 'pickup') {
			deliveryDistanceKm = null;
			lastDeliveryValidationKey = 'pickup';
			return null;
		}

		const deliveryKey = buildDeliveryValidationKey();
		if (deliveryKey === lastDeliveryValidationKey && deliveryDistanceKm !== null) {
			return null;
		}

		checkingDeliveryCoverage = true;

		try {
			const res = await fetch('/api/delivery/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					address: $checkout.address.trim(),
					city: $checkout.city.trim(),
					zip: $checkout.zip.trim()
				})
			});

			const result = (await res.json()) as {
				valid?: boolean;
				error?: string;
				distanceKm?: number;
			};

			if (!res.ok || !result.valid) {
				deliveryDistanceKm = null;
				lastDeliveryValidationKey = null;
				return (
					result.error ??
					`Solo realizamos entregas a un máximo de ${DELIVERY_MAX_DISTANCE_KM} km del local.`
				);
			}

			deliveryDistanceKm =
				typeof result.distanceKm === 'number'
					? Number(result.distanceKm.toFixed(2))
					: deliveryDistanceKm;
			lastDeliveryValidationKey = deliveryKey;
			return null;
		} catch (error) {
			console.error('Error checking delivery coverage', error);
			deliveryDistanceKm = null;
			lastDeliveryValidationKey = null;
			return 'No se pudo validar la cobertura de envío. Inténtalo de nuevo.';
		} finally {
			checkingDeliveryCoverage = false;
		}
	}

	$: {
		const currentKey = buildDeliveryValidationKey();
		if (currentKey !== lastDeliveryValidationKey) {
			deliveryDistanceKm = null;
		}
	}

	function createRequestPayload(): CreatePaymentIntentRequest {
		return {
			items: $cart.map((item) => ({
				id: item.id,
				type: item.type,
				quantity: item.quantity
			})),
			customer: {
				firstName: $checkout.firstName.trim(),
				lastName: $checkout.lastName.trim(),
				email: $checkout.email.trim(),
				phone: $checkout.phone.trim()
			},
			delivery:
				$checkout.method === 'pickup'
					? { method: 'pickup' }
					: {
							method: 'delivery',
							address: $checkout.address.trim(),
							city: $checkout.city.trim(),
							zip: $checkout.zip.trim()
						},
			notes: $checkout.notes.trim()
		};
	}

	async function getBestNextStepFromSavedData(): Promise<number> {
		const personalError = validatePersonal();
		if (personalError) {
			return 1;
		}

		const deliveryError = validateDeliveryFields();
		if (deliveryError) {
			return 2;
		}

		const coverageError = await validateDeliveryCoverage();
		if (coverageError) {
			errorMessage = coverageError;
			return 2;
		}

		return 3;
	}

	async function startCheckout() {
		if (!storeIsOpen) {
			errorMessage = storeClosedMessage;
			return;
		}

		errorMessage = '';
		if (checkoutStorageReady) {
			checkout.persist($checkout);
		}
		const targetStep = await getBestNextStepFromSavedData();
		await goToStep(targetStep);
	}

	async function goToStep(targetStep: number) {
		if (step === 3 && targetStep < 3) {
			resetPaymentSession();
		}

		step = targetStep;
		errorMessage = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });

		if (step === 3) {
			await tick();
			await initializePayment();
		}
	}

	async function nextStep() {
		if (!storeIsOpen) {
			errorMessage = storeClosedMessage;
			return;
		}

		if (step === 1) {
			const personalError = validatePersonal();
			if (personalError) {
				errorMessage = personalError;
				return;
			}
		}

		if (step === 2) {
			const deliveryError = validateDeliveryFields();
			if (deliveryError) {
				errorMessage = deliveryError;
				return;
			}

			const coverageError = await validateDeliveryCoverage();
			if (coverageError) {
				errorMessage = coverageError;
				return;
			}
		}

		errorMessage = '';
		if (checkoutStorageReady) {
			checkout.persist($checkout);
		}
		await goToStep(step + 1);
	}

	async function prevStep() {
		if (step === 0) return;
		await goToStep(step - 1);
	}

	async function initializePayment() {
		if (!stripe || clientSecret || $cart.length === 0) return;
		if (!storeIsOpen) {
			errorMessage = storeClosedMessage;
			return;
		}

		const personalError = validatePersonal();
		if (personalError) {
			errorMessage = personalError;
			return;
		}

		const deliveryError = validateDeliveryFields();
		if (deliveryError) {
			errorMessage = deliveryError;
			return;
		}

		const coverageError = await validateDeliveryCoverage();
		if (coverageError) {
			errorMessage = coverageError;
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const res = await fetch('/api/create-payment-intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createRequestPayload())
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(result?.error || 'No se pudo inicializar el pago.');
			}

			clientSecret = result.clientSecret;
			paymentIntentId = result.paymentIntentId;
			orderPublicId = result.orderPublicId;
			trackingToken = result.trackingToken;

			if (!clientSecret || !orderPublicId || !trackingToken) {
				throw new Error('La pasarela no devolvió todos los datos del pedido.');
			}

			paymentElement?.destroy();
			const appearance = {
				theme: 'stripe' as const,
				variables: {
					colorPrimary: '#214593',
					colorBackground: '#ffffff',
					colorText: '#30313d',
					colorDanger: '#df1b41'
				}
			};

			elements = stripe.elements({ appearance, clientSecret });
			paymentElement = elements.create('payment');
			paymentElement.mount('#payment-element');
		} catch (error) {
			console.error(error);
			errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al cargar el pago.';
			resetPaymentSession();
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!storeIsOpen) {
			errorMessage = storeClosedMessage;
			return;
		}

		if (!stripe || !elements || !orderPublicId || !trackingToken) {
			errorMessage = 'No se pudo preparar el pago. Recarga la página e inténtalo de nuevo.';
			return;
		}

		loading = true;
		errorMessage = '';

		const { error, paymentIntent } = await stripe.confirmPayment({
			elements,
			redirect: 'if_required'
		});

		if (error) {
			errorMessage =
				error.type === 'card_error' || error.type === 'validation_error'
					? error.message || 'Error en el pago'
					: 'Un error inesperado ocurrió durante el pago.';
			loading = false;
			return;
		}

		if (
			paymentIntent &&
			['succeeded', 'processing', 'requires_capture'].includes(paymentIntent.status)
		) {
			trackCompletedOrder($cart);

			if (paymentIntent.status === 'succeeded') {
				try {
					await fetch('/api/orders/confirm-payment', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ paymentIntentId: paymentIntent.id })
					});
				} catch (syncError) {
					console.error('Error syncing paid order:', syncError);
				}
			}

			window.location.href = `/success?orderPublicId=${encodeURIComponent(orderPublicId)}&t=${encodeURIComponent(trackingToken)}`;
			return;
		}

		loading = false;
		errorMessage =
			'El pago no pudo confirmarse todavía. Por favor, revisa el estado e inténtalo nuevamente.';
	}
</script>

<div class="container mx-auto px-0 py-0 pb-32 max-w-2xl">
	<header class="mb-8 flex items-center gap-4 px-4 mt-4">
		{#if step === 0}
			<a
				href="/"
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
				aria-label="Volver"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						fill-rule="evenodd"
						d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
		{:else}
			<button
				on:click={prevStep}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors z-50 relative"
				aria-label="Volver"
				type="button"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="w-5 h-5"
				>
					<path
						fill-rule="evenodd"
						d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}

		<h1 class="font-montserrat text-2xl font-bold uppercase tracking-tight text-[#214593]">
			{step === 0 ? 'Confirmar Pedido' : 'Finalizar Compra'}
		</h1>
	</header>

	{#if step > 0}
		<div>
			<Steps currentStep={step - 1} />
		</div>
	{/if}

	{#if errorMessage && step < 3}
		<div class="mx-4 mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{errorMessage}</div>
	{/if}

	{#if $cart.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500 mb-4">No tienes productos en el carrito.</p>
			<a href="/" class="text-[#214593] font-bold hover:underline">Volver a la carta</a>
		</div>
	{:else}
		<div class="rounded-2xl border border-gray-100 bg-white p-6 min-h-[400px]">
			{#key step}
				<div in:fade={{ duration: 300 }}>
					{#if step === 0}
						<div>
							<div class="space-y-4 mb-8">
								{#each $cart as item (item.id + item.type)}
									<div transition:slide|local>
										<CheckoutItemCard {item} />
									</div>
								{/each}
							</div>

							<div class="border-t border-gray-200 pt-6">
								<div class="flex items-center justify-between mb-8">
									<span class="text-xl font-bold text-gray-800">Total</span>
									<span class="text-2xl font-bold text-[#214593]">{$cartTotal.toFixed(2)}€</span>
								</div>
								{#if !storeIsOpen}
									<div
										class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
									>
										{storeClosedMessage}
									</div>
								{/if}

								<button
									on:click={startCheckout}
									disabled={!storeIsOpen}
									class="w-full rounded-xl bg-[#214593] py-4 text-center text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
									type="button"
								>
									{storeIsOpen ? 'Continuar con el pedido' : 'Tienda cerrada'}
								</button>
							</div>
						</div>
					{:else if step === 1}
						<div>
							<h2 class="text-xl font-bold text-gray-900 mb-6">Datos Personales</h2>
							<Step1Personal bind:data={$checkout} />
							<button
								on:click={nextStep}
								class="w-full mt-8 rounded-xl bg-[#214593] py-4 text-center text-lg font-bold text-white shadow-lg"
								type="button"
							>
								Continuar
							</button>
						</div>
					{:else if step === 2}
						<div>
							<h2 class="text-xl font-bold text-gray-900 mb-6">Método de Entrega</h2>

							<InfoSummary
								title="Datos Personales"
								content={[
									{ label: 'Nombre', value: `${$checkout.firstName} ${$checkout.lastName}` },
									{ label: 'Email', value: $checkout.email },
									{ label: 'Teléfono', value: $checkout.phone }
								]}
								on:edit={() => goToStep(1)}
							/>

							<Step2Delivery
								bind:data={$checkout}
								checkingDistance={checkingDeliveryCoverage}
								distanceKm={deliveryDistanceKm}
							/>
							<button
								on:click={nextStep}
								disabled={checkingDeliveryCoverage || !storeIsOpen}
								class="w-full mt-8 rounded-xl bg-[#214593] py-4 text-center text-lg font-bold text-white shadow-lg"
								type="button"
							>
								{#if !storeIsOpen}
									Tienda cerrada
								{:else if checkingDeliveryCoverage}
									Validando cobertura...
								{:else}
									Continuar al Pago
								{/if}
							</button>
						</div>
					{:else if step === 3}
						<div>
							<h2 class="text-xl font-bold text-gray-900 mb-6">Pago y Notas</h2>

							<div class="space-y-4 mb-6">
								<InfoSummary
									title="Datos Personales"
									content={[
										{ label: 'Nombre', value: `${$checkout.firstName} ${$checkout.lastName}` },
										{ label: 'Email', value: $checkout.email },
										{ label: 'Teléfono', value: $checkout.phone }
									]}
									on:edit={() => goToStep(1)}
								/>

								<InfoSummary
									title="Entrega"
									content={[
										{
											label: 'Método',
											value:
												$checkout.method === 'pickup' ? 'Recogida en Local' : 'Envío a Domicilio'
										},
										...($checkout.method === 'delivery'
											? [
													{ label: 'Dirección', value: $checkout.address },
													{ label: 'Ciudad', value: `${$checkout.city} (${$checkout.zip})` }
												]
											: [])
									]}
									on:edit={() => goToStep(2)}
								/>
							</div>

							<Step3Payment bind:data={$checkout} />

							{#if errorMessage}
								<div class="text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">{errorMessage}</div>
							{/if}

							<div class="mt-8 border-t border-gray-100 pt-6">
								<div class="flex items-center justify-between mb-6">
									<span class="text-xl font-bold text-gray-800">Total a Pagar</span>
									<span class="text-2xl font-bold text-[#214593]">{$cartTotal.toFixed(2)}€</span>
								</div>
								<button
									on:click={handleSubmit}
									disabled={loading || !stripe || !elements || !paymentIntentId || !storeIsOpen}
									class="w-full rounded-xl bg-[#FABE40] py-4 text-center text-lg font-bold text-[#214593] shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									{#if !storeIsOpen}
										Tienda cerrada
									{:else if loading}
										Procesando...
									{:else}
										Pagar y Finalizar
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		{#if step === 0 && data.drinks && data.drinks.length > 0}
			<div class="mt-8">
				<h3 class="text-lg font-bold text-gray-800 mb-4 px-2">¿Quieres añadir algo de beber?</h3>
				<div class="flex gap-4 overflow-x-auto pb-4 snap-x px-2">
					{#each data.drinks as drink (drink._id)}
						<div
							class="min-w-[280px] snap-center bg-white rounded-xl shadow-sm border border-gray-100 p-2"
						>
							<DrinkCard product={drink} />
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
