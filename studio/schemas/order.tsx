
import { defineField, defineType } from 'sanity'
import { BasketIcon } from '@sanity/icons'

export default defineType({
  name: 'order',
  title: 'Pedido',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'orderNumber',
      title: 'Número de Pedido',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'customer',
      title: 'Cliente',
      type: 'object',
      fields: [
        defineField({ name: 'firstName', type: 'string', title: 'Nombre' }),
        defineField({ name: 'lastName', type: 'string', title: 'Apellidos' }),
        defineField({ name: 'email', type: 'string', title: 'Email' }),
        defineField({ name: 'phone', type: 'string', title: 'Teléfono' }),
      ],
    }),
    defineField({
      name: 'delivery',
      title: 'Entrega',
      type: 'object',
      fields: [
        defineField({
          name: 'method',
          title: 'Método',
          type: 'string',
          options: {
            list: [
              { title: 'Recogida en Local', value: 'pickup' },
              { title: 'Envío a Domicilio', value: 'delivery' },
            ],
          },
        }),
        defineField({ name: 'address', type: 'string', title: 'Dirección' }),
        defineField({ name: 'city', type: 'string', title: 'Ciudad' }),
        defineField({ name: 'zip', type: 'string', title: 'Código Postal' }),
      ],
    }),
    defineField({
      name: 'items',
      title: 'Artículos',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', title: 'Nombre' }),
            defineField({ name: 'quantity', type: 'number', title: 'Cantidad' }),
            defineField({ name: 'price', type: 'number', title: 'Precio Unitario' }),
            defineField({ name: 'type', type: 'string', title: 'Tipo (Medio/Entero)' }),
            defineField({ name: 'total', type: 'number', title: 'Total Línea' }),
          ],
          preview: {
            select: {
              title: 'name',
              quantity: 'quantity',
              type: 'type',
              price: 'total',
            },
            prepare({ title, quantity, type, price }) {
              const typeLabel = type === 'half' ? 'Medio' : 'Entero'
              return {
                title: `${quantity} x ${title}`,
                subtitle: `${typeLabel} - ${price}€`,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'totalAmount',
      title: 'Total Pedido (€)',
      type: 'number',
    }),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          { title: 'Pendiente', value: 'pending' },
          { title: 'Pagado', value: 'paid' },
          { title: 'En Preparación', value: 'preparing' },
          { title: 'Enviado', value: 'shipped' },
          { title: 'Completado', value: 'completed' },
          { title: 'Cancelado', value: 'cancelled' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'stripePaymentId',
      title: 'Stripe Payment ID',
      type: 'string',
    }),
    defineField({
      name: 'createdAt',
      title: 'Fecha de Creación',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'orderNumber',
      customerName: 'customer.firstName',
      customerSurname: 'customer.lastName',
      status: 'status',
      total: 'totalAmount',
    },
    prepare(selection) {
      const { title, customerName, customerSurname, status, total } = selection
      
      const statusColors = {
        pending: '#8e8e93', // Gray (Pendiente/Pagado initially pending?) User said "Pagado (gris)"
        paid: '#8e8e93',    // Gray
        preparing: '#ff3b30', // Red
        shipped: '#ff9500',   // Orange
        completed: '#34c759', // Green
        cancelled: '#000000', // Black
      }

      const statusLabels = {
        pending: 'Pendiente',
        paid: 'Pagado',
        preparing: 'En preparación',
        shipped: 'Enviado',
        completed: 'Completado',
        cancelled: 'Cancelado',
      }

      return {
        title: title,
        subtitle: `${customerName} ${customerSurname} - ${total}€ - ${statusLabels[status]}`,
        media: () => (
          <div
            style={{
              backgroundColor: statusColors[status] || '#8e8e93',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '50%', // Optional: makes it round, but inside the square container it looks like a dot
            }}
          >
            {/* We could put an icon here, or just the color block as requested */}
            <BasketIcon style={{ color: 'white' }} />
          </div>
        )
      }
    },
  },
})
