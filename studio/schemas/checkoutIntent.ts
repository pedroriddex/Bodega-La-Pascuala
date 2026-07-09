import {
  CHECKOUT_INTENT_DOCUMENT_TYPE,
  ORDER_ITEM_TYPE,
  type CheckoutIntentDocument,
  type OrderItemType,
} from '@bodega-la-pascuala/contracts'
import {ClockIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const itemTypeLabels: Record<OrderItemType, string> = {
  [ORDER_ITEM_TYPE.half]: 'Medio',
  [ORDER_ITEM_TYPE.full]: 'Entero',
  [ORDER_ITEM_TYPE.drink]: 'Bebida',
}

function itemTypeLabel(type: string | undefined) {
  return type && type in itemTypeLabels ? itemTypeLabels[type as OrderItemType] : 'Producto'
}

export default defineType({
  name: CHECKOUT_INTENT_DOCUMENT_TYPE,
  title: 'Checkout interno',
  type: 'document',
  icon: ClockIcon,
  fields: [
    defineField({
      name: 'orderPublicId',
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
      readOnly: true,
      fields: [
        defineField({name: 'firstName', type: 'string', title: 'Nombre'}),
        defineField({name: 'lastName', type: 'string', title: 'Apellidos'}),
        defineField({name: 'email', type: 'string', title: 'Email'}),
        defineField({name: 'phone', type: 'string', title: 'Teléfono'}),
      ],
    }),
    defineField({
      name: 'delivery',
      title: 'Entrega',
      type: 'object',
      readOnly: true,
      fields: [
        defineField({
          name: 'method',
          title: 'Método',
          type: 'string',
          options: {
            list: [
              {title: 'Recogida en local', value: 'pickup'},
              {title: 'Envío a domicilio', value: 'delivery'},
            ],
          },
        }),
        defineField({name: 'address', type: 'string', title: 'Dirección'}),
        defineField({name: 'city', type: 'string', title: 'Ciudad'}),
        defineField({name: 'zip', type: 'string', title: 'Código Postal'}),
      ],
    }),
    defineField({
      name: 'items',
      title: 'Artículos',
      type: 'array',
      readOnly: true,
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'productId', type: 'string', title: 'Product ID'}),
            defineField({name: 'name', type: 'string', title: 'Nombre'}),
            defineField({name: 'quantity', type: 'number', title: 'Cantidad'}),
            defineField({name: 'price', type: 'number', title: 'Precio Unitario'}),
            defineField({name: 'type', type: 'string', title: 'Tipo'}),
            defineField({name: 'total', type: 'number', title: 'Total Línea'}),
          ],
          preview: {
            select: {
              title: 'name',
              quantity: 'quantity',
              type: 'type',
              total: 'total',
            },
            prepare({title, quantity, type, total}) {
              return {
                title: `${quantity || 0} x ${title || 'Producto'}`,
                subtitle: `${itemTypeLabel(type)} - ${(total || 0).toFixed?.(2) || total || 0}€`,
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
      readOnly: true,
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'notes',
      title: 'Notas',
      type: 'text',
      readOnly: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Fecha de Creación',
      type: 'datetime',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'paymentIntentId',
      title: 'Stripe Payment Intent ID',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      orderNumber: 'orderNumber',
      customerName: 'customer.firstName',
      customerSurname: 'customer.lastName',
      createdAt: 'createdAt',
      totalAmount: 'totalAmount',
    },
    prepare(selection) {
      const {orderNumber, customerName, customerSurname, createdAt, totalAmount} =
        selection as Pick<CheckoutIntentDocument, 'orderNumber' | 'createdAt' | 'totalAmount'> & {
          customerName?: string
          customerSurname?: string
        }

      return {
        title: orderNumber || 'Checkout interno',
        subtitle: `${customerName || ''} ${customerSurname || ''} · ${(totalAmount || 0).toFixed(2)}€ · ${createdAt || ''}`,
      }
    },
  },
})
