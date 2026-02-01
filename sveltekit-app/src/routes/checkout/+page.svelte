<script lang="ts">
	import { cart, cartTotal } from '$lib/stores/cart';
	import { checkout } from '$lib/stores/checkout';
	import { slide, fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import CheckoutItemCard from '../../components/CheckoutItemCard.svelte';
	import Steps from '../../components/checkout/Steps.svelte';
	import Step1Personal from '../../components/checkout/Step1Personal.svelte';
	import Step2Delivery from '../../components/checkout/Step2Delivery.svelte';
	import Step3Payment from '../../components/checkout/Step3Payment.svelte';
	import InfoSummary from '../../components/checkout/InfoSummary.svelte';
	import DrinkCard from '../../components/DrinkCard.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Hardcoded public key as requested by user in chat history context (though usually via env)
	// For implementing this, I will use the one provided in .env via import if possible, or string literal if needed.
	// Since $env/static/public needs config, I'll use the literal key provided by user for reliability in this session.
	const PUBLIC_STRIPE_KEY =
		'pk_test_51SfhucK6FKLyZ50mxUujwnnTFngGmiwTibWWsc9aw02Pt23Wv9lv5z3tmBFfReO6Iy3G3oeurjkl8xZXUalRJR9c00PkXI1dqS';

	let step = 0; // 0: Summary, 1: Personal, 2: Delivery, 3: Payment

	// Using auto-subscription syntax for better readability in template
	// But for logic we might want to access values directly or just use $checkout

	// Stripe Variables
	let stripe: any = null;
	let elements: any = null;
	let clientSecret: string | null = null;
	let loading = false;
	let errorMessage = '';

	onMount(async () => {
		stripe = await loadStripe(PUBLIC_STRIPE_KEY);
		checkout.loadFromStorage();
	});

	// Auto-persist on change
	$: checkout.persist($checkout);

	function isPersonalComplete() {
		return (
			$checkout.firstName.trim() !== '' &&
			$checkout.lastName.trim() !== '' &&
			$checkout.email.trim() !== '' &&
			$checkout.phone.trim() !== ''
		);
	}

	function isDeliveryComplete() {
		if ($checkout.method === 'pickup') return true;
		return (
			$checkout.address.trim() !== '' && $checkout.city.trim() !== '' && $checkout.zip.trim() !== ''
		);
	}

	function startCheckout() {
		// Smart Skipping Logic
		if (isPersonalComplete() && $checkout.saveInfo) {
			if (isDeliveryComplete() && $checkout.saveAddress) {
				// Skip to Payment
				step = 3;
				initializePayment();
			} else {
				// Skip to Delivery
				step = 2;
			}
		} else {
			// No skip
			step = 1;
		}

		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function nextStep() {
		step += 1;
		window.scrollTo({ top: 0, behavior: 'smooth' });

		// If moving to payment step, initialize Stripe Elements
		if (step === 3) {
			initializePayment();
		}
	}

	function prevStep() {
		step -= 1;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function initializePayment() {
		if (!stripe) return;
		loading = true;

		// Calculate amount in cents
		const amount = Math.round($cartTotal * 100);

		try {
			const res = await fetch('/api/create-payment-intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			const result = await res.json();
			clientSecret = result.clientSecret;

			if (clientSecret) {
				const appearance = {
					theme: 'stripe',
					variables: {
						colorPrimary: '#214593',
						colorBackground: '#ffffff',
						colorText: '#30313d',
						colorDanger: '#df1b41'
					}
				};
				elements = stripe.elements({ appearance, clientSecret });
				const paymentElement = elements.create('payment');
				paymentElement.mount('#payment-element');
			}
		} catch (err) {
			console.error(err);
			errorMessage = 'Ocurrió un error al cargar el pago.';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!stripe || !elements) return;

		loading = true;
		errorMessage = '';

		const { error, paymentIntent } = await stripe.confirmPayment({
			elements,
			redirect: 'if_required' // We handle the redirect manually after order creation
		});

		if (error) {
			// Check specific error types
			if (error.type === 'card_error' || error.type === 'validation_error') {
				errorMessage = error.message || 'Error en el pago';
			} else {
				errorMessage = 'Un error inesperado ocurrió.';
			}
			loading = false;
		} else if (paymentIntent && paymentIntent.status === 'succeeded') {
			// Payment Successful -> Create Order
			try {
				const orderData = {
					customer: {
						firstName: $checkout.firstName,
						lastName: $checkout.lastName,
						email: $checkout.email,
						phone: $checkout.phone
					},
					delivery: {
						method: $checkout.method,
						address: $checkout.address,
						city: $checkout.city,
						zip: $checkout.zip
					},
					items: $cart.map((item) => ({
						name: item.title,
						quantity: item.quantity,
						price: item.price,
						type: item.type,
						total: item.price * item.quantity
					})),
					totalAmount: $cartTotal,
					stripePaymentId: paymentIntent.id
				};

				const res = await fetch('/api/create-order', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(orderData)
				});

				if (res.ok) {
					// Success -> Redirect
					window.location.href = '/success';
				} else {
					errorMessage =
						'El pago se realizó, pero hubo un error creando el pedido. Contacte con nosotros.';
					loading = false;
				}
			} catch (e) {
				console.error(e);
				errorMessage = 'Error de conexión creando el pedido.';
				loading = false;
			}
		} else {
			loading = false;
		}
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

								<button
									on:click={startCheckout}
									class="w-full rounded-xl bg-[#214593] py-4 text-center text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
								>
									Continuar con el pedido
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
								on:edit={() => {
									step = 1;
									window.scrollTo({ top: 0, behavior: 'smooth' });
								}}
							/>

							<Step2Delivery bind:data={$checkout} />
							<button
								on:click={nextStep}
								class="w-full mt-8 rounded-xl bg-[#214593] py-4 text-center text-lg font-bold text-white shadow-lg"
							>
								Continuar al Pago
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
									on:edit={() => {
										step = 1;
										window.scrollTo({ top: 0, behavior: 'smooth' });
									}}
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
									on:edit={() => {
										step = 2;
										window.scrollTo({ top: 0, behavior: 'smooth' });
									}}
								/>
							</div>

							<Step3Payment bind:data={$checkout} />

							{#if errorMessage}
								<div class="text-red-600 bg-red-50 p-3 rounded-lg text-sm mt-4">
									{errorMessage}
								</div>
							{/if}

							<div class="mt-8 border-t border-gray-100 pt-6">
								<div class="flex items-center justify-between mb-6">
									<span class="text-xl font-bold text-gray-800">Total a Pagar</span>
									<span class="text-2xl font-bold text-[#214593]">{$cartTotal.toFixed(2)}€</span>
								</div>
								<button
									on:click={handleSubmit}
									disabled={loading || !stripe || !elements}
									class="w-full rounded-xl bg-[#FABE40] py-4 text-center text-lg font-bold text-[#214593] shadow-lg hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? 'Procesando...' : 'Pagar y Finalizar'}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Cross-sell Bebidas (Fuera del carrito, step 0) -->
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
