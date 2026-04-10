# SvelteKit App (Storefront)

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Endpoints clave

- `POST /api/create-payment-intent`
- `POST /api/stripe/webhook`
- `GET /order/[publicId]?t=<token>`

## Seguridad implementada

- Cálculo de precios en servidor (no se confía en montos del cliente)
- Tracking con token firmado HMAC (TTL 7 días)
- Actualización de estados vía webhook/admin, sin endpoint público de mutación
- Respuesta 404 genérica para tracking inválido o sin token
