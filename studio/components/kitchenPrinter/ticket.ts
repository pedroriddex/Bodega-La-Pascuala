import {ORDER_ITEM_TYPE} from '@bodega-la-pascuala/contracts'

export interface KitchenTicketOrder {
  _id: string
  _rev?: string
  orderNumber?: string
  createdAt?: string
  _createdAt?: string
  totalAmount?: number
  notes?: string
  customer?: {
    firstName?: string
    lastName?: string
    phone?: string
  }
  delivery?: {
    method?: string
    address?: string
    city?: string
    zip?: string
  }
  items?: Array<{
    _key?: string
    name?: string
    quantity?: number
    type?: string
  }>
}

// Fields the ticket needs. Shared by the print queue query and the listener.
export const KITCHEN_TICKET_PROJECTION = `{
  _id,
  _rev,
  _createdAt,
  orderNumber,
  createdAt,
  totalAmount,
  notes,
  customer {firstName, lastName, phone},
  delivery {method, address, city, zip},
  items[] {_key, name, quantity, type}
}`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateTime(value: string | undefined): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEuros(value: number | undefined): string {
  return `${Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function sizeLabel(type: string | undefined): string {
  if (type === ORDER_ITEM_TYPE.half) return 'Medio'
  if (type === ORDER_ITEM_TYPE.full) return 'Entero'
  return ''
}

const TICKET_STYLES = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: Arial, Helvetica, sans-serif; }
  .ticket { width: 72mm; margin: 0 auto; padding: 3mm 0 8mm; font-size: 12pt; line-height: 1.25; }
  .center { text-align: center; }
  .brand { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; }
  .banner { font-size: 10pt; font-weight: 700; }
  .num { font-size: 16pt; font-weight: 900; margin: 2mm 0 0; overflow-wrap: anywhere; }
  .time { font-size: 11pt; }
  .method { margin: 3mm 0; padding: 2mm 0; border: 2px solid #000; text-align: center; font-size: 16pt; font-weight: 900; }
  .addr { font-size: 11pt; margin-bottom: 2mm; }
  hr { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .item { display: flex; gap: 2mm; align-items: baseline; margin: 1.5mm 0; }
  .qty { font-size: 15pt; font-weight: 900; min-width: 9mm; }
  .name { flex: 1; font-size: 14pt; font-weight: 700; }
  .size { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .notes { border: 1px solid #000; padding: 2mm; font-size: 12pt; font-weight: 700; white-space: pre-wrap; }
  .total { display: flex; justify-content: space-between; font-size: 14pt; font-weight: 900; }
  .small { font-size: 9pt; }
`

export function renderKitchenTicketHtml(
  order: KitchenTicketOrder,
  options: {banner?: string} = {},
): string {
  const isDelivery = order.delivery?.method === 'delivery'
  const customerName =
    `${order.customer?.firstName?.trim() || ''} ${order.customer?.lastName?.trim() || ''}`.trim() ||
    'Cliente'
  const phone = order.customer?.phone?.trim()
  const addressLine = [order.delivery?.address, order.delivery?.zip, order.delivery?.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')

  const items = (order.items || [])
    .map((item) => {
      const size = sizeLabel(item.type)
      return `<div class="item">
        <span class="qty">${Number(item.quantity || 1)}x</span>
        <span class="name">${escapeHtml(item.name?.trim() || 'Producto')}</span>
        ${size ? `<span class="size">${size}</span>` : ''}
      </div>`
    })
    .join('')

  const notes = order.notes?.trim()

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comanda ${escapeHtml(order.orderNumber || order._id)}</title>
<style>${TICKET_STYLES}</style>
</head>
<body>
<div class="ticket">
  <div class="center brand">BODEGA LA PASCUALA</div>
  ${options.banner ? `<div class="center banner">*** ${escapeHtml(options.banner)} ***</div>` : ''}
  <div class="center num">#${escapeHtml(order.orderNumber || order._id)}</div>
  <div class="center time">${formatDateTime(order.createdAt || order._createdAt)}</div>

  <div class="method">${isDelivery ? 'ENVÍO A DOMICILIO' : 'RECOGIDA EN LOCAL'}</div>
  <div class="addr">
    <strong>${escapeHtml(customerName)}</strong>${phone ? ` · ${escapeHtml(phone)}` : ''}
    ${isDelivery && addressLine ? `<br />${escapeHtml(addressLine)}` : ''}
  </div>

  <hr />
  ${items}
  <hr />

  ${notes ? `<div class="notes">NOTA: ${escapeHtml(notes)}</div><hr />` : ''}
  <div class="total"><span>TOTAL</span><span>${formatEuros(order.totalAmount)}</span></div>
  <div class="small">Pagado online con tarjeta</div>
  <div class="center small" style="margin-top:4mm">— fin de comanda —</div>
</div>
</body>
</html>`
}

const PRINT_CLEANUP_MS = 60_000

// Prints through a hidden iframe so the Studio page itself is never printed.
// On the kitchen PC Chrome runs with --kiosk-printing, so print() goes straight
// to the default printer (the Epson) without a dialog.
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('No document available to print'))
      return
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow
      if (!frameWindow) {
        cleanup()
        reject(new Error('Print frame has no window'))
        return
      }

      try {
        frameWindow.focus()
        frameWindow.print()
        resolve()
      } catch (error) {
        cleanup()
        reject(error)
        return
      }

      frameWindow.addEventListener('afterprint', cleanup, {once: true})
      window.setTimeout(cleanup, PRINT_CLEANUP_MS)
    }

    iframe.srcdoc = html
    document.body.appendChild(iframe)
  })
}

export const SAMPLE_TICKET_ORDER: KitchenTicketOrder = {
  _id: 'prueba',
  orderNumber: 'PRUEBA',
  createdAt: new Date().toISOString(),
  totalAmount: 30.5,
  notes: 'Esto es un ticket de prueba. No preparar.',
  customer: {firstName: 'Cliente', lastName: 'de prueba', phone: '600 000 000'},
  delivery: {method: 'delivery', address: 'C/ Ejemplo 12', zip: '00000', city: 'Ciudad'},
  items: [
    {name: 'BRASCADA', quantity: 2, type: ORDER_ITEM_TYPE.full},
    {name: 'CALAMARES', quantity: 1, type: ORDER_ITEM_TYPE.half},
    {name: 'COCACOLA', quantity: 2, type: ORDER_ITEM_TYPE.drink},
  ],
}
