# Bodega La Pascuala

Monorepo con:

- `sveltekit-app`: storefront y checkout con Stripe
- `studio`: backoffice de contenido y gestión de pedidos (Sanity Studio)

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

## Variables de entorno

Configura `sveltekit-app/.env` a partir de `sveltekit-app/.env.example`.

Variables clave:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `SANITY_API_READ_TOKEN`
- `SANITY_API_WRITE_TOKEN`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TRACKING_TOKEN_SECRET`

## Desarrollo

```bash
npm run dev
```

- Storefront: `http://localhost:5173`
- Studio: `http://localhost:3333`

## Flujo de pagos y pedidos

1. El checkout llama `POST /api/create-payment-intent` con items y datos del cliente.
2. El backend recalcula precio canónico desde Sanity y crea un pedido `pending_payment`.
3. Stripe confirma el pago y envía webhook a `POST /api/stripe/webhook`.
4. El webhook mueve el pedido a `paid` de forma idempotente.
5. El cliente accede al tracking con URL firmada: `/order/:publicId?t=<token>`.

## Configurar webhook de Stripe

En Stripe Dashboard (staging/producción):

- Endpoint: `https://<tu-dominio>/api/stripe/webhook`
- Eventos:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
- Copia el signing secret en `STRIPE_WEBHOOK_SECRET`

## Calidad

```bash
npm run lint --workspace=sveltekit-app
npm run test --workspace=sveltekit-app
npm run build --workspace=sveltekit-app
npm run build --workspace=studio
```

## Backfill de `publicId` en pedidos antiguos

Script:

- `scripts/backfill-order-public-id.ts`

Necesita en entorno:

- `SANITY_API_WRITE_TOKEN`
- `PUBLIC_SANITY_PROJECT_ID` o `SANITY_STUDIO_PROJECT_ID`
- `PUBLIC_SANITY_DATASET` o `SANITY_STUDIO_DATASET`
