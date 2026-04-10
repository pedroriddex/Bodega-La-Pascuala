import {defineField, defineType} from 'sanity'

const DEFAULT_CLOSED_MESSAGE =
  'Ahora mismo estamos cerrados. Vuelve en nuestro horario habitual para realizar tu pedido.'

export default defineType({
  name: 'storeSettings',
  title: 'Estado de Tienda',
  type: 'document',
  initialValue: {
    isOpen: true,
    closedMessage: DEFAULT_CLOSED_MESSAGE,
  },
  fields: [
    defineField({
      name: 'isOpen',
      title: 'Abrir tienda',
      type: 'boolean',
      description: 'Activa para permitir pedidos. Desactiva para bloquear compras.',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'closedMessage',
      title: 'Mensaje de tienda cerrada',
      type: 'string',
      description: 'Mensaje mostrado al cliente cuando la tienda está cerrada.',
      initialValue: DEFAULT_CLOSED_MESSAGE,
      validation: (rule) => rule.required().min(10).max(220),
    }),
  ],
  preview: {
    select: {
      isOpen: 'isOpen',
      closedMessage: 'closedMessage',
    },
    prepare({isOpen, closedMessage}) {
      return {
        title: isOpen ? 'Tienda abierta' : 'Tienda cerrada',
        subtitle: closedMessage || DEFAULT_CLOSED_MESSAGE,
      }
    },
  },
})
