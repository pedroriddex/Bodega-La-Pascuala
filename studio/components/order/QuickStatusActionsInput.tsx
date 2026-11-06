import {ORDER_STATUS, type OrderStatus} from '@bodega-la-pascuala/contracts'
import {useMemo, useState, type CSSProperties} from 'react'
import {useClient, useFormValue, type StringInputProps} from 'sanity'

const transitions: Array<{value: OrderStatus; label: string; color: string}> = [
  {value: ORDER_STATUS.paid, label: 'Pagado', color: '#1d4ed8'},
  {value: ORDER_STATUS.preparing, label: 'En preparación', color: '#ea580c'},
  {value: ORDER_STATUS.shipped, label: 'Enviado', color: '#7c3aed'},
  {value: ORDER_STATUS.completed, label: 'Completado', color: '#16a34a'},
  {value: ORDER_STATUS.cancelled, label: 'Cancelado', color: '#111827'},
]

// Linear fulfilment flow. Quick actions only move forward through it so an
// accidental click can't silently regress a shipped order back to "paid".
const STATUS_RANK: Record<string, number> = {
  [ORDER_STATUS.pendingPayment]: 0,
  [ORDER_STATUS.paid]: 1,
  [ORDER_STATUS.preparing]: 2,
  [ORDER_STATUS.shipped]: 3,
  [ORDER_STATUS.completed]: 4,
}

const TERMINAL_STATUSES = new Set<OrderStatus>([ORDER_STATUS.completed, ORDER_STATUS.cancelled])

function canTransition(current: OrderStatus, target: OrderStatus): boolean {
  if (target === current) return false
  // Cancelling is always available until the order reaches a terminal state.
  if (target === ORDER_STATUS.cancelled) return !TERMINAL_STATUSES.has(current)
  if (TERMINAL_STATUSES.has(current)) return false
  const currentRank = STATUS_RANK[current]
  const targetRank = STATUS_RANK[target]
  if (currentRank === undefined || targetRank === undefined) return false
  return targetRank > currentRank
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toPublishedId(value: string | undefined): string | null {
  if (!value) return null
  return value.startsWith('drafts.') ? value.slice('drafts.'.length) : value
}

export function QuickStatusActionsInput(_props: StringInputProps) {
  const client = useClient({apiVersion: '2024-03-15'})
  const documentId = useFormValue(['_id']) as string | undefined
  const currentStatus = (useFormValue(['status']) as OrderStatus | undefined) || ORDER_STATUS.paid
  const printedAt = useFormValue(['printedAt']) as string | undefined
  const reprintRequestedAt = useFormValue(['reprintRequestedAt']) as string | undefined
  const [busyStatus, setBusyStatus] = useState<OrderStatus | null>(null)
  const [reprinting, setReprinting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const publishedId = useMemo(() => toPublishedId(documentId), [documentId])

  // Clearing printedAt puts the order back in the kitchen PC's print queue, so
  // the ticket comes out on the kitchen printer whichever device asks for it.
  const requestReprint = async () => {
    if (!publishedId) return
    setReprinting(true)
    setErrorMessage('')

    try {
      await client
        .patch(publishedId)
        .unset(['printedAt'])
        .set({reprintRequestedAt: new Date().toISOString()})
        .commit()
    } catch (error) {
      console.error('Error requesting kitchen ticket reprint', error)
      setErrorMessage('No se pudo pedir la reimpresión. Inténtalo de nuevo.')
    } finally {
      setReprinting(false)
    }
  }

  const updateStatus = async (nextStatus: OrderStatus) => {
    if (!publishedId) return
    if (!canTransition(currentStatus, nextStatus)) return

    if (nextStatus === ORDER_STATUS.cancelled) {
      const confirmed =
        typeof window === 'undefined' ||
        window.confirm('¿Cancelar este pedido? Esta acción cambia el estado a "Cancelado".')
      if (!confirmed) return
    }

    setBusyStatus(nextStatus)
    setErrorMessage('')

    try {
      await client.patch(publishedId).set({status: nextStatus}).commit()

      if (documentId?.startsWith('drafts.')) {
        await client
          .patch(documentId)
          .set({status: nextStatus})
          .commit()
          .catch(() => null)
      }
    } catch (error) {
      console.error('Error updating order status', error)
      setErrorMessage('No se pudo actualizar el estado. Inténtalo de nuevo.')
    } finally {
      setBusyStatus(null)
    }
  }

  if (!publishedId) {
    return (
      <div style={styles.wrapper}>
        <strong>Acciones rápidas</strong>
        <p style={styles.helper}>Guarda primero el pedido para habilitar los botones de estado.</p>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <strong>Acciones rápidas</strong>
        <span style={styles.current}>Estado actual: {currentStatus}</span>
      </div>

      <div style={styles.row}>
        {transitions.map((item) => {
          const isActive = currentStatus === item.value
          const isBusy = busyStatus === item.value
          const isAllowed = canTransition(currentStatus, item.value)
          const isDisabled = Boolean(busyStatus) || !isAllowed
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => updateStatus(item.value)}
              disabled={isDisabled}
              title={isActive ? 'Estado actual' : isAllowed ? undefined : 'Transición no permitida'}
              style={{
                ...styles.button,
                background: isActive ? item.color : '#f3f4f6',
                color: isActive ? '#ffffff' : '#111827',
                borderColor: isActive ? item.color : '#d1d5db',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled && !isActive && !isBusy ? 0.45 : 1,
              }}
            >
              {isBusy ? 'Actualizando...' : item.label}
            </button>
          )
        })}
      </div>

      <div style={styles.printRow}>
        <button
          type="button"
          onClick={requestReprint}
          disabled={reprinting || Boolean(reprintRequestedAt && !printedAt)}
          style={{
            ...styles.button,
            background: '#ffffff',
            color: '#214593',
            borderColor: '#214593',
          }}
        >
          {reprinting ? 'Enviando...' : 'Reimprimir comanda'}
        </button>
        <span style={styles.helper}>
          {printedAt
            ? `Comanda impresa a las ${formatTime(printedAt)}`
            : reprintRequestedAt
              ? 'Reimpresión pendiente: saldrá en la impresora de cocina'
              : 'Comanda sin imprimir'}
        </span>
      </div>

      {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    background: '#f9fafb',
    display: 'grid',
    gap: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  current: {
    fontSize: 12,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    border: '1px solid',
    borderRadius: 8,
    padding: '8px 10px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
  },
  printRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  helper: {
    fontSize: 12,
    margin: 0,
    color: '#6b7280',
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
    margin: 0,
    fontWeight: 600,
  },
}
