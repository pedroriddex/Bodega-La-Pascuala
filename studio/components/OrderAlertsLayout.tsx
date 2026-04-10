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
const LISTEN_QUERY = `*[_type == "order" && status == "paid"]{
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
  const [busyAlertIds, setBusyAlertIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const stored = loadStoredAlerts()
    setAlerts(stored)
    knownIdsRef.current = new Set(stored.map((item) => item.id))
  }, [])

  useEffect(() => {
    saveAlerts(alerts)
  }, [alerts])

  useKitchenAlarm(alerts.length > 0)

  useEffect(() => {
    const subscription = client
      .listen<OrderAlertDoc>(LISTEN_QUERY, {}, {includeResult: true, visibility: 'query'})
      .subscribe({
        next: (event) => {
          if (event.type !== 'mutation' || event.transition !== 'appear') {
            return
          }

          const payload = event.result as OrderAlertDoc | undefined
          const alert = createAlertItem(payload || {})
          if (!alert) {
            return
          }

          if (knownIdsRef.current.has(alert.id)) {
            return
          }

          knownIdsRef.current.add(alert.id)
          setAlerts((current) => [...current, alert])
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
    setAlerts((current) => current.filter((item) => item.id !== id))
  }, [])

  const setPreparing = useCallback(
    async (alert: OrderAlertItem) => {
      setBusyAlertIds((current) => ({...current, [alert.id]: true}))

      try {
        await client.patch(alert.id).set({status: 'preparing'}).commit()
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
