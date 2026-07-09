import {ORDER_STATUS} from '@bodega-la-pascuala/contracts'
import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react'
import {useClient, type LayoutProps} from 'sanity'

type DeliveryMethod = 'pickup' | 'delivery' | string

interface OrderAlertDoc {
  _id?: string
  orderNumber?: string
  totalAmount?: number
  createdAt?: string
  customer?: {
    firstName?: string
    lastName?: string
  }
  delivery?: {
    method?: DeliveryMethod
  }
}

interface OrderAlertItem {
  id: string
  orderNumber: string
  createdAt: string
  customerName: string
  totalAmount: number
  deliveryMethod: DeliveryMethod
}

const ALERTS_STORAGE_KEY = 'pascuala_order_alerts'
const ACK_STORAGE_KEY = 'pascuala_order_alerts_ack'
const LISTEN_QUERY = `*[_type == "order" && status == "${ORDER_STATUS.paid}"]{
  _id,
  orderNumber,
  totalAmount,
  createdAt,
  customer {firstName, lastName},
  delivery {method}
}`

function formatCustomerName(order: OrderAlertDoc): string {
  const firstName = order.customer?.firstName?.trim() || ''
  const lastName = order.customer?.lastName?.trim() || ''
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName.length > 0 ? fullName : 'Cliente'
}

function createAlertItem(order: OrderAlertDoc): OrderAlertItem | null {
  const id = order._id?.trim()
  if (!id) {
    return null
  }

  return {
    id,
    orderNumber: order.orderNumber?.trim() || id,
    createdAt: order.createdAt || new Date().toISOString(),
    customerName: formatCustomerName(order),
    totalAmount: Number(order.totalAmount || 0),
    deliveryMethod: order.delivery?.method || 'pickup',
  }
}

function loadStoredAlerts(): OrderAlertItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is OrderAlertItem => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<OrderAlertItem>
      return typeof candidate.id === 'string' && typeof candidate.orderNumber === 'string'
    })
  } catch (error) {
    console.error('Error loading order alerts from storage', error)
    return []
  }
}

function saveAlerts(alerts: OrderAlertItem[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
}

// Order ids the kitchen already acknowledged ("Oído cocina"). Persisted so a
// reconcile against the DB doesn't resurrect an alert that's still `paid` but
// was already seen. Pruned to currently-paid ids on each reconcile.
function loadAckIds(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(ACK_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch (error) {
    console.error('Error loading acknowledged order alerts from storage', error)
    return []
  }
}

function saveAckIds(ids: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(ids))
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeliveryLabel(method: DeliveryMethod): string {
  return method === 'delivery' ? 'Envío' : 'Recogida'
}

function useKitchenAlarm(active: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<number | null>(null)

  const clearAlarm = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const playBeep = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ||
      ((window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext ??
        undefined)

    if (!AudioContextCtor) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor()
    }

    const context = audioContextRef.current
    if (context.state === 'suspended') {
      void context.resume().catch(() => {
        // Browsers can block autoplay until user interaction.
      })
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(840, context.currentTime)

    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.36)
  }, [])

  useEffect(() => {
    if (!active) {
      clearAlarm()
      return
    }

    playBeep()
    intervalRef.current = window.setInterval(() => {
      playBeep()
    }, 1200)

    return clearAlarm
  }, [active, clearAlarm, playBeep])

  useEffect(() => {
    return () => {
      clearAlarm()
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined)
      }
    }
  }, [clearAlarm])
}

