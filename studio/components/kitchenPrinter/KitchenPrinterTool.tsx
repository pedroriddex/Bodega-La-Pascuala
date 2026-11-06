import {DocumentTextIcon} from '@sanity/icons'
import {useState, type CSSProperties} from 'react'
import type {Tool} from 'sanity'

import {setKitchenPrinterEnabled, useKitchenPrinterSettings} from './settings'
import {printHtml, renderKitchenTicketHtml, SAMPLE_TICKET_ORDER} from './ticket'

function formatSince(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function KitchenPrinterPanel() {
  const {enabled, enabledSince} = useKitchenPrinterSettings()
  const [testError, setTestError] = useState('')

  const printTest = async () => {
    setTestError('')
    try {
      await printHtml(
        renderKitchenTicketHtml(
          {...SAMPLE_TICKET_ORDER, createdAt: new Date().toISOString()},
          {banner: 'PRUEBA · NO PREPARAR'},
        ),
      )
    } catch (error) {
      console.error('Error printing test ticket', error)
      setTestError('No se pudo imprimir el ticket de prueba.')
    }
  }

  const toggle = () => {
    if (enabled) {
      const confirmed = window.confirm(
        '¿Dejar de imprimir comandas en este equipo? Los pedidos nuevos no saldrán por la impresora.',
      )
      if (!confirmed) return
    }
    setKitchenPrinterEnabled(!enabled)
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Impresora de comandas</h1>
      <p style={styles.text}>
        Activa esta opción <strong>solo en el ordenador conectado a la impresora de cocina</strong>.
        Cada pedido pagado imprimirá su comanda automáticamente mientras el Studio esté abierto en
        este equipo. En la tablet de sala debe quedarse desactivada.
      </p>

      <div style={enabled ? {...styles.status, ...styles.statusOn} : styles.status}>
        {enabled
          ? `Este equipo imprime las comandas (activado el ${formatSince(enabledSince)}).`
          : 'Este equipo no imprime comandas.'}
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={toggle}
          style={{...styles.button, background: enabled ? '#b91c1c' : '#214593'}}
        >
          {enabled ? 'Desactivar en este equipo' : 'Imprimir comandas en este equipo'}
        </button>
        <button type="button" onClick={printTest} style={{...styles.button, ...styles.secondary}}>
          Imprimir ticket de prueba
        </button>
      </div>
      {testError ? <p style={styles.error}>{testError}</p> : null}

      <h2 style={styles.subtitle}>Si una comanda no sale</h2>
      <ul style={styles.list}>
        <li>Comprueba que la impresora está encendida y tiene papel.</li>
        <li>
          Abre el pedido y pulsa <strong>Reimprimir comanda</strong> en Acciones rápidas. Funciona
          desde cualquier equipo: la comanda sale por la impresora de cocina.
        </li>
        <li>
          Al activar la opción solo se imprimen los pedidos nuevos; los anteriores se pueden sacar
          con Reimprimir.
        </li>
      </ul>
    </div>
  )
}

export const kitchenPrinterTool: Tool = {
  name: 'impresora',
  title: 'Impresora',
  icon: DocumentTextIcon,
  component: KitchenPrinterPanel,
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '32px 20px',
    display: 'grid',
    gap: 16,
    color: '#111827',
  },
  title: {
    margin: 0,
    fontSize: 24,
  },
  subtitle: {
    margin: '16px 0 0',
    fontSize: 16,
  },
  text: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: '#374151',
  },
  status: {
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    padding: '12px 14px',
    fontWeight: 700,
    fontSize: 14,
  },
  statusOn: {
    border: '1px solid #86efac',
    background: '#f0fdf4',
    color: '#166534',
  },
  actions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '12px 16px',
    fontSize: 14,
  },
  secondary: {
    background: '#fff',
    color: '#214593',
    border: '1px solid #214593',
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#374151',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    margin: 0,
    fontWeight: 600,
  },
}
