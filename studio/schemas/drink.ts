import { defineField, defineType } from 'sanity'
import { BottleIcon } from '@sanity/icons'

export default defineType({
  name: 'drink',
  title: 'Bebida',
  type: 'document',
  icon: BottleIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre de la Bebida',
      type: 'string',
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Texto alternativo',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'price',
      title: 'Precio (€)',
      type: 'number',
      validation: (rule) => rule.required().positive(),
    }),
  ],
})
