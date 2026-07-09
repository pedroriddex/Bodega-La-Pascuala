# Deuda diferida

Elementos detectados y deliberadamente excluidos de esta refactorización porque podrían alterar UX, comportamiento visible u operativa actual.

## Resuelto en el endurecimiento posterior (P1–P3)

- Rate limiting en memoria (intercambiable por Redis) en `create-payment-intent`, `delivery/check` y `confirm-payment`.
- Throttle global a Nominatim (≤1 req/s) para respetar su política y evitar ban de IP.
- Red de seguridad ante webhook no configurado: la página de tracking materializa el pedido desde el `checkoutIntent` si el `PaymentIntent` está `succeeded`.
- Script `cleanup:checkout-intents` para intents huérfanos (seguro: no borra pagos `succeeded`).
- Alertas de cocina reconciliadas contra la BD (capta pedidos `paid` con el Studio cerrado y descarta los ya no-paid, respetando "Oído cocina").
- Guardas de transición de estado en el Studio (solo avance) + confirmación al cancelar.
- ESLint del storefront reparado y enchufado al `lint`. Vision limitado a desarrollo.
- Backfills con `--dry-run` y carga de env robusta; `@sanity/client`/`stripe` declarados en la raíz.
- Tests de materialización idempotente y de reconciliación.

## No incluidos por riesgo funcional

- Fallback de `store/status` que deja la tienda abierta si falla Sanity.
- Operativa de creación manual de `order` en Studio.
- Ajustes del flujo visible de checkout o tracking.

## No incluidos por riesgo visual

- Optimización del bundle de iconos.
- Cambios de copy, jerarquía visual o layout.
- Correcciones menores de UI/locale/fechas que cambien el render visible.

## No incluidos por alcance

- Rediseño del desk del Studio.
- Reorganización de rutas públicas.
- Cambios en payloads o contratos HTTP públicos.
- Cambios en modelos ya consumidos por el storefront: `sandwich`, `drink`, `order`, `storeSettings`.
