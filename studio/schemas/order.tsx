import {BasketIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {QuickStatusActionsInput} from '../components/order/QuickStatusActionsInput'

const statusColors = {
  pending_payment: '#8e8e93',
  paid: '#8e8e93',
  preparing: '#ff3b30',
  shipped: '#ff9500',
  completed: '#34c759',
  cancelled: '#000000',
} as const

const statusLabels = {
  pending_payment: 'Pago pendiente',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  completed: 'Completado',
  cancelled: 'Cancelado',
} as const

function itemTypeLabel(type: string | undefined) {
  if (type === 'half') return 'Medio'
  if (type === 'full') return 'Entero'
  if (type === 'drink') return 'Bebida'
  return 'Producto'
}

export default defineType({
  name: 'order',
  title: 'Pedido',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'quickStatusActions',
      title: 'Acciones rápidas',
      type: 'string',
      readOnly: true,
      components: {
        input: QuickStatusActionsInput,
      },
    }),
    defineField({
      name: 'publicId',
      title: 'ID Público',
      type: 'string',
      validation: (rule) => rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'orderNumber',
      title: 'Número de Pedido',
      type: 'string',
      validation: (rule) => rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'customer',
      title: 'Cliente',
      type: 'object',
      fields: [
        defineField({
          name: 'firstName',
          type: 'string',
          title: 'Nombre',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'lastName',
          type: 'string',
          title: 'Apellidos',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'email',
          type: 'string',
          title: 'Email',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'phone',
          type: 'string',
          title: 'Teléfono',
          validation: (rule) => rule.required(),
        }),
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
              {title: 'Recogida en Local', value: 'pickup'},
              {title: 'Envío a Domicilio', value: 'delivery'},
            ],
          },
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'address', type: 'string', title: 'Dirección'}),
        defineField({name: 'city', type: 'string', title: 'Ciudad'}),
        defineField({name: 'zip', type: 'string', title: 'Código Postal'}),
      ],
    }),
    defineField({
      name: 'notes',
      title: 'Notas',
      type: 'text',
    }),
    defineField({
      name: 'items',
      title: 'Artículos',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'productId',
              type: 'string',
              title: 'Product ID',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'name',
              type: 'string',
              title: 'Nombre',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'quantity',
              type: 'number',
              title: 'Cantidad',
              validation: (rule) => rule.required().positive().integer(),
            }),
            defineField({
              name: 'price',
              type: 'number',
              title: 'Precio Unitario',
              validation: (rule) => rule.required().positive(),
            }),
            defineField({
              name: 'type',
              type: 'string',
              title: 'Tipo',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'total',
              type: 'number',
              title: 'Total Línea',
              validation: (rule) => rule.required().positive(),
            }),
          ],
          preview: {
            select: {
              title: 'name',
              quantity: 'quantity',
              type: 'type',
              price: 'total',
            },
            prepare({title, quantity, type, price}) {
              return {
                title: `${quantity} x ${title}`,
                subtitle: `${itemTypeLabel(type)} - ${price}€`,
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
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {
        list: [
          {title: 'Pago pendiente', value: 'pending_payment'},
          {title: 'Pagado', value: 'paid'},
          {title: 'En Preparación', value: 'preparing'},
          {title: 'Enviado', value: 'shipped'},
          {title: 'Completado', value: 'completed'},
          {title: 'Cancelado', value: 'cancelled'},
        ],
      },
      initialValue: 'pending_payment',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'paymentIntentId',
      title: 'Stripe Payment Intent ID',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'stripePaymentId',
      title: 'Stripe Payment ID (Legacy)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Fecha de Creación',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'orderNumber',
      publicId: 'publicId',
      customerName: 'customer.firstName',
      customerSurname: 'customer.lastName',
      status: 'status',
      total: 'totalAmount',
    },
    prepare(selection) {
      const {title, publicId, customerName, customerSurname, status, total} = selection
      const statusKey =
        typeof status === 'string' && status in statusLabels
          ? (status as keyof typeof statusLabels)
          : 'pending_payment'

      return {
        title: title || publicId || 'Pedido sin número',
        subtitle: `${customerName || ''} ${customerSurname || ''} - ${total || 0}€ - ${statusLabels[statusKey]}`,
        media: () => (
          <div
            style={{
              backgroundColor: statusColors[statusKey],
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '50%',
            }}
          >
            <BasketIcon style={{color: 'white'}} />
          </div>
        ),
      }
    },
  },
})
