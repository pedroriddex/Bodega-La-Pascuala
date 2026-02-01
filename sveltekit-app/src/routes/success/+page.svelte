<script>
    import { onMount } from 'svelte';
    import { cart } from '$lib/stores/cart';
    import { fade, scale } from 'svelte/transition';

    onMount(() => {
        // Clear cart after successful order
        cart.clear();
    });
</script>

<div class="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
    <div in:scale class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <i class="ri-check-line text-5xl text-green-600"></i>
    </div>
    
    <h1 in:fade={{ delay: 200 }} class="text-3xl font-bold text-[#214593] mb-4">¡Pedido Confirmado!</h1>
    
    <p in:fade={{ delay: 400 }} class="text-gray-600 max-w-md mx-auto text-lg mb-8">
        Muchas gracias por tu compra. Hemos recibido tu pedido correctamente y ya estamos preparándolo con mucho cariño.
    </p>

    <div in:fade={{ delay: 600 }} class="flex gap-4">
        <a 
            href="/" 
            class="px-8 py-4 bg-[#FABE40] text-[#214593] font-bold rounded-xl shadow-lg hover:brightness-105 transition-all"
        >
            Volver a la Carta
        </a>
    </div>
</div>
