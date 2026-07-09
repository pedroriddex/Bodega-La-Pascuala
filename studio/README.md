# Bodega La Pascuala Studio

Workspace de Sanity Studio para operación y contenido.

## Rol dentro del monorepo

- gestiona `storeSettings`, catálogo y `order`
- consume contratos internos compartidos desde `@bodega-la-pascuala/contracts`
- incluye el schema interno `checkoutIntent` para evitar drift, pero permanece oculto del desk visible

## Comandos

```bash
npm run dev --workspace=studio
npm run lint --workspace=studio
npm run typecheck --workspace=studio
npm run build --workspace=studio
```

## Variables de entorno

Configurar en `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/.env`:

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`
- `SANITY_STUDIO_PREVIEW_URL`
- `SANITY_STUDIO_STUDIO_HOST`

## Restricciones de esta refactorización

- no cambiar desk visible ni operativa visible
- no introducir nuevos documentos accesibles desde el menú principal
- no modificar comportamiento editorial existente

## Puntos internos relevantes

- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/sanity.config.ts`
- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/deskStructure.ts`
- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/schemas/order.tsx`
- `/Users/pedrojose/Trabajo/Bodega-La-Pascuala/studio/schemas/checkoutIntent.ts`
