import {useMemo, useState, type CSSProperties} from 'react'
import {useClient, useFormValue, type StringInputProps} from 'sanity'

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'shipped' | 'completed' | 'cancelled'

const transitions: Array<{value: OrderStatus; label: string; color: string}> = [
  {value: 'paid', label: 'Pagado', color: '#1d4ed8'},
  {value: 'preparing', label: 'En preparación', color: '#ea580c'},
  {value: 'shipped', label: 'Enviado', color: '#7c3aed'},
  {value: 'completed', label: 'Completado', color: '#16a34a'},
  {value: 'cancelled', label: 'Cancelado', color: '#111827'},
]

function toPublishedId(value: string | undefined): string | null {
  if (!value) return null
  return value.startsWith('drafts.') ? value.slice('drafts.'.length) : value
}

export function QuickStatusActionsInput(_props: StringInputProps) {
  const client = useClient({apiVersion: '2024-03-15'})
  const documentId = useFormValue(['_id']) as string | undefined
  const currentStatus = (useFormValue(['status']) as OrderStatus | undefined) || 'paid'
  const [busyStatus, setBusyStatus] = useState<OrderStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const publishedId = useMemo(() => toPublishedId(documentId), [documentId])

  const updateStatus = async (nextStatus: OrderStatus) => {
    if (!publishedId) return

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
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => updateStatus(item.value)}
              disabled={Boolean(busyStatus)}
              style={{
                ...styles.button,
                background: isActive ? item.color : '#f3f4f6',
                color: isActive ? '#ffffff' : '#111827',
                borderColor: isActive ? item.color : '#d1d5db',
                opacity: busyStatus && !isBusy ? 0.6 : 1,
              }}
            >
              {isBusy ? 'Actualizando...' : item.label}
            </button>
          )
        })}
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
