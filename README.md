# Bodega La Pascuala

Monorepo de producción con tres piezas principales:

- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/sveltekit-app` — storefront, checkout Stripe y tracking público
- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio` — backoffice en Sanity Studio
- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/scripts` — scripts operativos y backfills

## Estándar del repo

- Gestor oficial: **npm**
- Node recomendado: **20+**
- npm mínimo: **10+**
- Comando único de salud: `npm run check`

## Instalación

```bash
npm install
```

## Variables de entorno

### Storefront (`/Users/pedrojose/Trabajo/Bodega-La-Pascuala/sveltekit-app/.env`)

Variables públicas:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `PUBLIC_SANITY_API_VERSION`
- `PUBLIC_SANITY_STUDIO_URL`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`

Variables privadas:

- `SANITY_API_READ_TOKEN`
- `SANITY_API_WRITE_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TRACKING_TOKEN_SECRET`

### Studio (`/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/.env`)

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`
- `SANITY_STUDIO_PREVIEW_URL`
- `SANITY_STUDIO_STUDIO_HOST`

## Desarrollo local

```bash
npm run dev
```

Servicios esperados:

- Storefront: `http://localhost:5173`
- Studio: `http://localhost:3333`

## Flujo real de checkout y pedido

1. El checkout llama `POST /api/create-payment-intent`.
2. El backend valida payload, cobertura de entrega y recalcula precios desde Sanity.
3. Se crea un documento temporal `checkoutIntent` en Sanity.
4. Se crea el `PaymentIntent` en Stripe con metadata canónica del pedido.
5. El pedido final `order` se materializa por dos vías idempotentes:
   - `POST /api/orders/confirm-payment`
   - `POST /api/stripe/webhook`
6. Al materializarse, el `checkoutIntent` se elimina.
7. El tracking público usa `/order/:publicId?t=<token firmado>`.

> `checkoutIntent` es un contrato interno entre storefront y Studio. Está modelado en schemas pero oculto del desk visible.

## Calidad y verificación

Checks por workspace:

```bash
npm run lint --workspace=sveltekit-app
npm run typecheck --workspace=sveltekit-app
npm run test --workspace=sveltekit-app
npm run build --workspace=sveltekit-app
npm run lint --workspace=studio
npm run typecheck --workspace=studio
npm run build --workspace=studio
```

Healthcheck unificado:

```bash
npm run check
```

`npm run check` carga los `.env` reales de los workspaces si existen y, para validación local, completa variables faltantes con placeholders seguros solo para lint/typecheck/test/build. No sustituye la configuración real de desarrollo o producción.

## Scripts operativos

Backfills y utilidades disponibles desde raíz:

```bash
npm run import:bocadillos
npm run backfill:order-item-keys
npm run backfill:order-public-id
npm run cleanup:checkout-intents
```

Los scripts comparten bootstrap de entorno y conexión Sanity desde `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/scripts/lib`. Cargan los `.env`/`.env.local` reales del workspace (sin placeholders) resueltos por raíz del repo, así que funcionan desde cualquier directorio.

Los backfills aceptan `--dry-run` para simular sin escribir:

```bash
npm run backfill:order-item-keys -- --dry-run
npm run backfill:order-public-id -- --dry-run
```

### Limpieza de checkout intents huérfanos

`cleanup:checkout-intents` elimina documentos `checkoutIntent` antiguos que quedaron sin materializar (pagos abandonados). Antes de borrar, verifica el estado del `PaymentIntent` en Stripe y **nunca** borra uno cuyo pago fue `succeeded/processing` (lo marca para revisión manual), evitando perder un pedido pagado no materializado.

```bash
npm run cleanup:checkout-intents -- --dry-run
npm run cleanup:checkout-intents -- --max-age-hours=48
```

Recomendado ejecutarlo periódicamente (p. ej. un cron diario en Vercel).

## Estructura de contratos internos

Contrato compartido del monorepo:

- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/packages/contracts`

Centraliza:

- estados de pedido
- tipos de línea de pedido
- shape de `checkoutIntent`
- claves de metadata de Stripe
- matriz de variables de entorno del repo

## Webhook de Stripe

Configurar en Stripe:

- Endpoint: `https://<tu-dominio>/api/stripe/webhook`
- Eventos:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`

Guardar el signing secret en `STRIPE_WEBHOOK_SECRET`.

## Deuda diferida explícita

La refactorización actual **no** toca cambios visibles o funcionales. La deuda diferida está documentada en:

- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/docs/deferred-debt.md`