function OrderAlertsOverlay() {
  const client = useClient({apiVersion: '2024-03-15'})
  const [alerts, setAlerts] = useState<OrderAlertItem[]>([])
  const knownIdsRef = useRef<Set<string>>(new Set())
  const ackIdsRef = useRef<Set<string>>(new Set())
  const [busyAlertIds, setBusyAlertIds] = useState<Record<string, boolean>>({})

  // Initial load: show whatever was cached immediately, then reconcile against
  // the DB so we (a) surface paid orders that arrived while the Studio was
  // closed and (b) drop alerts for orders that already left the paid state,
  // while respecting acknowledgements that are still paid.
  useEffect(() => {
    let cancelled = false
    ackIdsRef.current = new Set(loadAckIds())

    const stored = loadStoredAlerts()
    setAlerts(stored)
    knownIdsRef.current = new Set([...stored.map((item) => item.id), ...ackIdsRef.current])

    client
      .fetch<OrderAlertDoc[]>(LISTEN_QUERY)
      .then((paidOrders) => {
        if (cancelled) {
          return
        }

        const paidIds = new Set<string>()
        const reconciled: OrderAlertItem[] = []
        for (const doc of paidOrders || []) {
          const item = createAlertItem(doc)
          if (!item) {
            continue
          }
          paidIds.add(item.id)
          if (!ackIdsRef.current.has(item.id)) {
            reconciled.push(item)
          }
        }

        // Forget acknowledgements for orders that are no longer paid.
        ackIdsRef.current = new Set([...ackIdsRef.current].filter((id) => paidIds.has(id)))
        saveAckIds([...ackIdsRef.current])

        knownIdsRef.current = new Set([...paidIds, ...ackIdsRef.current])
        setAlerts(reconciled)
      })
      .catch((error: unknown) => {
        console.error('Error reconciling order alerts against the database', error)
      })

    return () => {
      cancelled = true
    }
  }, [client])

  useEffect(() => {
    saveAlerts(alerts)
  }, [alerts])

  useKitchenAlarm(alerts.length > 0)

  useEffect(() => {
    const subscription = client
      .listen<OrderAlertDoc>(LISTEN_QUERY, {}, {includeResult: true, visibility: 'query'})
      .subscribe({
        next: (event) => {
          if (event.type !== 'mutation') {
            return
          }

          if (event.transition === 'appear') {
            const payload = event.result as OrderAlertDoc | undefined
            const alert = createAlertItem(payload || {})
            if (!alert || knownIdsRef.current.has(alert.id)) {
              return
            }

            knownIdsRef.current.add(alert.id)
            setAlerts((current) => [...current, alert])
            return
          }

          // Order left the paid set (e.g. moved to preparing from another
          // device): drop any local alert so it doesn't keep ringing.
          if (event.transition === 'disappear') {
            const id = event.documentId
            if (!id) {
              return
            }

            knownIdsRef.current.delete(id)
            if (ackIdsRef.current.delete(id)) {
              saveAckIds([...ackIdsRef.current])
            }
            setAlerts((current) => current.filter((item) => item.id !== id))
          }
        },
        error: (error: unknown) => {
          console.error('Order alerts listener failed', error)
        },
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [client])

  const hasAlerts = alerts.length > 0

  const acknowledge = useCallback((id: string) => {
    ackIdsRef.current.add(id)
    saveAckIds([...ackIdsRef.current])
    knownIdsRef.current.add(id)
    setAlerts((current) => current.filter((item) => item.id !== id))
  }, [])

  const setPreparing = useCallback(
    async (alert: OrderAlertItem) => {
      setBusyAlertIds((current) => ({...current, [alert.id]: true}))

      try {
        await client.patch(alert.id).set({status: ORDER_STATUS.preparing}).commit()
        knownIdsRef.current.delete(alert.id)
        if (ackIdsRef.current.delete(alert.id)) {
          saveAckIds([...ackIdsRef.current])
        }
        setAlerts((current) => current.filter((item) => item.id !== alert.id))
      } catch (error) {
        console.error('Error changing order status to preparing', error)
      } finally {
        setBusyAlertIds((current) => {
          const next = {...current}
          delete next[alert.id]
          return next
        })
      }
    },
    [client],
  )

  const title = useMemo(() => {
    if (alerts.length === 1) return 'Nuevo pedido en cocina'
    return `${alerts.length} pedidos pendientes de confirmar`
  }, [alerts.length])

  if (!hasAlerts) {
    return null
  }

  return (
    <div style={styles.container} role="alert" aria-live="assertive">
      <div style={styles.banner}>{title}</div>

      {alerts.map((alert) => (
        <div key={alert.id} style={styles.card}>
          <div style={styles.row}>
            <strong style={styles.orderNumber}>Pedido {alert.orderNumber}</strong>
            <span style={styles.badge}>{formatDeliveryLabel(alert.deliveryMethod)}</span>
          </div>

          <div style={styles.meta}>
            <div>
              <strong>{alert.customerName}</strong>
            </div>
            <div>{alert.totalAmount.toFixed(2)}€</div>
            <div>{formatTime(alert.createdAt)}</div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.button}
              onClick={() => acknowledge(alert.id)}
              disabled={Boolean(busyAlertIds[alert.id])}
            >
              Oído cocina
            </button>
            <button
              type="button"
              style={styles.preparingButton}
              onClick={() => setPreparing(alert)}
              disabled={Boolean(busyAlertIds[alert.id])}
            >
              {busyAlertIds[alert.id] ? 'Actualizando...' : 'Pasar a preparación'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrderAlertsLayout(props: LayoutProps) {
  return (
    <>
      {props.renderDefault(props)}
      <OrderAlertsOverlay />
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    right: 18,
    bottom: 18,
    zIndex: 2000,
    width: 360,
    maxWidth: 'calc(100vw - 36px)',
    maxHeight: '80vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  banner: {
    borderRadius: 10,
    background: '#ef4444',
    color: '#fff',
    padding: '10px 12px',
    fontWeight: 700,
    fontSize: 14,
    boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
  },
  card: {
    borderRadius: 10,
    border: '1px solid #fecaca',
    background: '#fff',
    padding: 12,
    boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  orderNumber: {
    fontSize: 15,
    color: '#111827',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: 999,
    padding: '2px 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  meta: {
    fontSize: 13,
    color: '#374151',
    display: 'grid',
    gap: 4,
  },
  button: {
    border: 'none',
    borderRadius: 8,
    background: '#16a34a',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '10px 12px',
  },
  preparingButton: {
    border: 'none',
    borderRadius: 8,
    background: '#ea580c',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '10px 12px',
  },
  actions: {
    display: 'grid',
    gap: 8,
  },
}
