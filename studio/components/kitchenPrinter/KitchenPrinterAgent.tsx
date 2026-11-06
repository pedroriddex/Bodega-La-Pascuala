import {ORDER_STATUS} from '@bodega-la-pascuala/contracts'
import {useEffect, useState, type CSSProperties} from 'react'
import {useClient} from 'sanity'

import {useKitchenPrinterSettings} from './settings'
import {
  KITCHEN_TICKET_PROJECTION,
  printHtml,
  renderKitchenTicketHtml,
  type KitchenTicketOrder,
} from './ticket'

const PRINTABLE_STATUSES = [
  ORDER_STATUS.paid,
  ORDER_STATUS.preparing,
  ORDER_STATUS.shipped,
  ORDER_STATUS.completed,
]

// Published orders whose ticket hasn't been printed yet: new ones since the
// printer was enabled on this device, plus any order someone asked to reprint.
const PRINT_QUEUE_QUERY = `*[
  _type == "order" &&
  !(_id in path("drafts.**")) &&
  status in $statuses &&
  !defined(printedAt) &&
  (_createdAt > $since || defined(reprintRequestedAt))
] | order(_createdAt asc) ${KITCHEN_TICKET_PROJECTION}`

// Safety net in case the realtime listener silently drops.
const RECONCILE_INTERVAL_MS = 60_000
// Give the printer a moment between consecutive tickets.
const GAP_BETWEEN_TICKETS_MS = 1_500

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function KitchenPrinterAgent() {
  const client = useClient({apiVersion: '2024-03-15'})
  const {enabled, enabledSince} = useKitchenPrinterSettings()
  const [lastPrinted, setLastPrinted] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !enabledSince) {
      return
    }

    let cancelled = false
    let running = false
    const queue: KitchenTicketOrder[] = []
    const inFlight = new Set<string>()
    const params = {statuses: PRINTABLE_STATUSES, since: enabledSince}

    const processQueue = async () => {
      if (running) return
      running = true

      try {
        while (!cancelled && queue.length > 0) {
          const order = queue.shift()!

          try {
            // Claim the ticket before printing. The revision guard makes the
            // claim fail if the order changed or another device already
            // printed it, so a ticket never comes out twice.
            const claim = client.patch(order._id)
            if (order._rev) claim.ifRevisionId(order._rev)
            await claim
              .set({printedAt: new Date().toISOString()})
              .unset(['reprintRequestedAt'])
              .commit()

            await printHtml(renderKitchenTicketHtml(order))
            setLastPrinted(order.orderNumber || order._id)
            setLastError(null)
            await wait(GAP_BETWEEN_TICKETS_MS)
          } catch (error) {
            // 409: the order changed under us or another device already claimed
            // it. The next reconcile picks it up again with a fresh revision if
            // it's still unprinted, so there's nothing to report.
            if ((error as {statusCode?: number})?.statusCode !== 409) {
              console.error('Error printing kitchen ticket', order._id, error)
              setLastError(`No se pudo imprimir ${order.orderNumber || order._id}. Se reintentará.`)
            }
          } finally {
            inFlight.delete(order._id)
          }
        }
      } finally {
        running = false
      }
    }

    const enqueue = (order: KitchenTicketOrder | undefined) => {
      if (!order?._id || inFlight.has(order._id)) return
      inFlight.add(order._id)
      queue.push(order)
      void processQueue()
    }

    const reconcile = () => {
      client
        .fetch<KitchenTicketOrder[]>(PRINT_QUEUE_QUERY, params)
        .then((orders) => {
          if (cancelled) return
          for (const order of orders || []) enqueue(order)
        })
        .catch((error: unknown) => {
          console.error('Error loading kitchen print queue', error)
        })
    }

    reconcile()
    const interval = window.setInterval(reconcile, RECONCILE_INTERVAL_MS)

    const subscription = client
      .listen<KitchenTicketOrder>(PRINT_QUEUE_QUERY, params, {
        includeResult: true,
        visibility: 'query',
      })
      .subscribe({
        next: (event) => {
          if (event.type !== 'mutation' || event.transition === 'disappear') return
          enqueue(event.result as KitchenTicketOrder | undefined)
        },
        error: (error: unknown) => {
          console.error('Kitchen printer listener failed', error)
        },
      })

    return () => {
      cancelled = true
      window.clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [client, enabled, enabledSince])

  if (!enabled) {
    return null
  }

  return (
    <div style={lastError ? {...styles.badge, ...styles.badgeError} : styles.badge} role="status">
      🖨{' '}
      {lastError ||
        (lastPrinted
          ? `Comandas activas · última: ${lastPrinted}`
          : 'Este equipo imprime las comandas')}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  badge: {
    position: 'fixed',
    left: 12,
    bottom: 12,
    zIndex: 1900,
    borderRadius: 999,
    background: '#214593',
    color: '#fff',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
  },
  badgeError: {
    background: '#b91c1c',
  },
}
